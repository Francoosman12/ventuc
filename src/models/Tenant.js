// src/models/Tenant.js
const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    businessType: { 
        type: String, 
        enum: ['SUPERMERCADO', 'FERRETERIA', 'INDUMENTARIA', 'RETAIL_GENERICO'],
        default: 'RETAIL_GENERICO' 
    },
    plan: { type: String, enum: ['basic', 'pro', 'enterprise'], default: 'basic' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Tenant', tenantSchema);