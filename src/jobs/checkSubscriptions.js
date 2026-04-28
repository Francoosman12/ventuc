const Tenant = require('../models/Tenant');
const { PLANS, PLAN_FEATURES } = require('../config/plans');

/**
 * Job diario para gestionar el ciclo de vida de las suscripciones.
 * - Pasa de ACTIVE a GRACE_PERIOD cuando vence el trial
 * - Pasa de GRACE_PERIOD a SUSPENDED cuando vence el período de gracia
 *
 * Para correrlo: importar y llamar checkSubscriptions().
 * Idealmente se ejecuta una vez por día con un cron real (ej: node-cron).
 */
const checkSubscriptions = async () => {
    const now = new Date();
    const stats = { gracePeriodActivated: 0, suspended: 0, errors: 0 };

    try {
        // 1. Tenants con trial vencido (pasan a GRACE_PERIOD)
        const trialExpired = await Tenant.find({
            'subscription.status': 'ACTIVE',
            plan: PLANS.TRIAL,
            'subscription.trialEndsAt': { $lt: now }
        });

        for (const tenant of trialExpired) {
            try {
                tenant.subscription.status = 'GRACE_PERIOD';
                await tenant.save();
                stats.gracePeriodActivated++;
                console.log(`📋 Tenant ${tenant.name} pasó a GRACE_PERIOD (trial vencido)`);
                // TODO: enviar email avisando
            } catch (err) {
                stats.errors++;
                console.error(`Error procesando tenant ${tenant._id}:`, err.message);
            }
        }

        // 2. Tenants con gracia vencida (pasan a SUSPENDED)
        const graceExpired = await Tenant.find({
            'subscription.status': 'GRACE_PERIOD',
            'subscription.graceEndsAt': { $lt: now }
        });

        for (const tenant of graceExpired) {
            try {
                tenant.subscription.status = 'SUSPENDED';
                tenant.plan = PLANS.SUSPENDED;
                tenant.features = PLAN_FEATURES.SUSPENDED;
                await tenant.save();
                stats.suspended++;
                console.log(`🚫 Tenant ${tenant.name} pasó a SUSPENDED (gracia vencida)`);
                // TODO: enviar email avisando
            } catch (err) {
                stats.errors++;
                console.error(`Error suspendiendo tenant ${tenant._id}:`, err.message);
            }
        }

        console.log(`✅ checkSubscriptions completado:`, stats);
        return stats;
    } catch (error) {
        console.error('❌ Error en checkSubscriptions:', error);
        throw error;
    }
};

module.exports = { checkSubscriptions };