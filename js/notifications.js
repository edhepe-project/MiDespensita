// Sistema de notificaciones - MiDespensita
window.APP_Notifications = {
  // Solicitar permiso para notificaciones
  async solicitarPermiso() {
    if (!('Notification' in window)) {
      console.log('Este navegador no soporta notificaciones');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permiso = await Notification.requestPermission();
      return permiso === 'granted';
    }

    return false;
  },

  // Enviar notificación local
  async enviar(titulo, mensaje, options = {}) {
    const tienePermiso = await this.solicitarPermiso();

    if (tienePermiso) {
      // Ruta base para GitHub Pages
      const basePath = window.location.pathname.includes('/MiDespensita') ? '/MiDespensita' : '';

      const notificacion = new Notification(titulo, {
        body: mensaje,
        icon: `${basePath}/icons/icon-192.png`,
        badge: `${basePath}/icons/icon-192.png`,
        vibrate: [200, 100, 200],
        tag: options.tag || 'midespensita',
        ...options
      });

      notificacion.onclick = () => {
        window.focus();
        notificacion.close();
      };

      return true;
    }

    // Si no hay permiso, mostrar alerta en la app
    this.mostrarAlertaEnApp(titulo, mensaje);
    return false;
  },

  // Mostrar alerta dentro de la app
  mostrarAlertaEnApp(titulo, mensaje) {
    const alerta = document.createElement('div');
    alerta.className = 'app-alerta';
    alerta.innerHTML = `
      <div class="alerta-icono">🔔</div>
      <div class="alerta-contenido">
        <div class="alerta-titulo">${titulo}</div>
        <div class="alerta-mensaje">${mensaje}</div>
      </div>
      <button class="alerta-cerrar" onclick="this.parentElement.remove()">×</button>
    `;
    document.body.appendChild(alerta);

    // Auto-ocultar después de 5 segundos
    setTimeout(() => alerta.remove(), 5000);
  },

  // Verificar ofertas y enviar notificación
  async verificarOfertas() {
    const ubicacion = await APP_DB.getUbicacion();
    if (!ubicacion?.ciudad) return;

    try {
      const response = await fetch(`${APP_Sync.SERVER_URL}/api/precios/${encodeURIComponent(ubicacion.ciudad)}`);
      const data = await response.json();

      if (data.precios && data.precios.length > 0) {
        // Buscar precios bajos (menor al promedio)
        const ofertas = data.precios.filter(p => p.num_muestras >= 2);

        if (ofertas.length > 0) {
          const mejorOferta = ofertas[0];
          this.enviar(
            '¡Ofertas en ' + ubicacion.ciudad + '!',
            `${mejorOferta.producto_nombre} - ${mejorOferta.tienda} a $${mejorOferta.precio_promedio.toFixed(2)}`
          );

          // Actualizar badge
          const badge = document.getElementById('notif-badge');
          if (badge) {
            badge.textContent = ofertas.length;
            badge.classList.add('visible');
          }
        }
      }
    } catch (e) {}
  },

  // Iniciar verificación periódica
  iniciar() {
    // Verificar cada hora
    setInterval(() => this.verificarOfertas(), 60 * 60 * 1000);

    // Verificar después de 1 minuto
    setTimeout(() => this.verificarOfertas(), 60000);
  }
};
