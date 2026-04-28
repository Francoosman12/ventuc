const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const { protect, authorize } = require('../middlewares/authMiddlewares');

// Bloqueamos TODO el router para que solo entre el SUPER_ADMIN.
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// === MÉTRICAS GLOBALES ===
router.get('/stats', masterController.getPlatformOverview);

// === LISTADO DE TENANTS ===
router.get('/tenants', masterController.listTenants);

// === DETALLE DE UN TENANT ===
router.get('/tenants/:id', masterController.getTenantDetails);

// === ACCIONES SOBRE UN TENANT ===
router.put('/tenants/:id', masterController.updateTenantMaster);
router.patch('/tenants/:id/plan', masterController.changePlan);
router.patch('/tenants/:id/features', masterController.updateFeatures);
router.post('/tenants/:id/extend-trial', masterController.extendTrial);
router.patch('/tenants/:id/suspend', masterController.suspend);
router.patch('/tenants/:id/reactivate', masterController.reactivate);
router.patch('/tenants/:id/mercadopago', masterController.toggleMercadoPago);

// === LEGADO ===
router.patch('/tenant-toggle/:id', masterController.toggleBusiness);

module.exports = router;