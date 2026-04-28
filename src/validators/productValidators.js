const Joi = require('joi');

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('ID inválido');

exports.createProductSchema = Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    barcode: Joi.string().trim().allow('', null).optional(),
    category: Joi.alternatives().try(objectId, Joi.string()).required(), // Mixed por legacy
    subCategory: objectId.allow(null).optional(),
    costPrice: Joi.number().min(0).default(0),
    salePrice: Joi.number().min(0).required(),
    stock: Joi.number().integer().min(0).default(0),
    lowStockThreshold: Joi.number().integer().min(0).default(10),
    isActive: Joi.boolean().default(true)
});

exports.updateProductSchema = Joi.object({
    name: Joi.string().trim().min(1).max(200),
    barcode: Joi.string().trim().allow('', null),
    category: Joi.alternatives().try(objectId, Joi.string()),
    subCategory: objectId.allow(null),
    costPrice: Joi.number().min(0),
    salePrice: Joi.number().min(0),
    stock: Joi.number().integer().min(0),
    lowStockThreshold: Joi.number().integer().min(0),
    isActive: Joi.boolean()
}).min(1); // al menos un campo

exports.bulkImportSchema = Joi.array().items(
    Joi.object({
        name: Joi.string().trim().required(),
        barcode: Joi.string().trim().allow('', null).optional(),
        category: Joi.any(),
        subCategory: Joi.any(),
        costPrice: Joi.number().min(0).default(0),
        salePrice: Joi.number().min(0).default(0),
        stock: Joi.number().integer().min(0).default(0),
        lowStockThreshold: Joi.number().integer().min(0).default(10)
    }).unknown(true) // permitir campos extra en bulk para flexibilidad
).min(1).max(10000);