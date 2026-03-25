const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    taxId: { type: String }, // CUIT, RUT, NIT dependiendo del país
    contactName: String,
    phone: String,
    email: String,
    address: String,
    
    // Cuenta Corriente: Saldo que el comercio le debe al proveedor
    currentBalance: { type: Number, default: 0 }, 
    
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);