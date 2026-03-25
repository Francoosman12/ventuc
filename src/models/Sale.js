const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Quién vendió
    cashSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashSession', required: true }, // A qué caja entró el dinero
    
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        quantity: { type: Number, required: true },
        priceAtSale: { type: Number, required: true }, // Precio en ese momento (por si cambia luego)
        totalItem: { type: Number, required: true }
    }],
    
    totalAmount: { type: Number, required: true },
    paymentMethod: { 
        type: String, 
        enum: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR'], 
        default: 'EFECTIVO' 
    },
    status: { type: String, default: 'COMPLETED' }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);