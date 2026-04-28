const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    // FIX #24: email NO es único globalmente. Dos comercios distintos pueden tener
    // un empleado con el mismo email (ej. el mismo dueño de dos negocios).
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['ADMIN', 'SELLER', 'SUPER_ADMIN'],
        default: 'SELLER'
    },
    lastLogin: Date,
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// FIX #24: índice compuesto para unicidad de email por tenant.
// IMPORTANTE: Si tu DB ya tiene un índice unique en email solo, hay que dropearlo manualmente:
//   db.users.dropIndex('email_1')
// Y luego este índice se crea solo al levantar la app.
userSchema.index({ email: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);