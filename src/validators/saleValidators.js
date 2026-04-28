const Joi = require('joi');

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('ID inválido');

exports.createSaleSchema = Joi.object({
    items: Joi.array().items(
        Joi.object({
            productId: objectId.required(),
            quantity: Joi.number().integer().min(1).required()
            // priceAtSale, totalItem, totalAmount los IGNORAMOS - se calculan en server (FIX #8)
        })
    ).min(1).required(),
    paymentMethod: Joi.string().valid('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR', 'efectivo', 'tarjeta', 'transferencia', 'qr').required()
}).unknown(true); // permitimos campos extra pero no los usamos