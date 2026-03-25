const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

router.post('/', saleController.createSale); // Línea 5
router.get('/', saleController.getSales);    // Línea 6 o 7 (PROBABLE ERROR AQUÍ)
router.get('/:id', saleController.getSaleById); // Línea 8
router.get('/by-seller',  saleController.getSalesBySeller);

module.exports = router;