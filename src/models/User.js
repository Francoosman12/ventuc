const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['ADMIN', 'SELLER', 'SUPER_ADMIN'], 
        default: 'SELLER' 
    },
    lastLogin: Date
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);