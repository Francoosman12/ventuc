/**
 * Configuración central de planes y features del SaaS.
 *
 * IMPORTANTE: Las features de cada Tenant se almacenan en su propio documento
 * (tenant.features) para permitir customización por cliente. Estos defaults se
 * usan al crear un tenant nuevo o al cambiar de plan.
 *
 * Si querés darle a un cliente PRO una feature ENTERPRISE como cortesía,
 * editá tenant.features directamente desde el panel de Super Admin.
 */

const PLANS = {
    TRIAL: 'TRIAL',
    STARTER: 'STARTER',
    PRO: 'PRO',
    ENTERPRISE: 'ENTERPRISE',
    SUSPENDED: 'SUSPENDED' // estado especial para trials vencidos sin pago
};

const PLAN_FEATURES = {
    TRIAL: {
        // Durante el trial todo desbloqueado para que prueben de verdad.
        maxUsers: 5,
        maxCashSessionsPerDay: 999,
        canBulkImport: true,
        canUseMercadoPago: true,
        canAccessAdvancedReports: true,
        canExportData: true,
        canHaveMultipleBranches: false,
        apiAccess: false,
        prioritySupport: false
    },

    STARTER: {
        maxUsers: 2,
        maxCashSessionsPerDay: 1,
        canBulkImport: false,
        canUseMercadoPago: false,
        canAccessAdvancedReports: false,
        canExportData: false,
        canHaveMultipleBranches: false,
        apiAccess: false,
        prioritySupport: false
    },

    PRO: {
        maxUsers: 10,
        maxCashSessionsPerDay: 10,
        canBulkImport: true,
        canUseMercadoPago: true,
        canAccessAdvancedReports: true,
        canExportData: true,
        canHaveMultipleBranches: false,
        apiAccess: false,
        prioritySupport: false
    },

    ENTERPRISE: {
        maxUsers: 999,
        maxCashSessionsPerDay: 999,
        canBulkImport: true,
        canUseMercadoPago: true,
        canAccessAdvancedReports: true,
        canExportData: true,
        canHaveMultipleBranches: true,
        apiAccess: true,
        prioritySupport: true
    },

    SUSPENDED: {
        // Estado de un trial vencido sin pago. El admin puede loguear pero no operar.
        maxUsers: 1,
        maxCashSessionsPerDay: 0,
        canBulkImport: false,
        canUseMercadoPago: false,
        canAccessAdvancedReports: false,
        canExportData: false,
        canHaveMultipleBranches: false,
        apiAccess: false,
        prioritySupport: false
    }
};

// Metadatos de cada plan para mostrar en UI / facturación
const PLAN_METADATA = {
    TRIAL: {
        label: 'Prueba gratuita',
        description: '30 días para probar todo Ventuc sin restricciones',
        priceMonthly: 0,
        currency: 'ARS',
        public: false // no se ofrece directamente, se asigna al registrarse
    },
    STARTER: {
        label: 'Starter',
        description: 'Para almacenes, kioscos y emprendedores',
        priceMonthly: 15000,
        currency: 'ARS',
        public: true
    },
    PRO: {
        label: 'Pro',
        description: 'Para comercios establecidos con múltiples empleados',
        priceMonthly: 30000,
        currency: 'ARS',
        public: true
    },
    ENTERPRISE: {
        label: 'Enterprise',
        description: 'Para cadenas y multi-sucursal',
        priceMonthly: null, // a consultar
        currency: 'ARS',
        public: true
    }
};

// Configuración de tiempos
const TRIAL_DURATION_DAYS = 30;
const GRACE_PERIOD_DAYS = 7; // después del trial, días extra antes de suspender

module.exports = {
    PLANS,
    PLAN_FEATURES,
    PLAN_METADATA,
    TRIAL_DURATION_DAYS,
    GRACE_PERIOD_DAYS
};