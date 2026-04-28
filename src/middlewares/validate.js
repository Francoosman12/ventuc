/**
 * Middleware genérico para validar req.body con un schema de Joi.
 * Ejemplo de uso:
 *   router.post('/', validate(createProductSchema), controller.create);
 */
exports.validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: false // dejá que cada schema decida
    });
    if (error) {
        return res.status(400).json({
            message: 'Datos inválidos',
            details: error.details.map(d => d.message)
        });
    }
    req.body = value; // reemplazamos con datos validados (con defaults aplicados)
    next();
};