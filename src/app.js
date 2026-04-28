const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { protect } = require('./middlewares/authMiddlewares');
const { setTenantContext } = require('./middlewares/tenantContext');
const dashboardController = require('./controllers/dashboardController');

require('./models/Tenant');
require('./models/Category');
require('./models/Product');
require('./models/Sale');

const app = express();

// 1. MIDDLEWARES GLOBALES
app.use(helmet());

// FIX #9: CORS configurado con origen explícito.
// FRONTEND_URL puede ser "https://app.ventuc.com" en prod.
// Si no está seteada, en dev permite localhost.
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4200'];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origin (Postman, curl, mobile apps)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin no permitido por CORS: ${origin}`));
    },
    credentials: true
}));

// FIX #14: bajamos el límite de 50mb a 10mb para reducir riesgo de DoS.
// Si necesitás importaciones masivas más grandes, hacelo en chunks.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logger de requests con colores
app.use(morgan(function (tokens, req, res) {
    const reset = '\x1b[0m';
    const white = '\x1b[97m';
    const green = '\x1b[32m';
    const magenta = '\x1b[35m';
    const yellow = '\x1b[33m';
    const gray = '\x1b[90m';

    const status = tokens.status(req, res);
    const statusColor = status >= 500 ? '\x1b[31m'
        : status >= 400 ? '\x1b[33m'
        : status >= 300 ? '\x1b[36m'
        : status >= 200 ? '\x1b[32m'
        : reset;

    // Sanitizamos passwords del log
    const safeBody = { ...(req.body || {}) };
    if (safeBody.password) safeBody.password = '***';

    const bodyString = Object.keys(safeBody).length
        ? `\n${green}${JSON.stringify(safeBody, null, 2)}${reset}`
        : '{}';

    const queryString = Object.keys(req.query || {}).length
        ? '\n' + JSON.stringify(req.query, null, 2)
        : '{}';

    return [
        `${magenta}${tokens.method(req, res)}${reset}`,
        `${white}${tokens.url(req, res)}${reset}`,
        `${statusColor}${status}${reset}`,
        `${gray}${tokens.res(req, res, 'content-length')} - ${tokens['response-time'](req, res)} ms${reset}`,
        req.method == 'GET' ? '' : `\n${yellow}👉 Body:${reset} ${bodyString}`,
        req.method == 'GET' ? '' : `\n${yellow}👉 Query:${reset} ${queryString}`
    ].join(' ');
}));

// 2. RUTAS PÚBLICAS
app.use('/api/auth', require('./routes/authRoutes'));
app.get('/health', (req, res) => res.status(200).send('Ventuc API: Status OK'));

// 3. RUTAS PROTEGIDAS Y MULTI-TENANT
app.use('/api/master', require('./routes/masterRoutes'));
app.use('/api/users', protect, setTenantContext, require('./routes/userRoutes'));
app.use('/api/products', protect, setTenantContext, require('./routes/productRoutes'));
app.use('/api/finance', protect, setTenantContext, require('./routes/financeRoutes'));
app.use('/api/suppliers', protect, setTenantContext, require('./routes/supplierRoutes'));
app.use('/api/purchases', protect, setTenantContext, require('./routes/purchaseRoutes'));
app.use('/api/sales', protect, setTenantContext, require('./routes/saleRoutes'));
app.get('/api/dashboard/summary', protect, setTenantContext, dashboardController.getDashboardSummary);
app.use('/api/categories', protect, setTenantContext, require('./routes/categoryRoutes'));
app.use('/api/settings', protect, setTenantContext, require('./routes/settingsRoutes'));

// 4. MANEJADOR DE ERRORES GLOBAL
app.use((err, req, res, next) => {
    console.error(`[Error LOG]: ${err.stack}`);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

module.exports = app;