const mongoose = require('mongoose');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Category = require('../models/Category');
const businessTemplates = require('../config/businessTemplates');
const { PLANS, PLAN_FEATURES, TRIAL_DURATION_DAYS, GRACE_PERIOD_DAYS } = require('../config/plans');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { registerSchema, loginSchema } = require('../validators/authValidators');

// REGISTRO DE NUEVOS COMERCIOS
exports.registerTenant = async (req, res) => {
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({
            message: 'Datos inválidos',
            details: error.details.map(d => d.message)
        });
    }

    const { companyName, adminName, email, password, businessType } = value;

    const exists = await User.findOne({ email });
    if (exists) {
        return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Calculamos fechas del trial
        const now = new Date();
        const trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);
        const graceEndsAt = new Date(trialEndsAt);
        graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);

        // 1. Crear el comercio con plan TRIAL
        const newTenantArr = await Tenant.create([{
            name: companyName,
            businessType: businessType || 'RETAIL_GENERICO',
            plan: PLANS.TRIAL,
            subscription: {
                status: 'ACTIVE',
                trialStartedAt: now,
                trialEndsAt,
                graceEndsAt,
                currentPeriodStart: now,
                currentPeriodEnd: trialEndsAt
            },
            features: PLAN_FEATURES.TRIAL,
            settings: {
                taxInfo: { contactEmail: email },
                fiscal: { currency: 'ARS', defaultVAT: 21 },
                sales: {
                    enabledPaymentMethods: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR']
                }
            }
        }], { session });
        const newTenant = newTenantArr[0];

        // 2. Crear usuario Admin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUserArr = await User.create([{
            name: adminName,
            email,
            password: hashedPassword,
            role: 'ADMIN',
            tenantId: newTenant._id
        }], { session });
        const newUser = newUserArr[0];

        // 3. Seeding de categorías según el rubro
        const template = businessTemplates[businessType];
        if (template) {
            for (const item of template) {
                const parentCatArr = await Category.create([{
                    name: item.name,
                    tenantId: newTenant._id,
                    description: `Categoría predefinida para ${businessType}`
                }], { session });
                const parentCat = parentCatArr[0];

                if (item.sub && item.sub.length > 0) {
                    const subCategoryData = item.sub.map(subName => ({
                        name: subName,
                        tenantId: newTenant._id,
                        parent: parentCat._id
                    }));
                    await Category.insertMany(subCategoryData, { session });
                }
            }
        }

        await session.commitTransaction();

        const token = jwt.sign(
            { id: newUser._id, tenantId: newTenant._id, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(201).json({
            success: true,
            message: 'Registro exitoso. Tenés 30 días de prueba gratis.',
            token,
            user: { name: newUser.name, role: newUser.role },
            trial: {
                endsAt: trialEndsAt,
                daysLeft: TRIAL_DURATION_DAYS
            }
        });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error('Error en registerTenant:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
        }
        res.status(500).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

// LOGIN
exports.login = async (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            message: 'Datos inválidos',
            details: error.details.map(d => d.message)
        });
    }

    try {
        const { email, password } = value;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: user._id, tenantId: user.tenantId, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Devolvemos info de la suscripción para que el frontend pueda mostrar avisos
        let subscriptionInfo = null;
        if (user.tenantId) {
            const tenant = await Tenant.findById(user.tenantId).select('plan subscription').lean();
            if (tenant) {
                subscriptionInfo = {
                    plan: tenant.plan,
                    status: tenant.subscription?.status,
                    trialEndsAt: tenant.subscription?.trialEndsAt,
                    graceEndsAt: tenant.subscription?.graceEndsAt
                };
            }
        }

        User.updateOne({ _id: user._id }, { lastLogin: new Date() }).catch(() => {});

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId
            },
            subscription: subscriptionInfo
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: error.message });
    }
};