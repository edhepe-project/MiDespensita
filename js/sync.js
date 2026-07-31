// Sincronización con servidor
window.APP_Sync = {
  SERVER_URL: 'https://midespensita-api.onrender.com',

  // Obtener o crear usuario
  async getUsuario() {
    let usuario = localStorage.getItem('midespensita_usuario');
    if (usuario) return JSON.parse(usuario);

    // Crear nuevo usuario
    const ubicacion = await APP_DB.getUbicacion();
    try {
      const response = await fetch(`${this.SERVER_URL}/api/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciudad: ubicacion?.ciudad || 'Desconocida',
          region: ubicacion?.region || ''
        })
      });
      const data = await response.json();
      localStorage.setItem('midespensita_usuario', JSON.stringify(data));
      return data;
    } catch (e) {
      return null;
    }
  },

  // Sincronizar precios con servidor
  async syncPrecios() {
    try {
      const usuario = await this.getUsuario();
      if (!usuario) return;

      // Obtener precios locales recientes (últimos 30 días)
      const precios = await APP_DB.getPreciosRecientes(30);

      // Filtrar los que ya se enviaron
      const lastSync = localStorage.getItem('midespensita_last_sync');
      const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);
      const nuevosPrecios = precios.filter(p => new Date(p.fecha) > lastSyncDate);

      if (nuevosPrecios.length === 0) return;

      // Preparar datos para enviar
      const preciosParaEnviar = nuevosPrecios.map(p => ({
        producto: p.producto?.nombre || 'Desconocido',
        categoria: p.producto?.categoria || 'otros',
        unidad: p.producto?.unidad || 'pieza',
        tienda: p.tienda,
        marca: p.marca,
        presentacion: p.presentacion,
        precio: p.precio,
        fecha: p.fecha
      }));

      // Enviar al servidor
      const response = await fetch(`${this.SERVER_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuario.id,
          ciudad: usuario.ciudad,
          precios: preciosParaEnviar
        })
      });

      const result = await response.json();
      if (result.success) {
        localStorage.setItem('midespensita_last_sync', new Date().toISOString());
      }
      console.log(`Sync completado: ${result.guardados} precios enviados`);
      return result;
    } catch (e) {
      console.log('Error en sync:', e.message);
    }
  },

  // Obtener precios promedio de mi ciudad
  async getPreciosCiudad(ciudad) {
    try {
      const response = await fetch(`${this.SERVER_URL}/api/precios/${encodeURIComponent(ciudad)}`);
      return await response.json();
    } catch (e) {
      return { precios: [] };
    }
  },

  // Obtener estadísticas de mi ciudad
  async getEstadisticas(ciudad) {
    try {
      const response = await fetch(`${this.SERVER_URL}/api/estadisticas/${encodeURIComponent(ciudad)}`);
      return await response.json();
    } catch (e) {
      return null;
    }
  },

  // Sync automático (llamar periódicamente)
  async syncAutomatico() {
    // Sync cada 5 minutos si hay internet
    setInterval(async () => {
      if (navigator.onLine) {
        await this.syncPrecios();
        await this.syncFamilia();
      }
    }, 5 * 60 * 1000);

    // Sync inicial después de 30 segundos
    setTimeout(async () => {
      if (navigator.onLine) {
        await this.syncPrecios();
        await this.syncFamilia();
      }
    }, 30000);
  },

  // ============ LISTA FAMILIAR COMPARTIDA ============

  // Obtener el código activo (propio o ajeno)
  getCodigoFamilia() {
    return localStorage.getItem('midespensita_familia_codigo_propio') ||
      localStorage.getItem('midespensita_familia_codigo_ajeno') ||
      null;
  },

  // Crear o recuperar la lista compartida del dueño
  async crearListaFamiliar() {
    try {
      const usuario = await this.getUsuario();
      if (!usuario) return null;
      const response = await fetch(`${this.SERVER_URL}/api/familia/crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: usuario.id })
      });
      const data = await response.json();
      if (data.codigo) {
        localStorage.setItem('midespensita_familia_codigo_propio', data.codigo);
        localStorage.setItem('midespensita_familia_expira', data.expira_en);
      }
      return data;
    } catch (e) {
      console.log('Error creando lista familiar:', e.message);
      return null;
    }
  },

  // Unirse a la lista de un familiar con su código
  async unirseALista(codigo) {
    try {
      const usuario = await this.getUsuario();
      if (!usuario) return { error: 'Sin conexión al servidor' };
      const response = await fetch(`${this.SERVER_URL}/api/familia/unirse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigo.toLowerCase().trim(), usuario_id: usuario.id })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('midespensita_familia_codigo_ajeno', codigo.toLowerCase().trim());
      }
      return data;
    } catch (e) {
      return { error: 'Sin conexión a internet' };
    }
  },

  // Obtener toda la lista compartida del servidor
  async getListaFamiliar() {
    const codigo = this.getCodigoFamilia();
    if (!codigo) return null;
    try {
      const response = await fetch(`${this.SERVER_URL}/api/familia/${codigo}/lista`);
      if (!response.ok) return null;
      const data = await response.json();
      // Guardar en caché local para modo offline
      localStorage.setItem('midespensita_lista_familiar_cache', JSON.stringify(data.items || []));
      return data.items || [];
    } catch (e) {
      // Sin internet: usar caché
      const cache = localStorage.getItem('midespensita_lista_familiar_cache');
      return cache ? JSON.parse(cache) : null;
    }
  },

  // Agregar ítem a la lista compartida
  async agregarItemLista(nombreProducto, cantidad = 1) {
    const codigo = this.getCodigoFamilia();
    if (!codigo) return { error: 'Sin lista familiar activa' };
    try {
      const usuario = await this.getUsuario();
      const response = await fetch(`${this.SERVER_URL}/api/familia/${codigo}/lista`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_producto: nombreProducto,
          cantidad,
          agregado_por: localStorage.getItem('midespensita_nombre') || 'Tu familiar',
          usuario_id: usuario?.id || 'anonimo'
        })
      });
      return await response.json();
    } catch (e) {
      return { error: 'Sin conexión a internet' };
    }
  },

  // Marcar ítem como comprado/no comprado
  async marcarCompradoLista(itemId, comprado, compradoPor = '') {
    const codigo = this.getCodigoFamilia();
    if (!codigo) return;
    try {
      await fetch(`${this.SERVER_URL}/api/familia/${codigo}/lista/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comprado, comprado_por: compradoPor })
      });
    } catch (e) { }
  },

  // Borrar ítem de la lista compartida
  async borrarItemLista(itemId) {
    const codigo = this.getCodigoFamilia();
    if (!codigo) return;
    try {
      await fetch(`${this.SERVER_URL}/api/familia/${codigo}/lista/${itemId}`, { method: 'DELETE' });
    } catch (e) { }
  },

  // Limpiar items comprados (para nueva semana)
  async limpiarListaComprados() {
    const codigo = this.getCodigoFamilia();
    if (!codigo) return;
    try {
      await fetch(`${this.SERVER_URL}/api/familia/${codigo}/lista`, { method: 'DELETE' });
    } catch (e) { }
  },

  // Sincronizar lista familiar y disparar evento si cambió
  async syncFamilia() {
    const codigo = this.getCodigoFamilia();
    if (!codigo) return;
    const items = await this.getListaFamiliar();
    if (items !== null) {
      window.dispatchEvent(new CustomEvent('familia-lista-actualizada', { detail: { items } }));
    }
  }
};


