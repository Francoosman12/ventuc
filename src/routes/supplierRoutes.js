const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authorize } = require('../middlewares/authMiddlewares');

router.post('/', authorize('ADMIN'), supplierController.createSupplier);
router.get('/', supplierController.getAllSuppliers);
router.put('/:id', authorize('ADMIN'), supplierController.updateSupplier);

module.exports = router;