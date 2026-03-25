const Supplier = require('../models/Supplier');
const { logAction } = require('../utils/logger');

exports.createSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.create({ ...req.body, tenantId: req.user.tenantId });
        await logAction(req, 'SUPPLIER_CREATE', { name: supplier.name });
        res.status(201).json(supplier);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

exports.getAllSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find(req.tenantFilter);
        res.json(suppliers);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findOneAndUpdate(
            { _id: req.params.id, ...req.tenantFilter }, 
            req.body, 
            { new: true }
        );
        res.json(supplier);
    } catch (error) { res.status(400).json({ error: error.message }); }
};