const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: String, // ej: "CREATE_PRODUCT", "DELETE_SALE"
    details: Object,
    ip: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);