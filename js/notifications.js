// Sistema de notificaciones - MiDespensita
window.APP_Notifications = {
  subscription: null,

  // Inicializar notificaciones
  async init() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications no soportadas');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await registration.pushManager.getSubscription();

      if (!this.subscription) {
        // Pedir permiso y suscribir
        const permiso = await Notification.requestPermission();
        if (permiso === 'granted') {
          await this.suscribir(registration);
        }
      }
    } catch (e) {
      console.log('Error inicializando notificaciones:', e);
    }
  },

  // Suscribir a push notifications
  async suscribir(registration) {
    try {
      // Generar clave VAPID (para producción usa una real)
      const applicationServerKey = this.urlBase64ToUint8Array(
        'BEl62iUYgUivxVkvT9BNJR37cBd9bQ0nPfWtHyVhNNJp2O9bMhJzHnRdJQ9v2pQ5oR7tY8uI9oP0aS'
      );

      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      console.log('Suscripción push exitosa');
    } catch (e) {
      console.log('Error en suscripción push:', e);
    }
  },

  // Convertir clave VAPID
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },

  // Solicitar permiso
  async solicitarPermiso() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permiso = await Notification.requestPermission();
      return permiso === 'granted';
    }
    return false;
  },

  // Enviar notificación
  async enviar(titulo, mensaje, options = {}) {
    // SIEMPRE mostrar alerta en la app
    this.mostrarAlertaEnApp(titulo, mensaje);

    // Intentar push notification
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

  // Alerta dentro de la app
  mostrarAlertaEnApp(titulo, mensaje) {
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

  // Iniciar
  iniciar() {
    this.init();
    setInterval(() => this.verificarOfertas(), 60 * 60 * 1000);
    setTimeout(() => this.verificarOfertas(), 60000);
  }
};
