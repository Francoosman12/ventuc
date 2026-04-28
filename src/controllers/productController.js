const mongoose = require('mongoose');
const Product = require('../models/Product');
const { logAction } = require('../utils/logger');

// 1. CREAR PRODUCTO
exports.createProduct = async (req, res) => {
    try {
        // El body ya viene validado por Joi en el middleware
        const product = new Product({
            ...req.body,
            tenantId: req.user.tenantId // forzamos el tenantId del usuario
        });
        await product.save();
        await logAction(req, 'PRODUCT_CREATE', { sku: product.barcode, name: product.name });
        res.status(201).json(product);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Ya existe un producto con ese código de barras' });
        }
        res.status(400).json({ error: error.message });
    }
};

// 2. LISTAR PRODUCTOS - FIX #21: con paginación y filtros
exports.getAllProducts = async (req, res) => {
    try {
        const ProductModel = mongoose.model('Product');

        // Paginación
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 500);
        const skip = (page - 1) * limit;

        // Filtros opcionales
        const filter = { ...req.tenantFilter };

        // Por default solo activos, salvo que se pida explícitamente includeInactive
        if (req.query.includeInactive !== 'true') {
            filter.isActive = true;
        }

        // Búsqueda por nombre o barcode
        if (req.query.search) {
            const search = req.query.search.trim();
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } }
            ];
        }

        // Filtro por stock crítico
        if (req.query.lowStock === 'true') {
            filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
        }

        const [products, total] = await Promise.all([
            ProductModel.find(filter)
                .populate({ path: 'category', select: 'name', strictPopulate: false })
                .populate('subCategory', 'name')
                .lean()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            ProductModel.countDocuments(filter)
        ]);

        res.json({
            data: products,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('❌ ERROR AL CARGAR INVENTARIO:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// 3. OBTENER UN PRODUCTO POR ID
exports.getProductById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID de producto inválido' });
        }

        const product = await Product.findOne({ _id: req.params.id, ...req.tenantFilter })
            .populate('category', 'name')
            .populate('subCategory', 'name');

        if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. ACTUALIZAR PRODUCTO
exports.updateProduct = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID de producto inválido' });
        }

        // Bloqueamos que el cliente intente cambiar el tenantId
        const { tenantId, ...safeBody } = req.body;

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, ...req.tenantFilter },
            safeBody,
            { new: true, runValidators: true }
        );
        if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

        await logAction(req, 'PRODUCT_UPDATE', { id: product._id, updates: safeBody });
        res.json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 5. ELIMINAR PRODUCTO
// Nota: en una segunda iteración convendría hacer soft-delete (isActive: false)
// para no romper ventas históricas. Por ahora se mantiene el hard-delete.
exports.deleteProduct = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID de producto inválido' });
        }

        const product = await Product.findOneAndDelete({ _id: req.params.id, ...req.tenantFilter });
        if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

        await logAction(req, 'PRODUCT_DELETE', { name: product.name, barcode: product.barcode });
        res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. IMPORTACIÓN MASIVA
// FIX #16: ahora devuelve status correcto con info clara de cuántos se importaron y cuántos fallaron
exports.bulkImport = async (req, res) => {
    try {
        const productsArray = req.body; // ya validado por Joi
        const tenantId = req.user.tenantId;

        const finalProducts = productsArray.map(p => ({
            ...p,
            tenantId,
            stock: p.stock || 0,
            salePrice: p.salePrice || 0
        }));

        try {
            const result = await Product.insertMany(finalProducts, { ordered: false });
            return res.status(201).json({
                success: true,
                message: `Se cargaron ${result.length} productos correctamente.`,
                imported: result.length,
                skipped: 0
            });
        } catch (insertError) {
            // Si hubo errores parciales (ej. duplicados), usamos 207 Multi-Status
            if (insertError.code === 11000 || insertError.writeErrors) {
                const inserted = insertError.insertedDocs?.length || 0;
                const skipped = finalProducts.length - inserted;
                return res.status(207).json({
                    success: inserted > 0,
                    message: 'Importación finalizada con omisiones.',
                    imported: inserted,
                    skipped,
                    note: 'Algunos productos fueron omitidos (probablemente duplicados de barcode).'
                });
            }
            throw insertError;
        }
    } catch (error) {
        res.status(500).json({ message: 'Error crítico', error: error.message });
    }
};