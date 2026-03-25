const mongoose = require('mongoose');

const cashSessionSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    openingBalance: { type: Number, required: true }, // Con cuánto dinero inicia
    closingBalance: { type: Number, default: 0 },                 // Con cuánto dinero cierra
    expectedBalance: { type: Number, default: 0  },                // Cuánto debería haber según sistema
    
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
    openedAt: { type: Date, default: Date.now },
    closedAt: Date,
    
    notes: String
}, { timestamps: true });

module.exports = mongoose.model('CashSession', cashSessionSchema);