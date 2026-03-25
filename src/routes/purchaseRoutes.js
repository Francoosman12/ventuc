const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController'); // Asegúrate de crear este controller
const { authorize } = require('../middlewares/authMiddlewares');

router.post('/', authorize('ADMIN'), purchaseController.createPurchase);
router.get('/', purchaseController.getAllPurchases);

module.exports = router;