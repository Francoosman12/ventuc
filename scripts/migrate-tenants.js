require('dotenv').config();
const mongoose = require('mongoose');
const Tenant = require('../src/models/Tenant');
const { PLANS, PLAN_FEATURES, TRIAL_DURATION_DAYS, GRACE_PERIOD_DAYS } = require('../src/config/plans');

async function migrate() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const tenants = await Tenant.find({
        $or: [
            { 'subscription.status': { $exists: false } },
            { features: { $exists: false } }
        ]
    });

    console.log(`📦 Encontrados ${tenants.length} tenants para migrar`);

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);
    const graceEndsAt = new Date(trialEndsAt);
    graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);

    for (const tenant of tenants) {
        // Si ya tenían un plan válido lo respetamos, sino TRIAL
        const targetPlan = Object.values(PLANS).includes(tenant.plan) ? tenant.plan : PLANS.TRIAL;

        tenant.plan = targetPlan;
        tenant.subscription = {
            status: 'ACTIVE',
            trialStartedAt: tenant.createdAt || now,
            trialEndsAt,
            graceEndsAt,
            currentPeriodStart: tenant.createdAt || now,
            currentPeriodEnd: trialEndsAt
        };
        tenant.features = PLAN_FEATURES[targetPlan] || PLAN_FEATURES.TRIAL;

        if (!tenant.settings) {
            tenant.settings = {
                fiscal: { currency: 'ARS', defaultVAT: 21 },
                sales: {
                    enabledPaymentMethods: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR']
                }
            };
        }

        await tenant.save();
        console.log(`  ✓ Migrado: ${tenant.name} → plan ${targetPlan}`);
    }

    console.log('✅ Migración completada');
    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('❌ Error en migración:', err);
    process.exit(1);
});