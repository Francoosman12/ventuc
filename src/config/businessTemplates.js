// src/config/businessTemplates.js
module.exports = {
    FERRETERIA: [
        { name: "Herramientas Manuales", sub: ["Destornilladores", "Pinzas y Alicates", "Llaves y Tubos", "Martillos y Mazas", "Sierras y Serruchos", "Medición y Marcado", "Cajas y Organizadores"] },
        { name: "Herramientas Eléctricas", sub: ["Taladros y Atornilladores", "Amoladoras", "Sierras Eléctricas", "Lijadoras", "Soldadoras", "Compresores", "Generadores Eléctricos"] },
        { name: "Fijación y Bulonería", sub: ["Tornillos de Madera", "Pernos de Acero", "Arandelas", "Tuercas", "Tacos y Anclajes", "Remaches", "Varillas Roscadas"] },
        { name: "Pinturas y Acabados", sub: ["Látex Interior", "Látex Exterior", "Esmaltes Sintéticos", "Barnices y Lacas", "Impermeabilizantes", "Pinceles y Rodillos", "Diluyentes y Thinner"] },
        { name: "Electricidad", sub: ["Cables y Conductores", "Interruptores y Tomas", "Térmicas y Disyuntores", "Iluminación LED", "Canalización y Caños", "Pilas y Baterías", "Tableros Eléctricos"] },
        { name: "Plomería y Gas", sub: ["Caños de Agua (Termofusión)", "Caños de Desagüe", "Accesorios PVC", "Grifería de Baño", "Grifería de Cocina", "Bombas de Agua", "Válvulas y Llaves de Paso"] },
        { name: "Construcción Seca", sub: ["Placas de Yeso", "Perfiles Galvanizados", "Masillas", "Cintas de Fibra", "Tornillos T1/T2", "Aislantes Térmicos"] },
        { name: "Jardín y Exterior", sub: ["Riego Automático", "Mangueras y Acoples", "Podadoras y Bordadoras", "Palas y Rastrillos", "Piscina y Químicos", "Mallas Cima y Cercos"] }
    ],
    INDUMENTARIA: [
        { name: "Mujer - Superior", sub: ["Remeras", "Blusas", "Tops y Musculosas", "Camisas", "Sweaters y Cardigans", "Blazers", "Camperas y Abrigos"] },
        { name: "Mujer - Inferior", sub: ["Jeans", "Pantalones de Vestir", "Shorts y Bermudas", "Polleras", "Leggings", "Monos"] },
        { name: "Hombre - Superior", sub: ["Remeras", "Chombas", "Camisas Casual", "Camisas de Vestir", "Sweaters", "Camperas e Impermeables", "Sacos y Amas"] },
        { name: "Hombre - Inferior", sub: ["Jeans", "Pantalones Chino", "Bermudas", "Pantalones Deportivos", "Ropa Interior (Underwear)"] },
        { name: "Calzado Urbano", sub: ["Zapatillas", "Zapatos", "Botas y Botinetas", "Sandalias", "Mocasines", "Pantuflas"] },
        { name: "Calzado Deportivo", sub: ["Running", "Training", "Fútbol / Botines", "Tenis / Padel", "Básquet"] },
        { name: "Accesorios", sub: ["Bolsos y Carteras", "Mochilas", "Cinturones", "Gorras y Sombreros", "Lentes de Sol", "Pañuelos y Bufandas", "Relojes"] },
        { name: "Ropa de Noche", sub: ["Vestidos de Fiesta", "Sastrería Premium", "Lencería y Pijamas"] }
    ],
    SUPERMERCADO: [
        { name: "Almacén", sub: ["Aceites y Vinagres", "Arroz y Legumbres", "Pastas Secas", "Harinas y Premezclas", "Sal, Especias y Condimentos", "Snacks y Copetín", "Conservas de Latas", "Repostería"] },
        { name: "Desayuno y Merienda", sub: ["Café e Infusiones", "Azúcar y Endulzantes", "Galletitas Dulces", "Yerba Mate", "Cereales y Barras", "Mermeladas y Dulces"] },
        { name: "Bebidas Sin Alcohol", sub: ["Aguas Minerales", "Gaseosas", "Jugos Listos", "Energizantes", "Aguas Saborizadas"] },
        { name: "Bebidas Con Alcohol", sub: ["Cervezas", "Vinos Tintos", "Vinos Blancos", "Champagnes", "Fernet y Aperitivos", "Vodka y Spirits", "Whisky"] },
        { name: "Lácteos y Quesos", sub: ["Leches Frescas", "Yogures y Postres", "Quesos Untables", "Quesos de Barra", "Mantecas y Margarinas", "Dulce de Leche"] },
        { name: "Fiambrería y Charcutería", sub: ["Jamones", "Salames y Salchichas", "Chacinados", "Aceitunas y Encurtidos"] },
        { name: "Frescos y Congelados", sub: ["Carnicería", "Frutas y Verduras", "Panadería Fresca", "Comidas Listas", "Hamburguesas y Medallones", "Helados"] },
        { name: "Perfumería e Higiene", sub: ["Cuidado Capilar", "Jabones y Geles", "Higiene Bucal", "Desodorantes", "Protección Femenina", "Pañales y Bebé"] },
        { name: "Limpieza", sub: ["Cuidado de la Ropa", "Lavandina y Desinfectantes", "Limpiadores de Piso", "Lavavajillas", "Papel Higiénico y Rollos", "Insecticidas"] },
        { name: "Mascotas", sub: ["Alimento Perros", "Alimento Gatos", "Arena Sanitaria", "Accesorios"] }
    ],
    ELECTRO_Y_TECH: [
        { name: "Computación", sub: ["Notebooks", "Periféricos", "Componentes PC", "Monitores", "Almacenamiento (Discos/Pendrives)", "Redes y Wi-Fi"] },
        { name: "Telefonía", sub: ["Celulares Libres", "Smartwatch", "Accesorios para Celular", "Tablets"] },
        { name: "TV y Video", sub: ["Smart TVs", "Streaming (Chromecast/Roku)", "Soportes", "Cámaras Fotográficas"] },
        { name: "Audio", sub: ["Auriculares", "Parlantes Bluetooth", "Equipos de Sonido", "Microfonos"] },
        { name: "Climatización", sub: ["Aires Acondicionados", "Ventiladores", "Estufas y Calefactores"] }
    ],
    GASTRONOMIA: [
        { name: "Minutas", sub: ["Hamburguesas", "Lomitos", "Milanesas", "Papas Fritas"] },
        { name: "Pizzería", sub: ["Pizzas Clásicas", "Pizzas Gourmet", "Empanadas", "Fainá"] },
        { name: "Cafetería", sub: ["Café Caliente", "Pastelería", "Sandwiches", "Café Frío / Frapé"] }
    ]
};