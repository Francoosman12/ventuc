const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { validate } = require('../middlewares/validate');
const { createSaleSchema } = require('../validators/saleValidators');

// IMPORTANTE: Las rutas estáticas SIEMPRE antes que las dinámicas (/:id) - FIX #2
router.get('/by-seller', saleController.getSalesBySeller);

router.post('/', validate(createSaleSchema), saleController.createSale);
router.get('/', saleController.getSales);
router.get('/:id', saleController.getSaleById);

module.exports = router;