const CACHE_NAME = 'midespensita-v13';

// Rutas relativas para GitHub Pages
const BASE_URL = self.location.pathname.replace(/\/[^/]*$/, '/');
const ASSETS = [
  BASE_URL,
  BASE_URL + 'index.html',
  BASE_URL + 'css/styles.css',
  BASE_URL + 'js/init.js',
  BASE_URL + 'js/app.js',
  BASE_URL + 'js/db.js',
  BASE_URL + 'js/dexie.min.js',
  BASE_URL + 'js/sync.js',
  BASE_URL + 'js/notifications.js',
  BASE_URL + 'js/components/comprar.js',
  BASE_URL + 'js/components/productos.js',
  BASE_URL + 'js/components/precios.js',
  BASE_URL + 'js/components/comparar_semanas.js',
  BASE_URL + 'js/components/predicciones.js',
  BASE_URL + 'js/components/config.js',
  BASE_URL + 'js/utils/format.js',
  BASE_URL + 'js/utils/constants.js',
  BASE_URL + 'js/utils/units.js',
  BASE_URL + 'js/utils/swipe.js',
  BASE_URL + 'js/utils/push.js',
  BASE_URL + 'icons/icon.svg',
  BASE_URL + 'icons/icon-192.png',
  BASE_URL + 'icons/icon-512.png',
  BASE_URL + 'manifest.json'
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});


// Fetch
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // No interceptar llamadas a la API del servidor
  if (url.includes('/api/')) return;

  // No cachear imágenes de dominios externos (Walmart, Sam's, La Comer, etc.)
  // Estas imágenes son pesadas (~150KB c/u) y se sirven desde CDN propio de cada tienda
  const esImagenExterna = (
    url.includes('walmartimages.com') ||
    url.includes('lacomer.com') ||
    url.includes('chedraui.com') ||
    url.includes('soriana.com') ||
    url.includes('bodegaaurrera') ||
    url.includes('img-proxy') ||  // proxy local de imágenes
    (event.request.destination === 'image' && !url.includes('github.io') && !url.includes('localhost'))
  );

  if (esImagenExterna) {
    // Las imágenes externas van directo a la red, sin pasar por el caché del SW
    event.respondWith(fetch(event.request).catch(() => {
      // Si falla (offline), devolver imagen transparente 1x1
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }));
    return;
  }

  // No cachear los archivos JSON de precios (se actualizan diariamente por los scrapers)
  // El browser HTTP cache y el ?d=fecha ya manejan esto eficientemente
  const esJsonDatos = (
    url.includes('ofertas_') ||
    url.includes('oferta_score') ||
    url.includes('tendencias.json')
  );

  if (esJsonDatos) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response('[]', { headers: { 'Content-Type': 'application/json' } })
    ));
    return;
  }

  // Para todo lo demás (JS, CSS, HTML, icons): Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Solo cachear respuestas exitosas de recursos estáticos propios
        if (response.ok && (url.includes('github.io') || url.includes('localhost'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      if (event.request.mode === 'navigate' ||
        (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
        return caches.match(BASE_URL + 'index.html');
      }
      return new Response('Offline resource not available', { status: 503 });
    })
  );
});


// Push Notification
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'MiDespensita';
  const options = {
    body: data.body || 'Tienes una notificación',
    icon: BASE_URL + 'icons/icon-192.png',
    badge: BASE_URL + 'icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.url || BASE_URL,
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  const promiseChain = Promise.all([
    self.registration.showNotification(title, options),
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        client.postMessage({
          type: 'PUSH_RECEIVED',
          title: title,
          body: options.body
        });
      }
    })
  ]);

  event.waitUntil(promiseChain);
});

// Click en notificación
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Si ya está abierto, enfocar
      for (const client of windowClients) {
        if (client.url.includes(BASE_URL) && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrir nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data || BASE_URL);
      }
    })
  );
});
