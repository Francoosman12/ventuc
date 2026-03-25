const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// 1. Ruta base
router.get('/', categoryController.getCategories);

// 2. Rutas Estáticas (Importante que vayan antes de :id)
router.get('/tree', categoryController.getCategoryTree);
router.get('/sync', categoryController.syncCategoriesFromProducts); // <--- ESTA LÍNEA

// 3. Rutas Dinámicas (Llevan parámetros)
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);
router.post('/bulk-delete', categoryController.bulkDeleteCategories);
router.post('/bulk-update-parent', categoryController.bulkUpdateParent);

module.exports = router;