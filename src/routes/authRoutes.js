const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');

// FIX #11: rate limiter para prevenir fuerza bruta sobre login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos por IP en 15 min
    message: {
        message: 'Demasiados intentos de login. Esperá 15 minutos antes de volver a intentar.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Limitador más permisivo para registro (5 nuevas cuentas por IP por hora)
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        message: 'Demasiados registros desde esta IP. Esperá una hora.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/register', registerLimiter, authController.registerTenant);
router.post('/login', loginLimiter, authController.login);

module.exports = router;