const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authorize } = require('../middlewares/authMiddlewares');
const { validate } = require('../middlewares/validate');
const { createUserSchema, updateUserSchema } = require('../validators/userValidators');

// Todas estas rutas requieren ser ADMIN del comercio
router.get('/', authorize('ADMIN'), userController.getUsersByTenant);
router.post('/', authorize('ADMIN'), validate(createUserSchema), userController.createUser);
router.put('/:id', authorize('ADMIN'), validate(updateUserSchema), userController.updateUser);
router.delete('/:id', authorize('ADMIN'), userController.deleteUser);

module.exports = router;