// Database module - DespensaApp v2
const db = new Dexie('DespensaApp');
db.version(3).stores({
  productos: '++id, nombre, categoria, activo',
  listas: '++id, nombre, activa',
  items_lista: '++id, listaId, productoId, comprado',
  compras: '++id, fecha, ciudad',
  detalle_compra: '++id, compraId, productoId',
  precios: '++id, productoId, tienda, fecha, ciudad, [productoId+tienda]',
  ubicacion: '++id, ciudad, activa'
});

window.APP_DB = {
  // ============ PRODUCTOS ============
  async addProducto(producto) { return db.productos.add(producto); },
  async updateProducto(id, changes) { return db.productos.update(id, changes); },
  async getProducto(id) { return db.productos.get(id); },
  async getAllProductos() { return db.productos.filter(p => p.activo === 1).toArray(); },
  async searchProductos(query) {
    return db.productos.where('nombre').startsWithIgnoreCase(query).toArray();
  },

  // ============ LISTAS ============
  async createLista(nombre) {
    await db.listas.where('activa').equals(1).modify({ activa: 0 });
    return db.listas.add({ nombre, fechaCreacion: new Date(), activa: 1 });
  },
  async getListaActiva() {
    let lista = await db.listas.where('activa').equals(1).first();
    if (!lista) {
      const id = await this.createLista('Semanal');
      lista = await db.listas.get(id);
    }
    return lista;
  },

  // ============ ITEMS LISTA ============
  async addItem(listaId, productoId, cantidad = 1) {
    const existing = await db.items_lista.where({ listaId, productoId }).first();
    if (existing) {
      await db.items_lista.update(existing.id, { cantidad: existing.cantidad + cantidad });
      return existing.id;
    }
    return db.items_lista.add({ listaId, productoId, cantidad, comprado: 0 });
  },
  async updateItem(id, changes) { return db.items_lista.update(id, changes); },
  async removeItem(id) { return db.items_lista.delete(id); },
  async getItemsByLista(listaId) {
    const items = await db.items_lista.where('listaId').equals(listaId).toArray();
    const result = [];
    for (const item of items) {
      const producto = await db.productos.get(item.productoId);
      result.push({ ...item, producto });
    }
    return result;
  },

  // ============ COMPRAS ============
  async addCompra(compra) {
    const ubicacion = await this.getUbicacion();
    const compraId = await db.compras.add({
      fecha: new Date(),
      tienda: compra.tienda,
      total: compra.total,
      ciudad: ubicacion?.ciudad || 'Sin ubicación',
      region: ubicacion?.region || ''
    });

    // Insertar todos los detalles en paralelo (más rápido que loop secuencial)
    await Promise.all(compra.productos.map(async (item) => {
      await db.detalle_compra.add({
        compraId,
        productoId: item.productoId,
        cantidad: item.cantidad,
        marca: item.marca || '',
        presentacion: item.presentacion || '',
        precioUnitario: item.precioUnitario
      });

      // Guardar en tabla de precios para comparativa
      await this.addPrecio(
        item.productoId,
        compra.tienda,
        item.marca || '',
        item.precioUnitario,
        ubicacion?.ciudad || 'Sin ubicación',
        item.presentacion || ''
      );
    }));

    return compraId;
  },
  async getAllCompras() { return db.compras.orderBy('fecha').reverse().toArray(); },
  async getCompraById(id) {
    const compra = await db.compras.get(id);
    const detalle = await db.detalle_compra.where('compraId').equals(id).toArray();
    const items = [];
    for (const item of detalle) {
      const producto = await db.productos.get(item.productoId);
      items.push({ ...item, producto });
    }
    return { ...compra, items };
  },
  async getComprasByMonth(year, month) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    return db.compras.where('fecha').between(start, end).toArray();
  },
  async getStatsByMonth(year, month) {
    const compras = await this.getComprasByMonth(year, month);
    const total = compras.reduce((sum, c) => sum + c.total, 0);
    return {
      total,
      promedio: compras.length > 0 ? total / compras.length : 0,
      numCompras: compras.length,
      compras
    };
  },
  async getStatsByWeek() {
    const now = new Date();
    const diaSemana = now.getDay();
    const diasDesdeLunes = diaSemana === 0 ? 6 : diaSemana - 1;
    const lunes = new Date(now);
    lunes.setDate(now.getDate() - diasDesdeLunes);
    lunes.setHours(0, 0, 0, 0);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);

    const compras = await db.compras.where('fecha').between(lunes, domingo).toArray();

    // Contar artículos comprados en paralelo
    let totalArticulos = 0;
    const detallesPromises = compras.map(c => db.detalle_compra.where('compraId').equals(c.id).toArray());
    const detallesList = await Promise.all(detallesPromises);
    for (const detalle of detallesList) {
      totalArticulos += detalle.reduce((sum, d) => sum + d.cantidad, 0);
    }

    const total = compras.reduce((sum, c) => sum + c.total, 0);
    return {
      total,
      promedio: compras.length > 0 ? total / compras.length : 0,
      numCompras: compras.length,
      totalArticulos,
      compras,
      semana: `${lunes.getDate()} - ${domingo.getDate()} ${domingo.toLocaleString('es', { month: 'short' })}`
    };
  },

  // ============ PRECIOS ============
  async addPrecio(productoId, tienda, marca, precio, ciudad, presentacion) {
    return db.precios.add({
      productoId, tienda, marca, precio, ciudad,
      presentacion: presentacion || '',
      fecha: new Date()
    });
  },
  async getPreciosRecientes(dias) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    const precios = await db.precios.where('fecha').above(fechaLimite).toArray();
    // Enriquecer con datos de producto
    const resultado = [];
    for (const p of precios) {
      const producto = await db.productos.get(p.productoId);
      resultado.push({ ...p, producto });
    }
    return resultado;
  },
  async getPreciosByProducto(productoId) {
    return db.precios.where('productoId').equals(productoId).toArray();
  },

  // Obtener rango de precios (min, max, último)
  async getRangoPrecios(productoId) {
    const precios = await db.precios.where('productoId').equals(productoId).toArray();
    if (precios.length === 0) return null;
    const sorted = precios.sort((a, b) => a.precio - b.precio);
    return {
      min: sorted[0].precio,
      max: sorted[sorted.length - 1].precio,
      ultimo: precios[precios.length - 1]
    };
  },

  // Obtener marcas usadas para un producto
  async getMarcasByProducto(productoId) {
    const precios = await db.precios.where('productoId').equals(productoId).toArray();
    return [...new Set(precios.map(p => p.marca).filter(Boolean))];
  },

  // Obtener tiendas usadas para un producto
  async getTiendasByProducto(productoId) {
    const precios = await db.precios.where('productoId').equals(productoId).toArray();
    return [...new Set(precios.map(p => p.tienda).filter(Boolean))];
  },

  // Obtener comparativa por tienda, marca y presentación
  async getComparativaByProducto(productoId) {
    const precios = await db.precios.where('productoId').equals(productoId).toArray();
    if (precios.length === 0) return [];

    // Filtrar outliers (precios 3x mayor que la media)
    const media = precios.reduce((a, b) => a + b.precio, 0) / precios.length;
    const preciosFiltrados = precios.filter(p => p.precio <= media * 3 && p.precio > 0);

    const agrupado = {};
    for (const p of preciosFiltrados) {
      // Agrupar por tienda, marca Y presentación
      const presentacion = p.presentacion || '';
      const key = `${p.tienda} - ${p.marca || 'Sin marca'}${presentacion ? ' (' + presentacion + ')' : ''}`;
      if (!agrupado[key]) agrupado[key] = [];
      agrupado[key].push(p.precio);
    }

    return Object.entries(agrupado).map(([key, lista]) => ({
      tiendaMarca: key,
      promedio: lista.reduce((a, b) => a + b, 0) / lista.length,
      min: Math.min(...lista),
      max: Math.max(...lista),
      compras: lista.length
    })).sort((a, b) => a.promedio - b.promedio);
  },

  // ============ UBICACIÓN ============
  async getUbicacion() {
    return db.ubicacion.where('activa').equals(1).first() || null;
  },
  async setUbicacion(ciudad, region) {
    await db.ubicacion.where('activa').equals(1).modify({ activa: 0 });
    return db.ubicacion.add({
      ciudad, region,
      fechaObtenida: new Date(),
      activa: 1
    });
  },
  async getCiudadFromCoords(lat, lon) {
    try {
      // Intentar con diferentes niveles de zoom para mejor precisión
      // Agregamos email para cumplir con las políticas de Nominatim y evitar bloqueos
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&email=hola@midespensita.com`
      );
      if (!response.ok) throw new Error('Nominatim falló');
      const data = await response.json();

      // Buscar ciudad en diferentes campos
      const ciudad = data.address?.city ||
                     data.address?.town ||
                     data.address?.village ||
                     data.address?.municipality ||
                     data.address?.county ||
                     'Desconocida';

      const region = data.address?.state || '';
      const pais = data.address?.country || '';
      const codigoPostal = data.address?.postcode || '';

      return { ciudad, region, pais, codigoPostal };
    } catch (error) {
      return { ciudad: 'Sin ubicación', region: '', pais: '', codigoPostal: '' };
    }
  },

  // Obtener ubicación - muestra la última conocida inmediatamente
  async detectarUbicacion() {
    const existente = await this.getUbicacion();

    // Mostrar última ubicación conocida
    if (existente) {
      // Verificar en segundo plano si cambió
      this.verificarCambioUbicacion();
      return existente;
    }

    // Primera vez - intentar detectar automáticamente
    return this.detectarAutomaticamente();
  },

  // Intentar detectar ubicación automáticamente
  async detectarAutomaticamente() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        this.detectarPorIP().then(resolve);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { ciudad, region } = await this.getCiudadFromCoords(
            position.coords.latitude,
            position.coords.longitude
          );
          if (ciudad && ciudad !== 'Desconocida' && ciudad !== 'Sin ubicación') {
            await this.setUbicacion(ciudad, region);
            resolve({ ciudad, region });
          } else {
            // Si la geolocalización no da buena ciudad, usar IP
            this.detectarPorIP().then(resolve);
          }
        },
        () => {
          // Si falla, intentar detectar por IP
          this.detectarPorIP().then(resolve);
        },
        { timeout: 12000, maximumAge: 86400000 }
      );
    });
  },

  async detectarPorIP() {
    // Intentar con varios servicios más fiables
    const servicios = [
      { url: 'https://ipwho.is/', parse: (d) => ({ ciudad: d.city, region: d.region }) },
      { url: 'https://ipinfo.io/json', parse: (d) => ({ ciudad: d.city, region: d.region }) },
      { url: 'https://freeipapi.com/api/json', parse: (d) => ({ ciudad: d.cityName, region: d.regionName }) },
      { url: 'https://ipapi.co/json/', parse: (d) => ({ ciudad: d.city, region: d.region }) }
    ];

    for (const servicio of servicios) {
      try {
        const response = await fetch(servicio.url);
        if (!response.ok) continue;
        const data = await response.json();
        if (servicio.parse && (data.city || data.cityName)) {
          const ubicacion = servicio.parse(data);
          if (ubicacion.ciudad) {
            await this.setUbicacion(ubicacion.ciudad, ubicacion.region);
            return ubicacion;
          }
        }
      } catch (e) {
        console.log('Falló proveedor de IP:', servicio.url);
      }
    }
    return { ciudad: 'Sin ubicación', region: '' };
  },

  // Verificar cambio de ubicación en segundo plano
  async verificarCambioUbicacion() {
    // Esperar 30 segundos antes de verificar
    setTimeout(async () => {
      try {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const nuevaUbicacion = await this.getCiudadFromCoords(
              position.coords.latitude,
              position.coords.longitude
            );
            const ubicacionActual = await this.getUbicacion();

            // Solo actualizar si cambió la ciudad
            if (ubicacionActual && nuevaUbicacion.ciudad !== ubicacionActual.ciudad) {
              await this.setUbicacion(nuevaUbicacion.ciudad, nuevaUbicacion.region);
              // Actualizar el header directamente (evitar reload que borra el estado)
              const headerEl = document.getElementById('ubicacion-header');
              if (headerEl) headerEl.textContent = nuevaUbicacion.ciudad;
            }
          },
          () => {}, // Ignorar errores en segundo plano
          { timeout: 10000, maximumAge: 300000 } //缓5 minutos
        );
      } catch (e) {}
    }, 30000);
  },



  // ============ AUTOCOMPLETAR ============
  async getMarcasSugeridas(query) {
    if (!query || query.length < 2) return [];
    // Consultar solo las marcas directamente, sin cargar toda la tabla
    const todasLasMarcas = await db.precios
      .orderBy('marca')
      .uniqueKeys();
    return todasLasMarcas
      .filter(m => m && m.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  },
  async getTiendasSugeridas(query) {
    if (!query || query.length < 2) return [];
    // Consultar solo las tiendas directamente, sin cargar toda la tabla
    const todasLasTiendas = await db.precios
      .orderBy('tienda')
      .uniqueKeys();
    return todasLasTiendas
      .filter(t => t && t.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }
};
