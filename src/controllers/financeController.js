const mongoose = require('mongoose');
const CashSession = require('../models/CashSession');
const Sale = require('../models/Sale');

// Abrir caja
exports.openBox = async (req, res) => {
    try {
        const { openingBalance, notes } = req.body;

        if (typeof openingBalance !== 'number' || openingBalance < 0) {
            return res.status(400).json({ message: 'openingBalance debe ser un número >= 0' });
        }

        const activeSession = await CashSession.findOne({
            tenantId: req.user.tenantId,
            status: 'OPEN'
        });

        if (activeSession) {
            return res.status(400).json({ message: 'Ya existe una caja abierta.' });
        }

        const session = await CashSession.create({
            tenantId: req.user.tenantId,
            openedBy: req.user.id,
            openingBalance,
            notes
        });
        res.status(201).json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Cerrar caja
exports.closeBox = async (req, res) => {
    try {
        const { closingBalance } = req.body;

        if (typeof closingBalance !== 'number' || closingBalance < 0) {
            return res.status(400).json({ message: 'closingBalance debe ser un número >= 0' });
        }

        const tenantId = req.user.tenantId;

        const session = await CashSession.findOne({ tenantId, status: 'OPEN' });
        if (!session) return res.status(404).json({ message: 'No hay caja abierta' });

        // Solo sumamos ventas en EFECTIVO (las demás no afectan el cajón físico)
        const sales = await Sale.find({ cashSessionId: session._id, paymentMethod: 'EFECTIVO' });
        const totalCashSales = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);

        const expectedBalance = session.openingBalance + totalCashSales;

        session.expectedBalance = expectedBalance;
        session.closingBalance = Number(closingBalance);
        session.status = 'CLOSED';
        session.closedAt = Date.now();
        session.closedBy = req.user.id;

        await session.save();

        res.json({
            message: 'Caja cerrada con éxito',
            expected: expectedBalance,
            difference: closingBalance - expectedBalance
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// FIX #19: getSessionSummary ahora calcula realmente el resumen de la sesión
exports.getSessionSummary = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ message: 'ID de sesión inválido' });
        }

        const session = await CashSession.findOne({
            _id: sessionId,
            tenantId: req.user.tenantId
        }).populate('openedBy', 'name').populate('closedBy', 'name');

        if (!session) return res.status(404).json({ message: 'Sesión no encontrada' });

        // Resumen de ventas agrupado por método de pago
        const breakdown = await Sale.aggregate([
            { $match: { cashSessionId: new mongoose.Types.ObjectId(sessionId) } },
            {
                $group: {
                    _id: '$paymentMethod',
                    total: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalSales = breakdown.reduce((acc, b) => acc + b.total, 0);
        const totalTickets = breakdown.reduce((acc, b) => acc + b.count, 0);
        const cashTotal = breakdown.find(b => b._id === 'EFECTIVO')?.total || 0;

        res.json({
            session,
            breakdown,
            summary: {
                totalSales,
                totalTickets,
                cashTotal,
                expectedInCashDrawer: session.openingBalance + cashTotal,
                actualInCashDrawer: session.closingBalance,
                difference: session.status === 'CLOSED'
                    ? session.closingBalance - session.expectedBalance
                    : null
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Estado de la caja actual
exports.getSessionStatus = async (req, res) => {
    try {
        const activeSession = await CashSession.findOne({
            tenantId: req.user.tenantId,
            status: 'OPEN'
        }).populate('openedBy', 'name');

        if (!activeSession) return res.status(404).json(null);
        res.json(activeSession);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Histórico de cajas cerradas - FIX #21: con paginación
exports.getClosedSessions = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
        const skip = (page - 1) * limit;

        const filter = { tenantId: req.user.tenantId, status: 'CLOSED' };

        const [history, total] = await Promise.all([
            CashSession.find(filter)
                .populate('openedBy', 'name')
                .populate('closedBy', 'name')
                .sort({ closedAt: -1 })
                .skip(skip)
                .limit(limit),
            CashSession.countDocuments(filter)
        ]);

        res.json({
            data: history,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Estadísticas financieras
exports.getFinanceStats = async (req, res) => {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Ingresos del mes
        const sales = await Sale.find({
            tenantId: req.user.tenantId,
            createdAt: { $gte: startOfMonth }
        });

        const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);

        // Diferencia acumulada
        const closedSessions = await CashSession.find({
            tenantId: req.user.tenantId,
            status: 'CLOSED'
        });

        const totalDifference = closedSessions.reduce((acc, s) => {
            return acc + ((s.closingBalance || 0) - (s.expectedBalance || 0));
        }, 0);

        // Margen real calculado a partir de costPrice vs salePrice
        // (en lugar del 35% hardcodeado)
        const salesWithItems = await Sale.find({
            tenantId: req.user.tenantId,
            createdAt: { $gte: startOfMonth }
        }).populate('items.productId', 'costPrice');

        let totalCost = 0;
        let totalRevenueForMargin = 0;
        for (const sale of salesWithItems) {
            for (const item of sale.items) {
                const cost = item.productId?.costPrice || 0;
                totalCost += cost * item.quantity;
                totalRevenueForMargin += item.priceAtSale * item.quantity;
            }
        }
        const margin = totalRevenueForMargin > 0
            ? Number((((totalRevenueForMargin - totalCost) / totalRevenueForMargin) * 100).toFixed(2))
            : 0;

        res.json({
            totalRevenue,
            totalSales: sales.length,
            totalDifference,
            margin // ahora es un cálculo real - FIX #20 parcial
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};