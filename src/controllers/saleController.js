const Sale = require('../models/Sale');
const Product = require('../models/Product');
const CashSession = require('../models/CashSession');
const { logAction } = require('../utils/logger');

// 1. Crear Venta
exports.createSale = async (req, res) => {
    try {
        const { items, paymentMethod, totalAmount } = req.body;
        
        const activeSession = await CashSession.findOne({ 
            tenantId: req.user.tenantId, 
            status: 'OPEN' 
        });

        if (!activeSession) {
            return res.status(400).json({ message: "Debe abrir caja antes de vender" });
        }

        // Descontar stock
        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
        }

        const newSale = await Sale.create({
            tenantId: req.user.tenantId,
            userId: req.user.id,
            cashSessionId: activeSession._id,
            items,
            totalAmount,
            paymentMethod: paymentMethod.toUpperCase()
        });

        await logAction(req, 'SALE_CREATE', { saleId: newSale._id });
        res.status(201).json(newSale);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Obtener todas las ventas (Esta es la que pedía la línea 7)
exports.getSales = async (req, res) => {
    try {
        const sales = await Sale.find(req.tenantFilter).sort({ createdAt: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Obtener venta por ID
exports.getSaleById = async (req, res) => {
    try {
        const sale = await Sale.findOne({ _id: req.params.id, ...req.tenantFilter });
        if (!sale) return res.status(404).json({ message: "No encontrada" });
        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.getSalesBySeller = async (req, res) => {
    try {
        const { startDate, endDate } = req.query; // Filtro de fechas opcional

        // Definimos el filtro de tiempo
        let dateFilter = { tenantId: new mongoose.Types.ObjectId(req.user.tenantId) };
        if (startDate && endDate) {
            dateFilter.createdAt = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate) 
            };
        }

        const stats = await Sale.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$userId", // Agrupamos por ID de usuario
                    totalRevenue: { $sum: "$totalAmount" }, // Suma de montos
                    salesCount: { $sum: 1 }, // Cantidad de tickets
                    averageTicket: { $avg: "$totalAmount" } // Ticket promedio
                }
            },
            {
                // Unimos con la colección de usuarios para traer el Nombre
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $project: {
                    name: "$userInfo.name",
                    email: "$userInfo.email",
                    role: "$userInfo.role",
                    totalRevenue: 1,
                    salesCount: 1,
                    averageTicket: { $round: ["$averageTicket", 2] }
                }
            },
            { $sort: { totalRevenue: -1 } } // Los mejores vendedores arriba
        ]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};