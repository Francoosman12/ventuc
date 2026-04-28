const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

// FIX #6 (consistencia con createSale): transacción en createPurchase
exports.createPurchase = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { supplierId, items, totalAmount, paymentStatus } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'La compra debe tener al menos un producto' });
        }
        if (!mongoose.Types.ObjectId.isValid(supplierId)) {
            return res.status(400).json({ message: 'supplierId inválido' });
        }

        session.startTransaction();

        // Crear la orden
        const purchaseArr = await Purchase.create([{
            tenantId: req.user.tenantId,
            supplierId,
            items,
            totalAmount,
            paymentStatus: paymentStatus || 'PAID',
            status: 'RECEIVED'
        }], { session });
        const purchase = purchaseArr[0];

        // Aumentar stock y actualizar costo de cada producto
        for (const item of items) {
            if (!mongoose.Types.ObjectId.isValid(item.productId)) {
                await session.abortTransaction();
                return res.status(400).json({ message: `productId inválido: ${item.productId}` });
            }
            const result = await Product.updateOne(
                { _id: item.productId, tenantId: req.user.tenantId },
                {
                    $inc: { stock: item.quantity },
                    $set: { costPrice: item.costPrice }
                },
                { session }
            );
            if (result.matchedCount === 0) {
                await session.abortTransaction();
                return res.status(404).json({
                    message: `Producto no encontrado: ${item.productId}`
                });
            }
        }

        // Si es deuda, sumamos al saldo del proveedor
        if (paymentStatus === 'DEBT') {
            await Supplier.updateOne(
                { _id: supplierId, tenantId: req.user.tenantId },
                { $inc: { currentBalance: totalAmount } },
                { session }
            );
        }

        await session.commitTransaction();
        res.status(201).json(purchase);
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error('Error en createPurchase:', error);
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

exports.getAllPurchases = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
        const skip = (page - 1) * limit;

        const [purchases, total] = await Promise.all([
            Purchase.find(req.tenantFilter)
                .populate('supplierId', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Purchase.countDocuments(req.tenantFilter)
        ]);

        res.json({
            data: purchases,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};