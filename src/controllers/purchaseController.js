const Purchase = require('../models/Purchase');
const Product = require('../models/Product');

exports.createPurchase = async (req, res) => {
    try {
        const { supplierId, items, totalAmount } = req.body;
        const purchase = await Purchase.create({
            tenantId: req.user.tenantId,
            supplierId,
            items,
            totalAmount
        });

        // Actualizar stock de cada producto
        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
        }

        res.status(201).json(purchase);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getAllPurchases = async (req, res) => {
    try {
        const purchases = await Purchase.find(req.tenantFilter).populate('supplierId', 'name');
        res.json(purchases);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};