const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product'); 
const { logAction } = require('../utils/logger');

// 1. CREAR CATEGORÍA
exports.createCategory = async (req, res) => {
    try {
        const { name, parent, description } = req.body;
        if (parent) {
            const parentExists = await Category.findOne({ _id: parent, tenantId: req.user.tenantId });
            if (!parentExists) return res.status(400).json({ message: "La categoría padre no existe." });
        }
        const category = await Category.create({ name, parent: parent || null, description, tenantId: req.user.tenantId });
        await logAction(req, 'CATEGORY_CREATE', { name: category.name });
        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 2. LISTAR CATEGORÍAS
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find(req.tenantFilter).populate('parent', 'name').sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. ACTUALIZAR
exports.updateCategory = async (req, res) => {
    try {
        const category = await Category.findOneAndUpdate(
            { _id: req.params.id, ...req.tenantFilter },
            req.body,
            { new: true }
        );
        res.json(category);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 4. ELIMINAR
exports.deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const hasProducts = await Product.findOne({ category: categoryId });
        if (hasProducts) return res.status(400).json({ message: "Existen productos usando esta categoría." });

        await Category.findOneAndDelete({ _id: categoryId, ...req.tenantFilter });
        res.json({ message: "Eliminada con éxito" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. OBTENER ÁRBOL
exports.getCategoryTree = async (req, res) => {
    try {
        const allCategories = await Category.find(req.tenantFilter).lean();
        const buildTree = (parentId = null) => {
            return allCategories
                .filter(cat => String(cat.parent) === String(parentId) || (cat.parent === null && parentId === null))
                .map(cat => ({ ...cat, children: buildTree(cat._id) }));
        };
        res.json(buildTree(null));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. SINCRONIZACIÓN MASIVA - CORREGIDA PARA JUMBO
exports.syncCategoriesFromProducts = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        console.log(`🛠️ Iniciando curación para tenant: ${tenantId}`);

        // ACCESO DIRECTO AL DRIVER (Evita el error de Mongoose ObjectId casting)
        const productsCollection = mongoose.connection.db.collection('products');

        // 1. Extraer nombres únicos ignorando los que ya son ObjectId (24 chars hex)
        const uniqueNames = await productsCollection.distinct('category', { 
            tenantId: new mongoose.Types.ObjectId(tenantId) 
        });

        let stats = { creadas: 0, actualizados: 0 };

        for (const rawName of uniqueNames) {
            // Saltamos si no hay nombre o si ya parece un ID de Mongo
            if (!rawName || /^[0-9a-fA-F]{24}$/.test(rawName)) continue;

            // 2. Limpiamos el nombre: "BebidasAguas" -> "Bebidas Aguas"
            const cleanName = rawName.toString().replace(/([A-Z])/g, ' $1').trim();

            // 3. Buscar o crear la categoría real
            let categoryDoc = await Category.findOne({ name: cleanName, tenantId });
            
            if (!categoryDoc) {
                categoryDoc = await Category.create({ 
                    name: cleanName, 
                    tenantId, 
                    description: `Migrada del sistema de importación (${rawName})` 
                });
                stats.creadas++;
            }

            // 4. VINCULACIÓN FÍSICA: Cambiar el texto por el ID
            // Usamos .updateMany sobre el driver nativo para saltar validaciones de esquema
            const result = await productsCollection.updateMany(
                { tenantId: new mongoose.Types.ObjectId(tenantId), category: rawName }, 
                { $set: { category: categoryDoc._id } }
            );

            stats.actualizados += result.modifiedCount;
            console.log(`✅ Procesado: ${rawName} -> ${cleanName} (${result.modifiedCount} productos)`);
        }

        res.json({ 
            success: true, 
            message: "La curación de datos masivos ha finalizado.", 
            details: stats 
        });

    } catch (error) {
        console.error("❌ Fallo en Sincronización:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Borrado masivo (Cuidado: aplica reglas ISO)
exports.bulkDeleteCategories = async (req, res) => {
    try {
        const { ids } = req.body;
        // Validar que no tengan productos vinculados antes de borrar el lote
        const Product = mongoose.model('Product');
        const inUse = await Product.findOne({ category: { $in: ids } });
        
        if (inUse) {
            return res.status(400).json({ message: "Algunas categorías tienen productos. Límpialas primero." });
        }

        await Category.deleteMany({ _id: { $in: ids }, tenantId: req.user.tenantId });
        res.json({ message: "Eliminación masiva completada" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualización de padre masiva (Para organizar Jumbo)
exports.bulkUpdateParent = async (req, res) => {
    try {
        const { ids, newParentId } = req.body;
        await Category.updateMany(
            { _id: { $in: ids }, tenantId: req.user.tenantId },
            { $set: { parent: newParentId || null } }
        );
        res.json({ message: "Jerarquía actualizada correctamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};