const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { validate } = require('../middlewares/validate');
const {
    createProductSchema,
    updateProductSchema,
    bulkImportSchema
} = require('../validators/productValidators');

// Las rutas ya vienen protegidas desde app.js, no es necesario repetir protect (FIX #17)
router.get('/', productController.getAllProducts);
router.post('/bulk', validate(bulkImportSchema), productController.bulkImport);
router.get('/:id', productController.getProductById);
router.post('/', validate(createProductSchema), productController.createProduct);
router.put('/:id', validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;