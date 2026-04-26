const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Importar Middlewares
const { protect } = require('./middlewares/authMiddlewares');
const { setTenantContext } = require('./middlewares/tenantContext');
const dashboardController = require('./controllers/dashboardController');

require('./models/Tenant');
require('./models/Category');
require('./models/Product'); 
require('./models/Sale');


const app = express();

// 1. MIDDLEWARES GLOBALES (Seguridad y Utilidad)
app.use(helmet()); 
app.use(cors());   
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true })); 

app.use(morgan(function (tokens, req, res) {
  const reset = '\x1b[0m';
  const white = '\x1b[97m'; 
  const green = '\x1b[32m';
  const magenta = '\x1b[35m';
  const yellow = '\x1b[33m';
  const gray = '\x1b[90m';

  const status = tokens.status(req, res);
  let statusColor = status >= 500 ? '\x1b[31m' 
    : status >= 400 ? '\x1b[33m' 
    : status >= 300 ? '\x1b[36m' 
    : status >= 200 ? '\x1b[32m' 
    : reset; 

  // 3. Formateo del body aplicando el color verde al JSON
  const bodyString = Object.keys(req.body || {}).length 
    ? `\n${green}${JSON.stringify(req.body, null, 2)}${reset}` 
    : '{}';
    
  const queryString = Object.keys(req.query || {}).length 
    ? '\n' + JSON.stringify(req.query, null, 2) 
    : '{}';

  return [
    `${magenta}${tokens.method(req, res)}${reset}`,
    `${white}${tokens.url(req, res)}${reset}`, 
    `${statusColor}${status}${reset}`,
    `${gray}${tokens.res(req, res, 'content-length')} - ${tokens['response-time'](req, res)} ms${reset}`,
    `\n${yellow}👉 Body:${reset} ${bodyString}`, 
    `\n${yellow}👉 Query:${reset} ${queryString}`
  ].join(' ')
}));

// 2. RUTAS PÚBLICAS
app.use('/api/auth', require('./routes/authRoutes'));
app.get('/health', (req, res) => res.status(200).send('Retail-Go API: Status OK'));

// 3. RUTAS PROTEGIDAS Y MULTI-TENANT
// Nota: Usamos protect y setTenantContext para asegurar identidad y aislamiento de datos
app.use('/api/master', require('./routes/masterRoutes'));
app.use('/api/users', protect, setTenantContext, require('./routes/userRoutes'));
app.use('/api/products', protect, setTenantContext, require('./routes/productRoutes'));
app.use('/api/finance', protect, setTenantContext, require('./routes/financeRoutes'));
app.use('/api/suppliers', protect, setTenantContext, require('./routes/supplierRoutes'));
app.use('/api/purchases', protect, setTenantContext, require('./routes/purchaseRoutes'));
app.use('/api/sales', protect, setTenantContext, require('./routes/saleRoutes'));
app.get('/api/dashboard/summary', protect, setTenantContext, dashboardController.getDashboardSummary);
app.use('/api/categories', protect, setTenantContext, require('./routes/categoryRoutes'));

// 4. MANEJADOR DE ERRORES GLOBAL 
// Siempre debe ir al final de todas las rutas
app.use((err, req, res, next) => {
    console.error(`[Error LOG]: ${err.stack}`);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        stack: process.env.NODE_ENV === 'development' ? err.stack : {}
    });
});

module.exports = app;