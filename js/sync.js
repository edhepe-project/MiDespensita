// Sincronización con servidor
window.APP_Sync = {
  SERVER_URL: 'https://midespensita-api.onrender.com', // Cambiar por tu URL de servidor
  // SERVER_URL: 'http://localhost:3001', // Para desarrollo local

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

      if (precios.length === 0) return;

      // Preparar datos para enviar
      const preciosParaEnviar = precios.map(p => ({
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
      }
    }, 5 * 60 * 1000);

    // Sync inicial después de 30 segundos
    setTimeout(async () => {
      if (navigator.onLine) {
        await this.syncPrecios();
      }
    }, 30000);
  }
};
