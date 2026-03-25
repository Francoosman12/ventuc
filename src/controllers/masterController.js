const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Product = require('../models/Product'); // Añadimos el modelo de Producto para contar stock

// 1. Estadísticas Globales del SaaS (Ojo de águila)
exports.getPlatformOverview = async (req, res) => {
    try {
        const tenants = await Tenant.find();
        const users = await User.countDocuments();
        
        // GMV Global (Gross Merchandise Volume)
        const sales = await Sale.find().select('totalAmount');
        const gmv = sales.reduce((acc, s) => acc + s.totalAmount, 0);

        res.json({
            tenantsCount: tenants.length,
            activeTenants: tenants.filter(t => t.isActive).length,
            usersCount: users,
            totalGMV: gmv,
            latestTenants: await Tenant.find().sort({ createdAt: -1 }).limit(5)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Detalle Profundo de un Negocio Específico (La base del Modal)
exports.getTenantDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Buscamos la info del negocio
        const tenant = await Tenant.findById(id);
        if (!tenant) return res.status(404).json({ message: "Negocio no encontrado" });

        // Buscamos los usuarios asociados a este Tenant (Excluyendo contraseñas)
        const staff = await User.find({ tenantId: id }).select('-password').sort({ role: 1 });
        
        // Contamos el volumen de datos que maneja este cliente
        const productsCount = await Product.countDocuments({ tenantId: id });
        const salesCount = await Sale.countDocuments({ tenantId: id });
const salesBySeller = await Sale.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(id) } },
    {
        $group: {
            _id: "$userId",
            total: { $sum: "$totalAmount" }
        }
    }
]);
        res.json({
            tenant,
            staff,
            stats: {
                productsCount,
                salesCount
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Gestión de Suscripciones (Activar/Desactivar negocios)
exports.toggleBusiness = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);
        if (!tenant) return res.status(404).json({ message: "Negocio no encontrado" });

        tenant.isActive = !tenant.isActive;
        await tenant.save();

        res.json({ 
            message: `Comercio ${tenant.isActive ? 'Habilitado' : 'Suspendido'}`, 
            status: tenant.isActive 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.updateTenantMaster = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, businessType, plan } = req.body;

        const updatedTenant = await Tenant.findByIdAndUpdate(
            id,
            { name, businessType, plan },
            { new: true, runValidators: true }
        );

        if (!updatedTenant) return res.status(404).json({ message: "Comercio no encontrado" });

        res.json({ message: "Negocio actualizado con éxito", tenant: updatedTenant });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};