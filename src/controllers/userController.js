const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/logger');

// 1. CREAR USUARIO
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body; // ya validado por Joi

        // FIX #24: chequeo de email DENTRO del mismo tenant
        const userExists = await User.findOne({ email, tenantId: req.user.tenantId });
        if (userExists) {
            return res.status(400).json({ message: 'Ya existe un usuario con ese email en tu comercio' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            tenantId: req.user.tenantId
        });

        await logAction(req, 'USER_CREATE', { targetUser: newUser.email, role: newUser.role });

        res.status(201).json({
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Ya existe un usuario con ese email en tu comercio' });
        }
        res.status(500).json({ error: error.message });
    }
};

// 2. LISTAR USUARIOS DEL COMERCIO
exports.getUsersByTenant = async (req, res) => {
    try {
        const users = await User.find(req.tenantFilter).select('-password').sort({ role: 1, name: 1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. ACTUALIZAR USUARIO
exports.updateUser = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID de usuario inválido' });
        }

        const { name, email, role, password } = req.body;
        const user = await User.findOne({ _id: req.params.id, ...req.tenantFilter });

        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        // FIX #23: si vamos a cambiar el rol de ADMIN a otra cosa, validar que no sea el último admin
        if (role && role !== 'ADMIN' && user.role === 'ADMIN') {
            const adminCount = await User.countDocuments({
                tenantId: req.user.tenantId,
                role: 'ADMIN'
            });
            if (adminCount <= 1) {
                return res.status(400).json({
                    message: 'No se puede degradar al último ADMIN del comercio'
                });
            }
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (role) user.role = role;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();
        await logAction(req, 'USER_UPDATE', { targetUser: user.email });

        res.json({ message: 'Usuario actualizado', user: { name: user.name, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. ELIMINAR USUARIO
// FIX #23: no se puede borrar al último ADMIN del tenant
exports.deleteUser = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID de usuario inválido' });
        }

        // No borrarse a sí mismo
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
        }

        // Buscamos el usuario primero para chequear el rol
        const userToDelete = await User.findOne({ _id: req.params.id, ...req.tenantFilter });
        if (!userToDelete) return res.status(404).json({ message: 'Usuario no encontrado' });

        // FIX #23: si es ADMIN, validar que no sea el último
        if (userToDelete.role === 'ADMIN') {
            const adminCount = await User.countDocuments({
                tenantId: req.user.tenantId,
                role: 'ADMIN'
            });
            if (adminCount <= 1) {
                return res.status(400).json({
                    message: 'No se puede eliminar al último ADMIN del comercio. Asigná otro admin primero.'
                });
            }
        }

        await User.findOneAndDelete({ _id: req.params.id, ...req.tenantFilter });
        await logAction(req, 'USER_DELETE', { targetUser: userToDelete.email });
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};