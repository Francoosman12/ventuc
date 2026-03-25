require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Base de datos conectada con éxito');
        app.listen(PORT, () => {
            console.log(`🚀 Ventuc Backend corriendo en http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ Error fatal al conectar MongoDB:', err);
    });