const CACHE_NAME = 'midespensita-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/init.js',
  '/js/app.js',
  '/js/db.js',
  '/js/components/comprar.js',
  '/js/components/productos.js',
  '/js/components/precios.js',
  '/js/components/comparar_semanas.js',
  '/js/components/predicciones.js',
  '/js/utils/format.js',
  '/js/utils/constants.js',
  '/js/utils/units.js',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/manifest.json'
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
    }).catch(() => caches.match('/index.html'))
  );
});
