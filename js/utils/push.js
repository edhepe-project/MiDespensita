// ============================================================
// push.js - Manejo de Notificaciones Push en el lado cliente
// ============================================================

const APP_Push = (() => {
  const SERVER_URL = 'https://midespensita-api.onrender.com';

  // Convertir llave Base64 a Uint8Array (requerido por la API de PushManager)
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }

  return {
    // Verificar si el navegador es compatible con notificaciones
    esCompatible() {
      return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    },

    // Saber si el usuario ya tiene activadas las notificaciones
    async estaActivo() {
      if (!this.esCompatible()) return false;
      const perm = Notification.permission;
      if (perm !== 'granted') return false;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    },

    // Solicitar permiso y suscribir al servidor
    async activar(lista_codigo, usuario_id) {
      if (!this.esCompatible()) {
        return { error: 'Tu navegador no soporta notificaciones push' };
      }

      // 1. Pedir permiso al usuario
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        return { error: 'Permiso denegado por el usuario' };
      }

      try {
        // 2. Obtener llave pública del servidor
        const keyRes = await fetch(`${SERVER_URL}/api/notificaciones/vapid-public`);
        const { publicKey } = await keyRes.json();

        // 3. Registrar en PushManager con la llave pública
        const reg = await navigator.serviceWorker.ready;
        const suscripcion = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        // 4. Enviar la suscripción al servidor para guardarla
        const res = await fetch(`${SERVER_URL}/api/notificaciones/suscribir`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lista_codigo, usuario_id, suscripcion })
        });

        const data = await res.json();
        if (data.success) {
          localStorage.setItem('midespensita_push_activo', '1');
          return { success: true };
        }
        return { error: data.error || 'Error al suscribir' };
      } catch (e) {
        console.error('Error activando push:', e);
        return { error: e.message };
      }
    },

    // Desactivar / desuscribir
    async desactivar() {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      localStorage.removeItem('midespensita_push_activo');
    }
  };
})();
