const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

const processPurchase = async (tenantId, purchaseData) => {
    const { supplierId, items, paymentStatus, totalAmount } = purchaseData;

    // 1. Crear la orden de compra
    const purchase = await Purchase.create({
        tenantId,
        ...purchaseData,
        status: 'RECEIVED'
    });

    // 2. Actualizar cada producto (Stock y Precio de Costo)
    for (const item of items) {
        await Product.findOneAndUpdate(
            { _id: item.productId, tenantId },
            { 
                $inc: { stock: item.quantity },
                $set: { costPrice: item.costPrice } // Actualizamos el costo al último valor
            }
        );
    }

    // 3. Si es deuda, actualizar el saldo del proveedor
    if (paymentStatus === 'DEBT') {
        await Supplier.findOneAndUpdate(
            { _id: supplierId, tenantId },
            { $inc: { currentBalance: totalAmount } }
        );
    }

    return purchase;
};

module.exports = { processPurchase };