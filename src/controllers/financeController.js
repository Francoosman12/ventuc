const CashSession = require('../models/CashSession');
const Sale = require('../models/Sale'); 

exports.openBox = async (req, res) => {
    try {
        const { openingBalance, notes } = req.body;
        const activeSession = await CashSession.findOne({ 
            tenantId: req.user.tenantId, 
            status: 'OPEN' 
        });

        if (activeSession) {
            return res.status(400).json({ message: "Ya existe una caja abierta." });
        }

        const session = await CashSession.create({
            tenantId: req.user.tenantId,
            openedBy: req.user.id,
            openingBalance,
            notes
        });
        res.status(201).json(session);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.closeBox = async (req, res) => {
    try {
        const { closingBalance } = req.body;
        const tenantId = req.user.tenantId;

        // 1. Buscamos la sesión que está abierta
        const session = await CashSession.findOne({ tenantId, status: 'OPEN' });
        if (!session) return res.status(404).json({ message: "No hay caja abierta" });

        // 2. LA CLAVE: Buscar todas las ventas realizadas SOLAMENTE en esta sesión
      const sales = await Sale.find({ cashSessionId: session._id });

        // 3. Sumamos el total de esas ventas
        const totalCashSales = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);

        // 4. Calculamos lo que DEBERÍA HABER (Lógica Contable)
        const expectedBalance = session.openingBalance + totalCashSales;

        // 5. Guardamos todo en la sesión
        session.expectedBalance = expectedBalance; // Aquí se guarda la sumatoria real
        session.closingBalance = Number(closingBalance);
        session.status = 'CLOSED';
        session.closedAt = Date.now();
        session.closedBy = req.user.id;

        await session.save();

        res.json({ message: "Caja cerrada con éxito", expected: expectedBalance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSessionSummary = async (req, res) => {
    try {
        // Por ahora devolvemos un mensaje, luego haremos el cálculo real de ventas
        res.json({ message: "Resumen generado exitosamente" });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getSessionStatus = async (req, res) => {
    try {
        const activeSession = await CashSession.findOne({ 
            tenantId: req.user.tenantId, 
            status: 'OPEN' 
        }).populate('openedBy', 'name');
        
        if (!activeSession) return res.status(404).json(null);
        res.json(activeSession);
    } catch (error) {
        res.status(500).json(error);
    }
};

// Obtener Histórico de Cajas Cerradas
exports.getClosedSessions = async (req, res) => {
    try {
        const history = await CashSession.find({ 
            tenantId: req.user.tenantId, 
            status: 'CLOSED' 
        })
        .populate('openedBy', 'name')
        .sort({ closedAt: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener Estadísticas (Ingresos, Diferencia, Margen)
exports.getFinanceStats = async (req, res) => {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

        // A. Calcular Ingresos del Mes (Sumatoria de ventas totales)
        const sales = await Sale.find({
            tenantId: req.user.tenantId,
            createdAt: { $gte: startOfMonth }
        });

        const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);

        // B. Calcular Diferencia acumulada (AUDITORÍA REAL)
        const closedSessions = await CashSession.find({ 
            tenantId: req.user.tenantId, 
            status: 'CLOSED' 
        });

        // CORRECCIÓN AQUÍ: 
        // La diferencia debe ser: Lo que el cajero puso (closing) MENOS lo que el sistema esperaba (expected)
        const totalDifference = closedSessions.reduce((acc, s) => {
            return acc + ((s.closingBalance || 0) - (s.expectedBalance || 0)); 
        }, 0);

        res.json({
            totalRevenue,
            totalSales: sales.length,
            totalDifference, // Ahora marcará 0 si todo coincide
            margin: 35.0 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};