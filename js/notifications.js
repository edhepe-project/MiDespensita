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

  // Enviar notificación
  async enviar(titulo, mensaje, options = {}) {
    // SIEMPRE mostrar alerta en la app (funciona en todos lados)
    this.mostrarAlertaEnApp(titulo, mensaje);

    // Intentar notificación del sistema también
    const tienePermiso = await this.solicitarPermiso();
    if (tienePermiso) {
      try {
        const basePath = window.location.pathname.includes('/MiDespensita') ? '/MiDespensita' : '';
        new Notification(titulo, {
          body: mensaje,
          icon: `${basePath}/icons/icon-192.png`,
          badge: `${basePath}/icons/icon-192.png`,
          vibrate: [200, 100, 200],
          tag: 'midespensita-' + Date.now()
        });
      } catch (e) {}
    }

    // Actualizar badge
    const badge = document.getElementById('notif-badge');
    if (badge) {
      const actual = parseInt(badge.textContent) || 0;
      badge.textContent = actual + 1;
      badge.classList.add('visible');
    }

    return true;
  },

  // Mostrar alerta dentro de la app (siempre funciona)
  mostrarAlertaEnApp(titulo, mensaje) {
    // Cerrar alertas anteriores
    document.querySelectorAll('.app-alerta').forEach(a => a.remove());

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

    setTimeout(() => {
      if (alerta.parentElement) alerta.remove();
    }, 6000);
  },

  // Verificar ofertas
  async verificarOfertas() {
    const ubicacion = await APP_DB.getUbicacion();
    if (!ubicacion?.ciudad) return;

    try {
      const response = await fetch(`${APP_Sync.SERVER_URL}/api/precios/${encodeURIComponent(ubicacion.ciudad)}`);
      const data = await response.json();

      if (data.precios && data.precios.length > 0) {
        const ofertas = data.precios.filter(p => p.num_muestras >= 2);

        if (ofertas.length > 0) {
          const mejorOferta = ofertas[0];
          this.enviar(
            '¡Ofertas en ' + ubicacion.ciudad + '!',
            `${mejorOferta.producto_nombre} - ${mejorOferta.tienda} a $${mejorOferta.precio_promedio.toFixed(2)}`
          );
        }
      }
    } catch (e) {}
  },

  // Iniciar verificación
  iniciar() {
    setInterval(() => this.verificarOfertas(), 60 * 60 * 1000);
    setTimeout(() => this.verificarOfertas(), 60000);
  }
};
