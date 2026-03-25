// src/utils/logger.js
const AuditLog = require('../models/AuditLog');

exports.logAction = async (req, action, details) => {
    try {
        if (AuditLog && req.user) {
            await AuditLog.create({
                tenantId: req.user.tenantId,
                userId: req.user.id,
                action,
                details,
                ip: req.ip
            });
        }
    } catch (error) {
        console.error("Error Guardando Auditoría:", error.message);
    }
};