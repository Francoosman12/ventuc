const Joi = require('joi');

// Bloque 1: Datos del comercio
exports.taxInfoSchema = Joi.object({
    legalName: Joi.string().trim().allow('', null).max(200),
    taxId: Joi.string().trim().allow('', null).max(50),
    address: Joi.string().trim().allow('', null).max(300),
    phone: Joi.string().trim().allow('', null).max(50),
    contactEmail: Joi.string().email().allow('', null)
});

// Bloque 2: Configuración fiscal
exports.fiscalSchema = Joi.object({
    currency: Joi.string().valid('ARS', 'USD', 'UYU', 'CLP', 'BRL').default('ARS'),
    defaultVAT: Joi.number().min(0).max(100).default(21),
    invoicing: Joi.boolean().default(false),
    nextInvoiceNumber: Joi.number().integer().min(1).default(1)
});

// Bloque 3: Configuración de ventas
exports.salesSettingsSchema = Joi.object({
    enabledPaymentMethods: Joi.array().items(
        Joi.string().valid('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR', 'MERCADOPAGO')
    ).min(1).default(['EFECTIVO']),
    allowZeroStockSale: Joi.boolean().default(false),
    allowDiscounts: Joi.boolean().default(true),
    maxDiscountPercent: Joi.number().min(0).max(100).default(20)
});

// Bloque 4: Configuración de inventario
exports.inventorySettingsSchema = Joi.object({
    defaultLowStockThreshold: Joi.number().integer().min(0).default(10),
    allowNegativeStock: Joi.boolean().default(false)
});

// Bloque 5: Configuración del ticket / recibo
exports.receiptSettingsSchema = Joi.object({
    footerMessage: Joi.string().trim().allow('', null).max(200).default('Gracias por su compra'),
    showAddress: Joi.boolean().default(true),
    logoUrl: Joi.string().uri().allow('', null)
});

// Schema general — para cuando se mande todo junto
exports.fullSettingsSchema = Joi.object({
    taxInfo: exports.taxInfoSchema,
    fiscal: exports.fiscalSchema,
    sales: exports.salesSettingsSchema,
    inventory: exports.inventorySettingsSchema,
    receipt: exports.receiptSettingsSchema
}).min(1);