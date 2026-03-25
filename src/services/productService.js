const Product = require('../models/Product');

const createProduct = async (tenantId, productData) => {
    // Aquí iría la validación lógica de negocio
    const product = new Product({
        ...productData,
        tenantId // Inyectamos el tenantId forzosamente
    });
    return await product.save();
};


// Buscar producto por código de barras (Solo del comercio actual)
const getProductByBarcode = async (tenantId, barcode) => {
    let product = await Product.findOne({ tenantId, barcode });

    if (!product) {
        // MEJORA ESTRATÉGICA: Si no existe en el local, 
        // podríamos buscar en una base de datos global de Retail-Go
        // product = await GlobalCatalog.findOne({ barcode });
        return { message: "Producto no registrado", suggestion: null };
    }
    
    return product;
};

// Actualización de stock (ISO 9001: Trazabilidad)
const updateStock = async (productId, quantity, type = 'sale') => {
    const increment = type === 'sale' ? -quantity : quantity;
    return await Product.findByIdAndUpdate(
        productId, 
        { $inc: { stock: increment } },
        { new: true }
    );
};

module.exports = { createProduct, getProductByBarcode, updateStock };