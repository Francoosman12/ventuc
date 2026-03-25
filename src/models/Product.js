// src/models/Product.js
const mongoose = require('mongoose'); 

const productSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, index: true },
    barcode: { type: String, index: true },
    
    // RELACIONES:
    category: { type: mongoose.Schema.Types.Mixed, required: true },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    
    costPrice: { type: Number, default: 0 },
    salePrice: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 }, 
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// IMPORTANTE: Unicidad del barcode solo dentro del mismo negocio
productSchema.index({ barcode: 1, tenantId: 1 }, { unique: true });
module.exports = mongoose.model('Product', productSchema);