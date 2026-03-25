const Sale = require('../models/Sale');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');

exports.getDashboardSummary = async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // 1. Ingresos de hoy y cantidad de ventas
        const salesToday = await Sale.find({
            tenantId: req.user.tenantId,
            createdAt: { $gte: startOfToday }
        });

        const revenueToday = salesToday.reduce((acc, s) => acc + s.totalAmount, 0);

        // 2. Stock Total e Items Críticos
        const allProducts = await Product.find(req.tenantFilter);
        const totalStock = allProducts.reduce((acc, p) => acc + p.stock, 0);
        const criticalStockCount = allProducts.filter(p => p.stock <= (p.lowStockThreshold || 10)).length;

        // 3. Últimos Logs de Auditoría (Trazabilidad ISO 9001)
        const latestLogs = await AuditLog.find(req.tenantFilter)
            .sort({ timestamp: -1 })
            .limit(4);

        // 4. Datos del gráfico semanal (Simplificado)
        const weeklyData = [45, 60, 40, 80, 55, 95, 70]; // Aquí podrías hacer una agregación real

        res.json({
            revenueToday,
            salesTodayCount: salesToday.length,
            totalStock,
            criticalStockCount,
            latestLogs,
            weeklyData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};