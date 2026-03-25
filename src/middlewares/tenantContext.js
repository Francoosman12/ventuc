// Este middleware asegura que cualquier consulta posterior 
// tenga acceso al tenantId del usuario logueado.
exports.setTenantContext = (req, res, next) => {
    if (!req.user || !req.user.tenantId) {
        return res.status(403).json({ message: "No se identificó el comercio (Tenant ID faltante)" });
    }
    
    // Seteamos el filtro global para que sea usado en los controladores
    req.tenantFilter = { tenantId: req.user.tenantId };
    next();
};