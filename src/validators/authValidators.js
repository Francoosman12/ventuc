const Joi = require('joi');

const businessTypes = ['SUPERMERCADO', 'FERRETERIA', 'INDUMENTARIA', 'RETAIL_GENERICO', 'ELECTRO_Y_TECH', 'GASTRONOMIA'];

exports.registerSchema = Joi.object({
    companyName: Joi.string().trim().min(2).max(100).required(),
    adminName: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(6).max(100).required(),
    businessType: Joi.string().valid(...businessTypes).optional()
});

exports.loginSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().required()
});