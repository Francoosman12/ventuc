const Tenant = require('../models/Tenant');
const { invalidateTenantCache } = require('../middlewares/featureGate');
const { logAction } = require('../utils/logger');
const {
    taxInfoSchema,
    fiscalSchema,
    salesSettingsSchema,
    inventorySettingsSchema,
    receiptSettingsSchema
} = require('../validators/settingsValidators');

// Helper genérico para actualizar un bloque de settings
const updateSettingsBlock = async (req, res, blockName, schema) => {
    try {
        const { error, value } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                message: 'Datos inválidos',
                details: error.details.map(d => d.message)
            });
        }

        const tenant = await Tenant.findById(req.user.tenantId);
        if (!tenant) return res.status(404).json({ message: 'Comercio no encontrado' });

        // Inicializar settings si no existe
        if (!tenant.settings) tenant.settings = {};

        // Mergeamos con lo existente (no pisamos campos que no se mandaron)
        tenant.settings[blockName] = {
            ...tenant.settings[blockName]?.toObject?.() || tenant.settings[blockName] || {},
            ...value
        };

        // Necesario para que Mongoose detecte cambios en sub-objetos
        tenant.markModified(`settings.${blockName}`);
        await tenant.save();

        invalidateTenantCache(tenant._id);

        await logAction(req, `SETTINGS_UPDATE_${blockName.toUpperCase()}`, value);

        res.json({
            message: 'Configuración actualizada correctamente',
            settings: tenant.settings
        });
    } catch (error) {
        console.error(`Error en updateSettings.${blockName}:`, error);
        res.status(500).json({ error: error.message });
    }
};

// === GET: obtener todas las settings ===
exports.getSettings = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.user.tenantId)
            .select('name businessType plan subscription settings features integrations.mercadopago.enabled integrations.mercadopago.connected')
            .lean();

        if (!tenant) return res.status(404).json({ message: 'Comercio no encontrado' });

        // No devolvemos accessToken ni datos sensibles
        res.json({
            tenant: {
                _id: tenant._id,
                name: tenant.name,
                businessType: tenant.businessType,
                plan: tenant.plan
            },
            subscription: tenant.subscription,
            settings: tenant.settings || {},
            features: tenant.features,
            integrations: {
                mercadopago: {
                    enabled: tenant.integrations?.mercadopago?.enabled || false,
                    connected: tenant.integrations?.mercadopago?.connected || false
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// === PATCH endpoints por bloque ===
exports.updateTaxInfo = (req, res) => updateSettingsBlock(req, res, 'taxInfo', taxInfoSchema);
exports.updateFiscal = (req, res) => updateSettingsBlock(req, res, 'fiscal', fiscalSchema);
exports.updateSales = (req, res) => updateSettingsBlock(req, res, 'sales', salesSettingsSchema);
exports.updateInventory = (req, res) => updateSettingsBlock(req, res, 'inventory', inventorySettingsSchema);
exports.updateReceipt = (req, res) => updateSettingsBlock(req, res, 'receipt', receiptSettingsSchema);

// === PATCH datos básicos del comercio (nombre, rubro) ===
exports.updateBusinessInfo = async (req, res) => {
    try {
        const { name, businessType } = req.body;
        const validBusinessTypes = ['SUPERMERCADO', 'FERRETERIA', 'INDUMENTARIA', 'RETAIL_GENERICO', 'ELECTRO_Y_TECH', 'GASTRONOMIA'];

        const updates = {};
        if (name && typeof name === 'string' && name.trim().length > 0) {
            updates.name = name.trim();
        }
        if (businessType && validBusinessTypes.includes(businessType)) {
            updates.businessType = businessType;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No hay datos válidos para actualizar' });
        }

        const tenant = await Tenant.findByIdAndUpdate(
            req.user.tenantId,
            updates,
            { new: true, runValidators: true }
        );

        if (!tenant) return res.status(404).json({ message: 'Comercio no encontrado' });

        invalidateTenantCache(tenant._id);
        await logAction(req, 'BUSINESS_INFO_UPDATE', updates);

        res.json({
            message: 'Información del comercio actualizada',
            tenant: {
                _id: tenant._id,
                name: tenant.name,
                businessType: tenant.businessType
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};