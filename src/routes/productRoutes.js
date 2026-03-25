const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect } = require('../middlewares/authMiddlewares'); 

// Todas estas rutas ya vienen protegidas desde app.js
router.get('/', productController.getAllProducts);
router.post('/bulk', protect, productController.bulkImport);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);


module.exports = router;