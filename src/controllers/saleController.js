const mongoose = require('mongoose'); // FIX #1: faltaba el import
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const CashSession = require('../models/CashSession');
const { logAction } = require('../utils/logger');

// 1. CREAR VENTA
// FIX #6: ahora todo se ejecuta dentro de una transacción.
// FIX #7: validamos stock disponible antes de descontar.
// FIX #8: recalculamos precios y total en el servidor (NUNCA confiar en el cliente).
exports.createSale = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { items, paymentMethod } = req.body;

        // Validación básica de input
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "La venta debe tener al menos un producto" });
        }
        if (!paymentMethod) {
            return res.status(400).json({ message: "El método de pago es obligatorio" });
        }

        // Verificamos que haya caja abierta antes de iniciar la transacción
        const activeSession = await CashSession.findOne({
            tenantId: req.user.tenantId,
            status: 'OPEN'
        });
        if (!activeSession) {
            return res.status(400).json({ message: "Debe abrir caja antes de vender" });
        }

        // Iniciamos la transacción
        session.startTransaction();

        // FIX #8: Buscamos los productos en la DB y recalculamos precios desde ahí.
        // No confiamos en priceAtSale, totalItem ni totalAmount que mande el cliente.
        const productIds = items.map(i => i.productId);
        const dbProducts = await Product.find({
            _id: { $in: productIds },
            tenantId: req.user.tenantId,
            isActive: true
        }).session(session);

        // Map para acceso rápido por ID
        const productMap = new Map(dbProducts.map(p => [p._id.toString(), p]));

        // Validamos que todos los productos existan y haya stock suficiente
        const validatedItems = [];
        let calculatedTotal = 0;

        for (const item of items) {
            const product = productMap.get(item.productId?.toString());

            if (!product) {
                await session.abortTransaction();
                return res.status(404).json({
                    message: `Producto no encontrado o inactivo: ${item.productId}`
                });
            }

            const quantity = Number(item.quantity);
            if (!Number.isInteger(quantity) || quantity <= 0) {
                await session.abortTransaction();
                return res.status(400).json({
                    message: `Cantidad inválida para "${product.name}"`
                });
            }

            // FIX #7: validar stock antes de vender
            if (product.stock < quantity) {
                await session.abortTransaction();
                return res.status(400).json({
                    message: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, solicitado: ${quantity}`
                });
            }

            // FIX #8: usamos el precio que está en la DB, no el que mandó el cliente
            const priceAtSale = product.salePrice;
            const totalItem = priceAtSale * quantity;
            calculatedTotal += totalItem;

            validatedItems.push({
                productId: product._id,
                name: product.name,
                quantity,
                priceAtSale,
                totalItem
            });
        }

        // Descontar stock con $inc condicional (extra-segura ante race conditions)
        for (const item of validatedItems) {
            const updateResult = await Product.updateOne(
                {
                    _id: item.productId,
                    tenantId: req.user.tenantId,
                    stock: { $gte: item.quantity } // doble check de stock
                },
                { $inc: { stock: -item.quantity } },
                { session }
            );

            if (updateResult.matchedCount === 0) {
                await session.abortTransaction();
                return res.status(409).json({
                    message: `No se pudo descontar stock de un producto (posible race condition). Reintentá la venta.`
                });
            }
        }

        // Crear la venta dentro de la transacción
        const newSaleArr = await Sale.create([{
            tenantId: req.user.tenantId,
            userId: req.user.id,
            cashSessionId: activeSession._id,
            items: validatedItems,
            totalAmount: calculatedTotal, // FIX #8: total calculado en servidor
            paymentMethod: paymentMethod.toUpperCase()
        }], { session });

        const newSale = newSaleArr[0];

        // Commit
        await session.commitTransaction();

        // Audit log fuera de la transacción (no es crítico si falla)
        await logAction(req, 'SALE_CREATE', { saleId: newSale._id, total: calculatedTotal });

        res.status(201).json(newSale);
    } catch (error) {
        // Solo abortamos si la transacción está activa
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error('Error en createSale:', error);
        res.status(500).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

// 2. Listar ventas (con paginación básica - FIX #21 parcial)
exports.getSales = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
        const skip = (page - 1) * limit;

        const [sales, total] = await Promise.all([
            Sale.find(req.tenantFilter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Sale.countDocuments(req.tenantFilter)
        ]);

        res.json({
            data: sales,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Obtener venta por ID
exports.getSaleById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "ID de venta inválido" });
        }

        const sale = await Sale.findOne({ _id: req.params.id, ...req.tenantFilter });
        if (!sale) return res.status(404).json({ message: "No encontrada" });
        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Estadísticas por vendedor
exports.getSalesBySeller = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // FIX #1: ahora mongoose está importado y funciona
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
                    _id: "$userId",
                    totalRevenue: { $sum: "$totalAmount" },
                    salesCount: { $sum: 1 },
                    averageTicket: { $avg: "$totalAmount" }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    name: '$userInfo.name',
                    email: '$userInfo.email',
                    role: '$userInfo.role',
                    totalRevenue: 1,
                    salesCount: 1,
                    averageTicket: { $round: ['$averageTicket', 2] }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};