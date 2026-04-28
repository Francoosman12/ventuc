require('dotenv').config();
const mongoose = require('mongoose');

// FIX #10: Validamos variables de entorno críticas ANTES de hacer cualquier cosa.
// Si falta alguna, el proceso muere acá (no en runtime con un bug raro).
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
    console.error(`❌ Faltan variables de entorno requeridas: ${missing.join(', ')}`);
    process.exit(1);
}

const app = require('./src/app');
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Base de datos conectada con éxito');
        app.listen(PORT, () => {
            console.log(`🚀 Ventuc Backend corriendo en http://localhost:${PORT}`);
        });
        // Al final del .then() en server.js, después de app.listen:
const { checkSubscriptions } = require('./src/jobs/checkSubscriptions');

// Correr una vez al arrancar (útil para desarrollo)
checkSubscriptions().catch(err => console.error('Error en check inicial:', err));

// Correr cada 24 horas
setInterval(() => {
    checkSubscriptions().catch(err => console.error('Error en check periódico:', err));
}, 24 * 60 * 60 * 1000);
    })
    .catch(err => {
        console.error('❌ Error fatal al conectar MongoDB:', err);
        process.exit(1);
    });