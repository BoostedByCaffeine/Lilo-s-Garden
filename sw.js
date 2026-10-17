const CACHE_NAME = 'lilos-garden-pwa-v10';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './favicon.png',
  './assets/lilo.jpg',
  './assets/cheeto.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/fonts/Stardew_Valley.ttf',
  './assets/fonts/Stardew_Valley.otf',
  './assets/interior/Individual/Bedside Table.png',
  './assets/interior/Individual/Book.png',
  './assets/interior/Individual/bookcase.png',
  './assets/interior/Individual/Box.png',
  './assets/interior/Individual/Box2.png',
  './assets/interior/Individual/carpet.png',
  './assets/interior/Individual/Chair1side.png',
  './assets/interior/Individual/Chair2side.png',
  './assets/interior/Individual/ChairBside.png',
  './assets/interior/Individual/ChairF.png',
  './assets/interior/Individual/coat stand.png',
  './assets/interior/Individual/DoubleBed.png',
  './assets/interior/Individual/Lamp.png',
  './assets/interior/Individual/Lampoff.png',
  './assets/interior/Individual/minidecoflower.png',
  './assets/interior/Individual/mirror.png',
  './assets/interior/Individual/sofa 1side.png',
  './assets/interior/Individual/sofa 2side.png',
  './assets/interior/Individual/Table.png',
  './assets/interior/Individual/tablebig.png',
  './assets/interior/Individual/vaseflower.png',
  './assets/interior/Individual/wardrobe.png',
  './assets/interior/Individual/window.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        CORE_ASSETS.map((url) =>
          fetch(encodeURI(url)).then((response) => {
            if (response.ok) {
              return cache.put(encodeURI(url), response);
            }
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.hostname.includes('open-meteo.com')) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(JSON.stringify({ offline: true }), {
            headers: { 'Content-Type': 'application/json' }
          })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});