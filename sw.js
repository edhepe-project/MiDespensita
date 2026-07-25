const CACHE_NAME = 'midespensita-v2';

// Rutas relativas para funcionar en GitHub Pages
const BASE_URL = self.location.pathname.replace(/\/[^/]*$/, '/');
const ASSETS = [
  BASE_URL,
  BASE_URL + 'index.html',
  BASE_URL + 'css/styles.css',
  BASE_URL + 'js/init.js',
  BASE_URL + 'js/app.js',
  BASE_URL + 'js/db.js',
  BASE_URL + 'js/sync.js',
  BASE_URL + 'js/components/comprar.js',
  BASE_URL + 'js/components/productos.js',
  BASE_URL + 'js/components/precios.js',
  BASE_URL + 'js/components/comparar_semanas.js',
  BASE_URL + 'js/components/predicciones.js',
  BASE_URL + 'js/utils/format.js',
  BASE_URL + 'js/utils/constants.js',
  BASE_URL + 'js/utils/units.js',
  BASE_URL + 'js/utils/longpress.js',
  BASE_URL + 'icons/icon.svg',
  BASE_URL + 'icons/icon-192.png',
  BASE_URL + 'icons/icon-512.png',
  BASE_URL + 'manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => caches.match(BASE_URL + 'index.html'))
  );
});
