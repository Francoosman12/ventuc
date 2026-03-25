const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/logger');

// 1. CREAR UN NUEVO USUARIO (Ej: Admin crea un Vendedor)
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Verificar si el email ya existe globalmente
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
        }

        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear el usuario vinculado al tenant del administrador actual
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role, // ADMIN o SELLER
            tenantId: req.user.tenantId // Inyectado por el middleware
        });

        await logAction(req, 'USER_CREATE', { targetUser: newUser.email, role: newUser.role });

        res.status(201).json({
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. OBTENER TODOS LOS USUARIOS DEL COMERCIO
exports.getUsersByTenant = async (req, res) => {
    try {
        // req.tenantFilter asegura que solo vea empleados de su propia empresa
        const users = await User.find(req.tenantFilter).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. ACTUALIZAR USUARIO (Perfil o Rol)
exports.updateUser = async (req, res) => {
    try {
        const { name, email, role, password } = req.body;
        const user = await User.findOne({ _id: req.params.id, ...req.tenantFilter });

        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        if (name) user.name = name;
        if (email) user.email = email;
        if (role) user.role = role;
        
        // Si se envía un nuevo password, se encripta
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();
        await logAction(req, 'USER_UPDATE', { targetUser: user.email });

        res.json({ message: "Usuario actualizado", user: { name: user.name, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. ELIMINAR/DESACTIVAR USUARIO
exports.deleteUser = async (req, res) => {
    try {
        // Evitar que un admin se borre a sí mismo
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: "No puedes eliminar tu propia cuenta de administrador" });
        }

        const user = await User.findOneAndDelete({ _id: req.params.id, ...req.tenantFilter });
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        await logAction(req, 'USER_DELETE', { targetUser: user.email });
        res.json({ message: "Usuario eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};