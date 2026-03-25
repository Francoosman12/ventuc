const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, required: true },
        costPrice: { type: Number, required: true } // El precio al que compramos hoy
    }],
    totalAmount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['PENDING', 'RECEIVED', 'CANCELLED'], 
        default: 'PENDING' 
    },
    paymentStatus: { 
        type: String, 
        enum: ['PAID', 'DEBT'], 
        default: 'PAID' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);