const mongoose = require('mongoose');
const { PLANS } = require('../config/plans');

const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    businessType: {
        type: String,
        enum: ['SUPERMERCADO', 'FERRETERIA', 'INDUMENTARIA', 'RETAIL_GENERICO', 'ELECTRO_Y_TECH', 'GASTRONOMIA'],
        default: 'RETAIL_GENERICO'
    },

    // Mantenemos plan e isActive en raíz por compatibilidad con código existente
    plan: {
        type: String,
        enum: Object.values(PLANS),
        default: PLANS.TRIAL
    },
    isActive: { type: Boolean, default: true },

    // === SUSCRIPCIÓN ===
    subscription: {
        status: {
            type: String,
            enum: ['ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED'],
            default: 'ACTIVE'
        },
        trialStartedAt: Date,
        trialEndsAt: Date,
        graceEndsAt: Date,           // fin del período de gracia (trial + 7 días)
        currentPeriodStart: Date,     // inicio del período facturado actual
        currentPeriodEnd: Date,       // fin del período facturado actual

        // Datos de pago (Mercado Pago)
        paymentProvider: {
            type: String,
            enum: ['mercadopago', 'manual', null],
            default: null
        },
        mpPreapprovalId: String,     // ID de la suscripción en MP
        lastPaymentAt: Date,
        lastPaymentAmount: Number,
        nextChargeAt: Date,

        cancelledAt: Date,
        cancelReason: String
    },

    // === FEATURES ===
    // Estos valores se inicializan según el plan al crear el tenant.
    // El Super Admin los puede editar individualmente.
    features: {
        maxUsers: { type: Number, default: 5 },
        maxCashSessionsPerDay: { type: Number, default: 999 },
        canBulkImport: { type: Boolean, default: true },
        canUseMercadoPago: { type: Boolean, default: true },
        canAccessAdvancedReports: { type: Boolean, default: true },
        canExportData: { type: Boolean, default: true },
        canHaveMultipleBranches: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        prioritySupport: { type: Boolean, default: false }
    },

    // === SETTINGS DEL COMERCIO ===
    // Configuración que el ADMIN del tenant puede editar.
    settings: {
        taxInfo: {
            legalName: String,
            taxId: String,           // CUIT
            address: String,
            phone: String,
            contactEmail: String
        },
        fiscal: {
            currency: { type: String, default: 'ARS' },
            defaultVAT: { type: Number, default: 21 },
            invoicing: { type: Boolean, default: false },
            nextInvoiceNumber: { type: Number, default: 1 }
        },
        sales: {
            enabledPaymentMethods: {
                type: [String],
                default: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR']
            },
            allowZeroStockSale: { type: Boolean, default: false },
            allowDiscounts: { type: Boolean, default: true },
            maxDiscountPercent: { type: Number, default: 20 }
        },
        inventory: {
            defaultLowStockThreshold: { type: Number, default: 10 },
            allowNegativeStock: { type: Boolean, default: false }
        },
        receipt: {
            footerMessage: { type: String, default: 'Gracias por su compra' },
            showAddress: { type: Boolean, default: true },
            logoUrl: String
        }
    },

    // === INTEGRACIONES ===
    integrations: {
        mercadopago: {
            enabled: { type: Boolean, default: false },     // toggle del Super Admin
            connected: { type: Boolean, default: false },    // si el dueño conectó su cuenta
            mpUserId: String,
            accessToken: String,                              // ⚠️ encriptar en producción
            publicKey: String,
            connectedAt: Date
        }
    }
}, { timestamps: true });

// Índices útiles
tenantSchema.index({ 'subscription.status': 1 });
tenantSchema.index({ 'subscription.graceEndsAt': 1 }); // para el cron de expiración
tenantSchema.index({ plan: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);