const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const { protect, authorize } = require('../middlewares/authMiddlewares');

router.get('/tenants/:id', masterController.getTenantDetails);

// Bloquear todo el router para que solo entre el SUPER_ADMIN
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// CAMBIO AQUÍ: Asegúrate que diga '/stats' y no '/overview'
router.get('/stats', masterController.getPlatformOverview);

// El listado de todos los comercios
router.get('/tenants', async (req, res) => {
    try {
        const Tenant = require('../models/Tenant');
        const tenants = await Tenant.find().sort({ createdAt: -1 });
        res.json(tenants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.put('/tenants/:id', masterController.updateTenantMaster);
// Cambiar el estado (activar/desactivar) de un comercio
router.patch('/tenant-toggle/:id', masterController.toggleBusiness);

module.exports = router;