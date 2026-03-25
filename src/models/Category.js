const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    // Si 'parent' es null, es una Categoría Raíz. Si tiene un ID, es una Subcategoría.
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    description: String,
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// El nombre debe ser único por cada comercio
categorySchema.index({ name: 1, tenantId: 1, parent: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);