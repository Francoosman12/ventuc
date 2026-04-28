const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { PLANS, PLAN_FEATURES, PLAN_METADATA, GRACE_PERIOD_DAYS } = require('../config/plans');
const { invalidateTenantCache } = require('../middlewares/featureGate');

// ============================================
// 1. ESTADÍSTICAS GLOBALES DEL SAAS
// ============================================
exports.getPlatformOverview = async (req, res) => {
    try {
        const allTenants = await Tenant.find().lean();
        const activeTenants = allTenants.filter(t =>
            t.subscription?.status === 'ACTIVE' || t.subscription?.status === 'GRACE_PERIOD'
        );
        const trialTenants = allTenants.filter(t => t.plan === PLANS.TRIAL);
        const payingTenants = allTenants.filter(t =>
            [PLANS.STARTER, PLANS.PRO, PLANS.ENTERPRISE].includes(t.plan)
        );

        const users = await User.countDocuments();

        // GMV Global (Gross Merchandise Volume)
        const sales = await Sale.find().select('totalAmount');
        const gmv = sales.reduce((acc, s) => acc + s.totalAmount, 0);

        // Calcular MRR (Monthly Recurring Revenue)
        let mrr = 0;
        for (const t of payingTenants) {
            const planMeta = PLAN_METADATA[t.plan];
            if (planMeta?.priceMonthly) {
                mrr += planMeta.priceMonthly;
            }
        }

        // Distribución por plan
        const planDistribution = {
            TRIAL: trialTenants.length,
            STARTER: allTenants.filter(t => t.plan === PLANS.STARTER).length,
            PRO: allTenants.filter(t => t.plan === PLANS.PRO).length,
            ENTERPRISE: allTenants.filter(t => t.plan === PLANS.ENTERPRISE).length,
            SUSPENDED: allTenants.filter(t => t.plan === PLANS.SUSPENDED).length,
        };

        res.json({
            tenantsCount: allTenants.length,
            activeTenants: activeTenants.length,
            trialTenants: trialTenants.length,
            payingTenants: payingTenants.length,
            usersCount: users,
            totalGMV: gmv,
            mrr,
            currency: 'ARS',
            planDistribution,
            latestTenants: await Tenant.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('name plan subscription createdAt')
                .lean()
        });
    } catch (error) {
        console.error('Error en getPlatformOverview:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// 2. LISTADO DE TENANTS (con filtros y búsqueda)
// ============================================
exports.listTenants = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
        const skip = (page - 1) * limit;

        const filter = {};

        // Filtro por plan
        if (req.query.plan && Object.values(PLANS).includes(req.query.plan)) {
            filter.plan = req.query.plan;
        }

        // Filtro por estado
        if (req.query.status) {
            filter['subscription.status'] = req.query.status;
        }

        // Búsqueda por nombre
        if (req.query.search) {
            filter.name = { $regex: req.query.search.trim(), $options: 'i' };
        }

        const [tenants, total] = await Promise.all([
            Tenant.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Tenant.countDocuments(filter)
        ]);

        res.json({
            data: tenants,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// 3. DETALLE DE UN TENANT
// ============================================
exports.getTenantDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID de negocio inválido" });
        }

        const tenant = await Tenant.findById(id).lean();
        if (!tenant) return res.status(404).json({ message: "Negocio no encontrado" });

        // Empleados (sin passwords)
        const staff = await User.find({ tenantId: id })
            .select('-password')
            .sort({ role: 1 })
            .lean();

        // Stats
        const productsCount = await Product.countDocuments({ tenantId: id });
        const salesCount = await Sale.countDocuments({ tenantId: id });

        const totalRevenue = await Sale.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(id) } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        // Ventas por vendedor
        const salesBySeller = await Sale.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(id) } },
            { $group: { _id: '$userId', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            { $project: { name: '$userInfo.name', email: '$userInfo.email', total: 1, count: 1 } },
            { $sort: { total: -1 } }
        ]);

        // Ocultar accessToken de MP por seguridad
        if (tenant.integrations?.mercadopago) {
            delete tenant.integrations.mercadopago.accessToken;
        }

        res.json({
            tenant,
            staff,
            stats: {
                productsCount,
                salesCount,
                totalRevenue: totalRevenue[0]?.total || 0
            },
            salesBySeller
        });
    } catch (error) {
        console.error('Error en getTenantDetails:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// 4. CAMBIAR PLAN DE UN TENANT
// ============================================
exports.changePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { plan, durationDays } = req.body;

        if (!Object.values(PLANS).includes(plan)) {
            return res.status(400).json({ message: 'Plan inválido' });
        }

        const tenant = await Tenant.findById(id);
        if (!tenant) return res.status(404).json({ message: 'Tenant no encontrado' });

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + (durationDays || 30));

        // Actualizar plan
        tenant.plan = plan;

        // Aplicar features default del plan (las que vos ya configures de más se respetarán
        // hasta que las edites desde el panel de features)
        tenant.features = { ...PLAN_FEATURES[plan] };

        // Ajustar suscripción según el plan
        if (plan === PLANS.SUSPENDED) {
            tenant.subscription.status = 'SUSPENDED';
        } else {
            tenant.subscription.status = 'ACTIVE';
            tenant.subscription.currentPeriodStart = now;
            tenant.subscription.currentPeriodEnd = periodEnd;
            tenant.subscription.nextChargeAt = periodEnd;
        }

        tenant.markModified('features');
        tenant.markModified('subscription');
        await tenant.save();

        invalidateTenantCache(tenant._id);

        res.json({
            message: `Plan cambiado a ${plan}`,
            tenant: {
                _id: tenant._id,
                plan: tenant.plan,
                subscription: tenant.subscription,
                features: tenant.features
            }
        });
    } catch (error) {
        console.error('Error en changePlan:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// 5. EDITAR FEATURES INDIVIDUALES
// ============================================
exports.updateFeatures = async (req, res) => {
    try {
        const { id } = req.params;
        const { features } = req.body;

        if (!features || typeof features !== 'object') {
            return res.status(400).json({ message: 'features es requerido' });
        }

        const tenant = await Tenant.findById(id);
        if (!tenant) return res.status(404).json({ message: 'Tenant no encontrado' });

        // Mergeamos las features nuevas con las que ya tiene
        tenant.features = { ...tenant.features?.toObject?.() || tenant.features, ...features };
        tenant.markModified('features');
        await tenant.save();

        invalidateTenantCache(tenant._id);

        res.json({
            message: 'Features actualizadas',
            features: tenant.features
        });
    } catch (error) {
        console.error('Error en updateFeatures:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// 6. EXTENDER TRIAL (regalar más días)
// ============================================
exports.extendTrial = async (req, res) => {
    try {
        const { id } = req.params;
        const { days } = req.body;

        if (!days || days < 1 || days > 365) {
            return res.status(400).json({ message: 'days debe estar entre 1 y 365' });
        }

        const tenant = await Tenant.findById(id);
        if (!tenant) return res.status(404).json({ message: 'Tenant no encontrado' });

        // Extendemos a partir de la fecha actual de fin (o ahora si ya venció)
        const now = new Date();
        const baseDate = tenant.subscription?.trialEndsAt > now
            ? new Date(tenant.subscription.trialEndsAt)
            : now;

        const newTrialEnd = new Date(baseDate);
        newTrialEnd.setDate(newTrialEnd.getDate() + Number(days));

        const newGraceEnd = new Date(newTrialEnd);
        newGraceEnd.setDate(newGraceEnd.getDate() + GRACE_PERIOD_DAYS);

        tenant.subscription.trialEndsAt = newTrialEnd;
        tenant.subscription.graceEndsAt = newGraceEnd;
        tenant.subscription.currentPeriodEnd = newTrialEnd;
        tenant.subscription.status = 'ACTIVE';

        // Si estaba suspendido, lo volvemos a TRIAL
        if (tenant.plan === PLANS.SUSPENDED) {
            tenant.plan = PLANS.TRIAL;
            tenant.features = { ...PLAN_FEATURES.TRIAL };
            tenant.markModified('features');
        }

        tenant.markModified('subscription');
        await tenant.save();

        invalidateTenantCache(tenant._id);

        res.json({
            message: `Trial extendido ${days} días`,
            subscription: tenant.subscription
        });
    } catch (error) {
        console.error('Error en extendTrial:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// 7. SUSPENDER / REACTIVAR
// ============================================
exports.suspend = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const tenant = await Tenant.findById(id);
        if (!tenant) return res.status(404).json({ message: 'Tenant no encontrado' });

        tenant.subscription.status = 'SUSPENDED';
        tenant.subscription.cancelledAt = new Date();
        tenant.subscription.cancelReason = reason || 'Suspendido manualmente';
        tenant.plan = PLANS.SUSPENDED;
        tenant.features = { ...PLAN_FEATURES.SUSPENDED };

        tenant.markModified('subscription');
        tenant.markModified('features');
        await tenant.save();

        invalidateTenantCache(tenant._id);

        res.json({ message: 'Tenant suspendido', tenant });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.reactivate = async (req, res) => {
    try {
        const { id } = req.params;
        const { plan } = req.body; // a qué plan reactivar

        const targetPlan = plan && Object.values(PLANS).includes(plan) ? plan : PLANS.TRIAL;

        const tenant = await Tenant.findById(id);
        if (!tenant) return res.status(404).json({ message: 'Tenant no encontrado' });

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30);

        tenant.subscription.status = 'ACTIVE';
        tenant.subscription.cancelledAt = null;
        tenant.subscription.cancelReason = null;
        tenant.subscription.currentPeriodStart = now;
        tenant.subscription.currentPeriodEnd = periodEnd;
        tenant.plan = targetPlan;
        tenant.features = { ...PLAN_FEATURES[targetPlan] };

        tenant.markModified('subscription');
        tenant.markModified('features');
        await tenant.save();

        invalidateTenantCache(tenant._id);

        res.json({ message: 'Tenant reactivado', tenant });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// 8. TOGGLE MERCADO PAGO (habilitar o deshabilitar)
// ============================================
exports.toggleMercadoPago = async (req, res) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;

        const tenant = await Tenant.findById(id);
        if (!tenant) return res.status(404).json({ message: 'Tenant no encontrado' });

        if (!tenant.integrations) tenant.integrations = {};
        if (!tenant.integrations.mercadopago) tenant.integrations.mercadopago = {};

        tenant.integrations.mercadopago.enabled = !!enabled;

        // Si lo deshabilita, también marcamos como no conectado
        if (!enabled) {
            tenant.integrations.mercadopago.connected = false;
            tenant.integrations.mercadopago.accessToken = null;
        }

        // Sincronizar con la feature flag
        tenant.features.canUseMercadoPago = !!enabled;

        tenant.markModified('integrations');
        tenant.markModified('features');
        await tenant.save();

        invalidateTenantCache(tenant._id);

        res.json({
            message: `Mercado Pago ${enabled ? 'habilitado' : 'deshabilitado'}`,
            integrations: {
                mercadopago: {
                    enabled: tenant.integrations.mercadopago.enabled,
                    connected: tenant.integrations.mercadopago.connected
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// 9. UPDATE BÁSICO DE TENANT (legado, lo dejamos por compat)
// ============================================
exports.updateTenantMaster = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, businessType } = req.body;

        const updates = {};
        if (name) updates.name = name;
        if (businessType) updates.businessType = businessType;

        const updated = await Tenant.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ message: 'Comercio no encontrado' });

        invalidateTenantCache(updated._id);
        res.json({ message: 'Negocio actualizado con éxito', tenant: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// 10. (LEGACY) toggleBusiness - mantenemos por compatibilidad
// ============================================
exports.toggleBusiness = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);
        if (!tenant) return res.status(404).json({ message: 'Negocio no encontrado' });

        tenant.isActive = !tenant.isActive;
        await tenant.save();
        invalidateTenantCache(tenant._id);

        res.json({
            message: `Comercio ${tenant.isActive ? 'Habilitado' : 'Suspendido'}`,
            status: tenant.isActive
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};