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
  // La suscripción real se hace a través de APP_Push (push.js) desde Configuración.
  // Este método ya no usa llave VAPID hardcodeada para evitar errores en producción.
  async suscribir(registration) {
    // No hacer nada aquí; el flujo correcto es:
    // Configuración → Activar Notificaciones → APP_Push.activar()
    console.log('[Notif] Suscripción push manejada por APP_Push desde Configuración.');
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
    // Agregar al historial y UI (esto actualizará el badge también)
    this.agregarAHistorial(titulo, mensaje);

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

  // ---- Historial y UI Dropdown ----
  agregarAHistorial(titulo, mensaje) {
    let history = JSON.parse(localStorage.getItem('midespensita_notifs_hist') || '[]');
    history.unshift({ titulo, mensaje, fecha: new Date().toISOString(), leida: false });
    if (history.length > 20) history = history.slice(0, 20); // Guardar últimas 20
    localStorage.setItem('midespensita_notifs_hist', JSON.stringify(history));
    this.actualizarBadge();
    this.renderDropdown();
  },

  actualizarBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const history = JSON.parse(localStorage.getItem('midespensita_notifs_hist') || '[]');
    const unread = history.filter(n => !n.leida).length;
    if (unread > 0) {
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  },

  marcarLeidas() {
    let history = JSON.parse(localStorage.getItem('midespensita_notifs_hist') || '[]');
    history.forEach(n => n.leida = true);
    localStorage.setItem('midespensita_notifs_hist', JSON.stringify(history));
    this.actualizarBadge();
    this.renderDropdown();
  },

  // Eliminar una notificación por índice
  eliminarNotif(index) {
    let history = JSON.parse(localStorage.getItem('midespensita_notifs_hist') || '[]');
    history.splice(index, 1);
    localStorage.setItem('midespensita_notifs_hist', JSON.stringify(history));
    this.actualizarBadge();
    this.renderDropdown();
  },

  // Limpiar todo el historial
  limpiarHistorial() {
    localStorage.setItem('midespensita_notifs_hist', '[]');
    this.actualizarBadge();
    this.renderDropdown();
  },

  renderDropdown() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    const history = JSON.parse(localStorage.getItem('midespensita_notifs_hist') || '[]');
    if (history.length === 0) {
      list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">No hay notificaciones recientes</div>';
      return;
    }

    // Botón "Limpiar todo" al inicio
    const limpiarBtn = `
      <div style="padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: flex-end;">
        <button onclick="APP_Notifications.limpiarHistorial()" style="
          background: none; border: none; color: var(--text-muted); font-size: 12px;
          cursor: pointer; padding: 4px 8px; border-radius: 6px;
          transition: background 0.2s;
        " onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='none'">
          🗑️ Limpiar todo
        </button>
      </div>
    `;

    const items = history.map((n, index) => {
      const f = new Date(n.fecha);
      const fechaStr = f.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' - ' + f.toLocaleDateString();
      return `
        <div class="notif-item ${n.leida ? '' : 'unread'}" style="position: relative; padding-right: 36px;">
          <button onclick="APP_Notifications.eliminarNotif(${index})" title="Eliminar" style="
            position: absolute; top: 8px; right: 8px;
            background: none; border: none; cursor: pointer;
            color: var(--text-muted); font-size: 16px; line-height: 1;
            padding: 2px 6px; border-radius: 4px; transition: background 0.2s, color 0.2s;
          " onmouseover="this.style.background='var(--surface-2)'; this.style.color='var(--coral-600)';"
             onmouseout="this.style.background='none'; this.style.color='var(--text-muted)';">&#x2715;</button>
          <div class="notif-item-title">${n.titulo}</div>
          <div class="notif-item-body">${n.mensaje}</div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px; text-align: right;">${fechaStr}</div>
        </div>
      `;
    }).join('');

    list.innerHTML = limpiarBtn + items;
  },

  // Iniciar
  iniciar() {
    this.init();
    setInterval(() => this.verificarOfertas(), 60 * 60 * 1000);
    setTimeout(() => this.verificarOfertas(), 60000);

    // Escuchar mensajes del SW (Push entrantes)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PUSH_RECEIVED') {
          this.agregarAHistorial(event.data.title, event.data.body);
          this.mostrarAlertaEnApp(event.data.title, event.data.body);
        }
      });
    }

    // Inicializar UI
    this.actualizarBadge();
    this.renderDropdown();

    const btnNotif = document.getElementById('header-notif');
    const dropdown = document.getElementById('notif-dropdown');
    const btnCerrar = document.getElementById('btn-cerrar-notifs');

    if (btnNotif && dropdown) {
      btnNotif.addEventListener('click', () => {
        const isVisible = dropdown.style.display === 'flex';
        dropdown.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) {
          this.marcarLeidas();
        }
      });
    }

    if (btnCerrar && dropdown) {
      btnCerrar.addEventListener('click', () => {
        dropdown.style.display = 'none';
      });
    }
  }
};
