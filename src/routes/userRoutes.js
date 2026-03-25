const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authorize } = require('../middlewares/authMiddlewares');

// Todas estas rutas requieren ser ADMIN del comercio
router.get('/', authorize('ADMIN'), userController.getUsersByTenant);
router.post('/', authorize('ADMIN'), userController.createUser);
router.put('/:id', authorize('ADMIN'), userController.updateUser);
router.delete('/:id', authorize('ADMIN'), userController.deleteUser);

module.exports = router;