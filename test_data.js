// Script de prueba - 6 semanas de compras con fechas pasadas
// Ejecutar en la consola del navegador (F12 → Console)

async function simularCompras() {
  console.log('🛒 Iniciando simulación de 6 semanas...');

  // Limpiar datos anteriores
  await db.productos.clear();
  await db.listas.clear();
  await db.items_lista.clear();
  await db.compras.clear();
  await db.detalle_compra.clear();
  await db.precios.clear();
  await db.ubicacion.clear();

  console.log('📦 Creando productos...');

  // Crear productos
  const productos = [
    // Lácteos - Leches
    { nombre: 'Leche entera', categoria: 'lacteos', unidad: 'litro' },
    { nombre: 'Leche deslactosada', categoria: 'lacteos', unidad: 'litro' },
    // Lácteos - Quesos
    { nombre: 'Queso fresco', categoria: 'lacteos', unidad: 'kg' },
    { nombre: 'Queso oaxaca', categoria: 'lacteos', unidad: 'kg' },
    // Lácteos - Otros
    { nombre: 'Huevos', categoria: 'lacteos', unidad: 'docena' },
    { nombre: 'Yogurth', categoria: 'lacteos', unidad: 'pieza' },
    // Abarrotes
    { nombre: 'Arroz', categoria: 'abarrotes', unidad: 'kg' },
    { nombre: 'Frijol', categoria: 'abarrotes', unidad: 'kg' },
    { nombre: 'Lentejas', categoria: 'abarrotes', unidad: 'kg' },
    { nombre: 'Espagueti', categoria: 'abarrotes', unidad: 'pieza' },
    { nombre: 'Aceite vegetal', categoria: 'abarrotes', unidad: 'litro' },
    { nombre: 'Atún en lata', categoria: 'abarrotes', unidad: 'pieza' },
    { nombre: 'Café soluble', categoria: 'abarrotes', unidad: 'pieza' },
    { nombre: 'Pan de caja', categoria: 'panaderia', unidad: 'pieza' },
    // Carnes - Pollo
    { nombre: 'Pechuga de pollo', categoria: 'carnes', unidad: 'kg' },
    { nombre: 'Pierna y muslo de pollo', categoria: 'carnes', unidad: 'kg' },
    // Carnes - Res
    { nombre: 'Carne molida de res', categoria: 'carnes', unidad: 'kg' },
    // Frutas y Verduras
    { nombre: 'Papas', categoria: 'frutas_verduras', unidad: 'kg' },
    { nombre: 'Cebollas', categoria: 'frutas_verduras', unidad: 'kg' },
    { nombre: 'Tomate', categoria: 'frutas_verduras', unidad: 'kg' },
    { nombre: 'Limón', categoria: 'frutas_verduras', unidad: 'pieza' },
    // Limpieza
    { nombre: 'Papel higiénico', categoria: 'limpieza', unidad: 'paquete' },
    { nombre: 'Detergente para ropa', categoria: 'limpieza', unidad: 'pieza' },
    { nombre: 'Jabón para trastes', categoria: 'limpieza', unidad: 'pieza' }
  ];

  const productoIds = [];
  for (const prod of productos) {
    const id = await db.productos.add({ ...prod, activo: 1 });
    productoIds.push(id);
  }

  console.log('📍 Configurando ubicación...');
  await db.ubicacion.add({
    ciudad: 'Ciudad de México',
    region: 'CDMX',
    fechaObtenida: new Date(),
    activa: 1
  });

  // Helper para obtener fecha de hace N semanas
  const getFecha = (semanasAtras, diaSemana) => {
    const hoy = new Date();
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - (semanasAtras * 7) - (hoy.getDay() - diaSemana));
    fecha.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
    return fecha;
  };

  // ============================================
  // SEMANA 6 (6 semanas atrás) - Walmart
  // ============================================
  console.log('📅 Semana 6...');
  const compra6 = await db.compras.add({
    fecha: getFecha(5, 3),
    tienda: 'Walmart',
    total: 520,
    ciudad: 'Ciudad de México',
    region: 'CDMX'
  });

  const items6 = [
    { idx: 0, cant: 2, precio: 26, pres: '1L', marca: 'Lala' },         // Leche entera
    { idx: 6, cant: 1, precio: 24, pres: '1kg', marca: 'Minsa' },       // Arroz
    { idx: 7, cant: 1, precio: 32, pres: '1kg', marca: 'San Miguel' },  // Frijol
    { idx: 2, cant: 0.5, precio: 85, pres: '500g', marca: 'Bonala' },   // Queso fresco
    { idx: 4, cant: 1, precio: 42, pres: '12 pzas', marca: 'San Juan' },// Huevos
    { idx: 10, cant: 1, precio: 44, pres: '1L', marca: 'Cristal' },     // Aceite
    { idx: 13, cant: 1, precio: 38, pres: 'pieza', marca: 'Bimbo' },    // Pan
    { idx: 14, cant: 1, precio: 95, pres: '1kg', marca: 'Ranchero' },   // Pechuga pollo
    { idx: 20, cant: 1, precio: 18, pres: 'pieza', marca: 'Del Campo' },// Limón
    { idx: 21, cant: 1, precio: 35, pres: 'paquete', marca: 'Regio' }   // Papel higiénico
  ];

  for (const item of items6) {
    await db.detalle_compra.add({ compraId: compra6, productoId: productoIds[item.idx], cantidad: item.cant, marca: item.marca, presentacion: item.pres, precioUnitario: item.precio });
    await db.precios.add({ productoId: productoIds[item.idx], tienda: 'Walmart', marca: item.marca, precio: item.precio, presentacion: item.pres, ciudad: 'Ciudad de México', fecha: getFecha(5, 3) });
  }

  // ============================================
  // SEMANA 5 (5 semanas atrás) - Soriana
  // ============================================
  console.log('📅 Semana 5...');
  const compra5 = await db.compras.add({
    fecha: getFecha(4, 4),
    tienda: 'Soriana',
    total: 545,
    ciudad: 'Ciudad de México',
    region: 'CDMX'
  });

  const items5 = [
    { idx: 0, cant: 2, precio: 28, pres: '1L', marca: 'Lala' },
    { idx: 6, cant: 1, precio: 26, pres: '1kg', marca: 'Minsa' },
    { idx: 7, cant: 1, precio: 35, pres: '1kg', marca: 'San Miguel' },
    { idx: 2, cant: 0.5, precio: 88, pres: '500g', marca: 'Bonala' },
    { idx: 4, cant: 1, precio: 45, pres: '12 pzas', marca: 'San Juan' },
    { idx: 10, cant: 1, precio: 46, pres: '1L', marca: 'Cristal' },
    { idx: 13, cant: 1, precio: 40, pres: 'pieza', marca: 'Bimbo' },
    { idx: 14, cant: 1, precio: 98, pres: '1kg', marca: 'Ranchero' },
    { idx: 17, cant: 1, precio: 22, pres: 'kg', marca: 'Del Campo' },   // Papas
    { idx: 22, cant: 1, precio: 42, pres: 'pieza', marca: 'Ariel' }     // Detergente
  ];

  for (const item of items5) {
    await db.detalle_compra.add({ compraId: compra5, productoId: productoIds[item.idx], cantidad: item.cant, marca: item.marca, presentacion: item.pres, precioUnitario: item.precio });
    await db.precios.add({ productoId: productoIds[item.idx], tienda: 'Soriana', marca: item.marca, precio: item.precio, presentacion: item.pres, ciudad: 'Ciudad de México', fecha: getFecha(4, 4) });
  }

  // ============================================
  // SEMANA 4 (4 semanas atrás) - Bodega Aurrera
  // ============================================
  console.log('📅 Semana 4...');
  const compra4 = await db.compras.add({
    fecha: getFecha(3, 2),
    tienda: 'Bodega Aurrera',
    total: 410,
    ciudad: 'Ciudad de México',
    region: 'CDMX'
  });

  const items4 = [
    { idx: 0, cant: 2, precio: 24, pres: '1L', marca: 'Lala' },
    { idx: 6, cant: 1, precio: 22, pres: '1kg', marca: 'Minsa' },
    { idx: 7, cant: 1, precio: 30, pres: '1kg', marca: 'San Miguel' },
    { idx: 2, cant: 0.5, precio: 78, pres: '500g', marca: 'Bonala' },
    { idx: 4, cant: 1, precio: 40, pres: '12 pzas', marca: 'San Juan' },
    { idx: 10, cant: 1, precio: 42, pres: '1L', marca: 'Cristal' },
    { idx: 14, cant: 1, precio: 88, pres: '1kg', marca: 'Ranchero' },
    { idx: 8, cant: 1, precio: 35, pres: '1kg', marca: 'Verde Valle' },  // Lentejas
    { idx: 23, cant: 1, precio: 28, pres: 'pieza', marca: 'Zote' }       // Jabón trastes
  ];

  for (const item of items4) {
    await db.detalle_compra.add({ compraId: compra4, productoId: productoIds[item.idx], cantidad: item.cant, marca: item.marca, presentacion: item.pres, precioUnitario: item.precio });
    await db.precios.add({ productoId: productoIds[item.idx], tienda: 'Bodega Aurrera', marca: item.marca, precio: item.precio, presentacion: item.pres, ciudad: 'Ciudad de México', fecha: getFecha(3, 2) });
  }

  // ============================================
  // SEMANA 3 (3 semanas atrás) - Chedraui
  // ============================================
  console.log('📅 Semana 3...');
  const compra3 = await db.compras.add({
    fecha: getFecha(2, 5),
    tienda: 'Chedraui',
    total: 475,
    ciudad: 'Ciudad de México',
    region: 'CDMX'
  });

  const items3 = [
    { idx: 0, cant: 2, precio: 27, pres: '1L', marca: 'Lala' },
    { idx: 6, cant: 1, precio: 25, pres: '1kg', marca: 'Minsa' },
    { idx: 7, cant: 1, precio: 33, pres: '1kg', marca: 'San Miguel' },
    { idx: 2, cant: 0.5, precio: 84, pres: '500g', marca: 'Bonala' },
    { idx: 4, cant: 1, precio: 44, pres: '12 pzas', marca: 'San Juan' },
    { idx: 10, cant: 1, precio: 45, pres: '1L', marca: 'Cristal' },
    { idx: 14, cant: 1, precio: 92, pres: '1kg', marca: 'Ranchero' },
    { idx: 15, cant: 1, precio: 65, pres: 'kg', marca: 'Del Campo' },    // Pierna pollo
    { idx: 18, cant: 1, precio: 15, pres: 'kg', marca: 'Del Campo' },    // Cebollas
    { idx: 19, cant: 1, precio: 20, pres: 'kg', marca: 'Del Campo' }     // Tomate
  ];

  for (const item of items3) {
    await db.detalle_compra.add({ compraId: compra3, productoId: productoIds[item.idx], cantidad: item.cant, marca: item.marca, presentacion: item.pres, precioUnitario: item.precio });
    await db.precios.add({ productoId: productoIds[item.idx], tienda: 'Chedraui', marca: item.marca, precio: item.precio, presentacion: item.pres, ciudad: 'Ciudad de México', fecha: getFecha(2, 5) });
  }

  // ============================================
  // SEMANA 2 (2 semanas atrás) - La Comer
  // ============================================
  console.log('📅 Semana 2...');
  const compra2 = await db.compras.add({
    fecha: getFecha(1, 3),
    tienda: 'La Comer',
    total: 560,
    ciudad: 'Ciudad de México',
    region: 'CDMX'
  });

  const items2 = [
    { idx: 0, cant: 2, precio: 30, pres: '1.5L', marca: 'Lala' },
    { idx: 6, cant: 1, precio: 28, pres: '1kg', marca: 'Minsa' },
    { idx: 7, cant: 1, precio: 38, pres: '1kg', marca: 'San Miguel' },
    { idx: 2, cant: 0.5, precio: 92, pres: '500g', marca: 'Bonala' },
    { idx: 4, cant: 1, precio: 48, pres: '12 pzas', marca: 'San Juan' },
    { idx: 10, cant: 1, precio: 50, pres: '1L', marca: 'Cristal' },
    { idx: 14, cant: 1, precio: 105, pres: '1kg', marca: 'Ranchero' },
    { idx: 16, cant: 1, precio: 120, pres: '1kg', marca: 'San Antonio' },// Carne molida
    { idx: 11, cant: 2, precio: 22, pres: 'pieza', marca: 'Dolores' },   // Atún
    { idx: 5, cant: 4, precio: 8, pres: 'pieza', marca: 'Yoka' },        // Yogurth
    { idx: 12, cant: 1, precio: 75, pres: 'pieza', marca: 'Nescafé' }    // Café
  ];

  for (const item of items2) {
    await db.detalle_compra.add({ compraId: compra2, productoId: productoIds[item.idx], cantidad: item.cant, marca: item.marca, presentacion: item.pres, precioUnitario: item.precio });
    await db.precios.add({ productoId: productoIds[item.idx], tienda: 'La Comer', marca: item.marca, precio: item.precio, presentacion: item.pres, ciudad: 'Ciudad de México', fecha: getFecha(1, 3) });
  }

  // ============================================
  // SEMANA 1 (esta semana) - Walmart (mejores precios)
  // ============================================
  console.log('📅 Semana 1 - Esta semana...');
  const compra1 = await db.compras.add({
    fecha: getFecha(0, 4),
    tienda: 'Walmart',
    total: 425,
    ciudad: 'Ciudad de México',
    region: 'CDMX'
  });

  const items1 = [
    { idx: 0, cant: 2, precio: 25, pres: '1L', marca: 'Lala' },
    { idx: 6, cant: 1, precio: 23, pres: '1kg', marca: 'Minsa' },
    { idx: 7, cant: 1, precio: 31, pres: '1kg', marca: 'San Miguel' },
    { idx: 2, cant: 0.5, precio: 80, pres: '500g', marca: 'Bonala' },
    { idx: 4, cant: 1, precio: 41, pres: '12 pzas', marca: 'San Juan' },
    { idx: 10, cant: 1, precio: 43, pres: '1L', marca: 'Cristal' },
    { idx: 14, cant: 1, precio: 85, pres: '1kg', marca: 'Ranchero' },
    { idx: 15, cant: 1, precio: 60, pres: 'kg', marca: 'Del Campo' },
    { idx: 9, cant: 1, precio: 18, pres: 'pieza', marca: 'La Moderna' },  // Espagueti
    { idx: 21, cant: 1, precio: 32, pres: 'paquete', marca: 'Regio' }
  ];

  for (const item of items1) {
    await db.detalle_compra.add({ compraId: compra1, productoId: productoIds[item.idx], cantidad: item.cant, marca: item.marca, presentacion: item.pres, precioUnitario: item.precio });
    await db.precios.add({ productoId: productoIds[item.idx], tienda: 'Walmart', marca: item.marca, precio: item.precio, presentacion: item.pres, ciudad: 'Ciudad de México', fecha: getFecha(0, 4) });
  }

  // Crear lista activa
  const listaId = await db.listas.add({ nombre: 'Semanal', fechaCreacion: new Date(), activa: 1 });
  await db.items_lista.add({ listaId, productoId: productoIds[0], cantidad: 2, comprado: 0 });  // Leche
  await db.items_lista.add({ listaId, productoId: productoIds[6], cantidad: 1, comprado: 0 });  // Arroz
  await db.items_lista.add({ listaId, productoId: productoIds[7], cantidad: 1, comprado: 0 });  // Frijol
  await db.items_lista.add({ listaId, productoId: productoIds[14], cantidad: 1, comprado: 0 }); // Pechuga

  console.log('');
  console.log('✅ ¡Simulación completada!');
  console.log('');
  console.log('📊 Resumen:');
  console.log('   - 6 semanas de compras');
  console.log('   - 24 productos');
  console.log('   - 5 tiendas diferentes');
  console.log('   - Precios variando entre semanas');
  console.log('');
  console.log('🔄 Recarga la página para ver los cambios');

  setTimeout(() => location.reload(), 1500);
}

simularCompras().catch(console.error);
