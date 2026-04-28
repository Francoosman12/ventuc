const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authorize } = require('../middlewares/authMiddlewares');

// GET: cualquier usuario autenticado puede leer (lo necesita el frontend)
router.get('/', settingsController.getSettings);

// PATCH: solo ADMIN puede modificar
router.patch('/business', authorize('ADMIN'), settingsController.updateBusinessInfo);
router.patch('/tax-info', authorize('ADMIN'), settingsController.updateTaxInfo);
router.patch('/fiscal', authorize('ADMIN'), settingsController.updateFiscal);
router.patch('/sales', authorize('ADMIN'), settingsController.updateSales);
router.patch('/inventory', authorize('ADMIN'), settingsController.updateInventory);
router.patch('/receipt', authorize('ADMIN'), settingsController.updateReceipt);

module.exports = router;