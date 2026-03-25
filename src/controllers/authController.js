const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Category = require('../models/Category'); // Necesario para crear las categorías
const businessTemplates = require('../config/businessTemplates'); // Traemos las plantillas
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// REGISTRO DE NUEVOS COMERCIOS (SAAS ONBOARDING)
exports.registerTenant = async (req, res) => {
    try {
        const { companyName, adminName, email, password, businessType } = req.body;

        // 1. Crear el comercio (Tenant) guardando su tipo
        const newTenant = await Tenant.create({ 
            name: companyName,
            businessType: businessType || 'RETAIL_GENERICO' 
        });
        
        // 2. Cifrar contraseña y crear usuario Admin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name: adminName,
            email,
            password: hashedPassword,
            role: 'ADMIN',
            tenantId: newTenant._id
        });

        // 3. SEEDING: Crear estructura inicial de categorías según el Rubro
        const template = businessTemplates[businessType];

        if (template) {
            for (const item of template) {
                // Crear Categoría Raíz
                const parentCat = await Category.create({
                    name: item.name,
                    tenantId: newTenant._id,
                    description: `Categoría predefinida para ${businessType}`
                });

                // Si tiene subcategorías, las creamos vinculadas al padre
                if (item.sub && item.sub.length > 0) {
                    const subCategoryData = item.sub.map(subName => ({
                        name: subName,
                        tenantId: newTenant._id,
                        parent: parentCat._id
                    }));
                    await Category.insertMany(subCategoryData);
                }
            }
        }

        // 4. Generar Token para inicio automático
        const token = jwt.sign(
            { id: newUser._id, tenantId: newTenant._id, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(201).json({ 
            success: true,
            message: "Registro exitoso y catálogo inicial configurado", 
            token,
            user: { name: newUser.name, role: newUser.role }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "El correo electrónico ya está registrado." });
        }
        res.status(400).json({ error: error.message });
    }
};

// LOGIN UNIFICADO
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(404).json({ message: "Credenciales inválidas" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Credenciales inválidas" });

        const token = jwt.sign(
            { id: user._id, tenantId: user.tenantId, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ 
            token, 
            user: { 
                id: user._id,
                name: user.name, 
                role: user.role,
                tenantId: user.tenantId 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};