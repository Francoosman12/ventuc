const Tenant = require('../models/Tenant');

// Cache simple en memoria para no consultar el tenant en cada request.
// TTL corto (60s) para que los cambios desde el Super Admin se reflejen rápido.
const tenantCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

const getTenant = async (tenantId) => {
    const cached = tenantCache.get(tenantId.toString());
    if (cached && (Date.now() - cached.at) < CACHE_TTL_MS) {
        return cached.tenant;
    }
    const tenant = await Tenant.findById(tenantId).lean();
    tenantCache.set(tenantId.toString(), { tenant, at: Date.now() });
    return tenant;
};

// Permite invalidar el cache desde otros lugares (ej. al editar features desde Super Admin).
exports.invalidateTenantCache = (tenantId) => {
    tenantCache.delete(tenantId.toString());
};

/**
 * Chequea que la suscripción esté en estado activo (no SUSPENDED ni CANCELLED).
 * Bloquea TODOS los endpoints excepto los que estén en la whitelist (auth, settings de pago, etc.)
 */
exports.requireActiveSubscription = async (req, res, next) => {
    try {
        if (!req.user?.tenantId) return next(); // SUPER_ADMIN no tiene tenantId

        const tenant = await getTenant(req.user.tenantId);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant no encontrado' });
        }

        const status = tenant.subscription?.status;

        if (status === 'CANCELLED') {
            return res.status(403).json({
                message: 'Tu suscripción está cancelada. Contactanos para reactivarla.',
                code: 'SUBSCRIPTION_CANCELLED'
            });
        }

        if (status === 'SUSPENDED') {
            return res.status(402).json({
                message: 'Tu período de prueba terminó. Activá un plan para seguir usando Ventuc.',
                code: 'SUBSCRIPTION_SUSPENDED'
            });
        }

        // Si está en GRACE_PERIOD lo dejamos pasar pero podemos avisar al frontend
        if (status === 'GRACE_PERIOD') {
            res.set('X-Subscription-Status', 'GRACE_PERIOD');
            const daysLeft = Math.ceil(
                (new Date(tenant.subscription.graceEndsAt) - new Date()) / (1000 * 60 * 60 * 24)
            );
            res.set('X-Grace-Days-Left', String(Math.max(0, daysLeft)));
        }

        req.tenant = tenant; // lo dejamos disponible para los próximos middlewares
        next();
    } catch (error) {
        console.error('Error en requireActiveSubscription:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Chequea que el tenant tenga habilitada una feature específica.
 * Uso: router.post('/bulk', requireFeature('canBulkImport'), bulkImport)
 */
exports.requireFeature = (featureName) => async (req, res, next) => {
    try {
        const tenant = req.tenant || await getTenant(req.user.tenantId);

        if (!tenant.features?.[featureName]) {
            return res.status(403).json({
                message: 'Tu plan no incluye esta funcionalidad',
                feature: featureName,
                currentPlan: tenant.plan,
                code: 'FEATURE_NOT_AVAILABLE'
            });
        }

        next();
    } catch (error) {
        console.error('Error en requireFeature:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Chequea límites numéricos (ej: maxUsers).
 * Uso: router.post('/users', requireWithinLimit('maxUsers', countCurrentUsers), createUser)
 */
exports.requireWithinLimit = (limitName, getCurrentCount) => async (req, res, next) => {
    try {
        const tenant = req.tenant || await getTenant(req.user.tenantId);
        const limit = tenant.features?.[limitName];
        const current = await getCurrentCount(req);

        if (limit !== undefined && current >= limit) {
            return res.status(403).json({
                message: `Alcanzaste el límite de tu plan: ${limitName} = ${limit}`,
                limit: limitName,
                limitValue: limit,
                currentValue: current,
                code: 'LIMIT_REACHED'
            });
        }

        next();
    } catch (error) {
        console.error('Error en requireWithinLimit:', error);
        res.status(500).json({ error: error.message });
    }
};