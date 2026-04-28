const Joi = require('joi');

exports.createUserSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(6).max(100).required(),
    role: Joi.string().valid('ADMIN', 'SELLER').required() // SUPER_ADMIN solo se asigna manualmente en DB
});

exports.updateUserSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100),
    email: Joi.string().email().lowercase().trim(),
    password: Joi.string().min(6).max(100),
    role: Joi.string().valid('ADMIN', 'SELLER')
}).min(1);