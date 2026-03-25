const mongoose = require('mongoose'); // <--- INDISPENSABLE para que mongoose.model funcione
const Product = require('../models/Product');
const { logAction } = require('../utils/logger');

// 1. CREAR PRODUCTO
exports.createProduct = async (req, res) => {
    try {
        const product = new Product({
            ...req.body,
            tenantId: req.user.tenantId
        });
        await product.save();

        await logAction(req, 'PRODUCT_CREATE', { sku: product.barcode, name: product.name });
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 2. OBTENER TODOS LOS PRODUCTOS
exports.getAllProducts = async (req, res) => {
    try {
        // Pedimos el modelo directamente a mongoose para evitar errores de carga
        const ProductModel = mongoose.model('Product'); 

        const products = await ProductModel.find(req.tenantFilter)
            .populate({
                path: 'category',
                select: 'name',
                strictPopulate: false // Evita que falle si hay strings viejos en lugar de IDs
            })
            .populate('subCategory', 'name')
            .lean() // Hace la consulta mucho más rápida para los 5500 productos
            .sort({ createdAt: -1 });

        res.json(products);
    } catch (error) {
        console.error("❌ ERROR AL CARGAR INVENTARIO:", error.message);
        res.status(500).json({ error: error.message });
    }
};

// 3. OBTENER UN PRODUCTO POR ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, ...req.tenantFilter })
            .populate('category', 'name')
            .populate('subCategory', 'name');
            
        if (!product) return res.status(404).json({ message: "Producto no encontrado" });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. ACTUALIZAR PRODUCTO
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, ...req.tenantFilter },
            req.body,
            { new: true, runValidators: true }
        );
        if (!product) return res.status(404).json({ message: "Producto no encontrado" });
        
        await logAction(req, 'PRODUCT_UPDATE', { id: product._id, updates: req.body });
        res.json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 5. ELIMINAR PRODUCTO
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({ _id: req.params.id, ...req.tenantFilter });
        if (!product) return res.status(404).json({ message: "Producto no encontrado" });

        await logAction(req, 'PRODUCT_DELETE', { name: product.name, barcode: product.barcode });
        res.json({ message: "Producto eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. IMPORTACIÓN MASIVA
exports.bulkImport = async (req, res) => {
    try {
        const productsArray = req.body;
        const tenantId = req.user.tenantId;

        if (!Array.isArray(productsArray)) {
            return res.status(400).json({ message: "Formato inválido. Se espera una lista []" });
        }

        const finalProducts = productsArray.map(p => ({
            ...p,
            tenantId,
            stock: p.stock || 0,
            salePrice: p.salePrice || 0
        }));

        // ordered: false permite ignorar duplicados y seguir con los demás
        const result = await Product.insertMany(finalProducts, { ordered: false });

        res.status(201).json({
            success: true,
            message: `Se cargaron ${result.length} productos correctamente.`
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(201).json({
                message: "Importación finalizada (se omitieron duplicados).",
                count: error.insertedDocs?.length || 0
            });
        }
        res.status(500).json({ message: "Error crítico", error: error.message });
    }
};