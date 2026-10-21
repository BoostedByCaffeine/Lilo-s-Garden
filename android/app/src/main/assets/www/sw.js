const CACHE_NAME = 'lilos-garden-pwa-v24';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './assets/css/tailwind.min.css',
  './assets/fonts/fonts.css',
  './assets/vendor/tailwindcss.js',
  './app.js',
  './manifest.json',
  './favicon.png',
  './assets/studiologo.svg',
  './assets/bgm/Cats In The Cold - Mage Tears (Instrumental).ogg',
  './assets/bgm/Mage tears - Sun and moonInstrumental.ogg',
  './assets/sfx/newsfx/catpurr.wav',
  './assets/sfx/newsfx/rainsfx.wav',
  './assets/sfx/newsfx/meow1.wav',
  './assets/sfx/newsfx/meow2.wav',
  './assets/sfx/newsfx/meow3.wav',
  './assets/sfx/newsfx/meow4.wav',
  './assets/sfx/newsfx/meow5.wav',
  './assets/sfx/newsfx/meow6.wav',
  './assets/sfx/newsfx/meow7.wav',
  './assets/sfx/newsfx/meow8.wav',
  './assets/sfx/newsfx/meow9.wav',
  './assets/sfx/meow-lilo.wav',
  './assets/sfx/meow-cheeto.wav',
  './assets/sfx/purr.wav',
  './assets/sfx/rain.wav',
  './assets/lilo.jpg',
  './assets/cheeto.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/fonts/Stardew_Valley.ttf',
  './assets/fonts/Stardew_Valley.otf',
  './assets/fonts/PressStart2P-Regular.ttf',
  './assets/fonts/Quicksand-Medium.ttf',
  './assets/fonts/Quicksand-SemiBold.ttf',
  './assets/fonts/Quicksand-Bold.ttf',
  './assets/sprites/tileSprite/1 Tiles/FieldsTile_38.png',
  './assets/sprites/tileSprite/2 Objects/7 Decor/Tree1.png',
  './assets/sprites/tileSprite/2 Objects/9 Bush/1.png',
  './assets/sprites/tileSprite/2 Objects/9 Bush/2.png',
  './assets/sprites/tileSprite/2 Objects/9 Bush/3.png',
  './assets/sprites/tileSprite/2 Objects/9 Bush/4.png',
  './assets/sprites/tileSprite/2 Objects/4 Stone/7.png',
  './assets/sprites/tileSprite/2 Objects/4 Stone/8.png',
  './assets/sprites/tileSprite/2 Objects/5 Grass/1.png',
  './assets/sprites/tileSprite/2 Objects/5 Grass/2.png',
  './assets/sprites/tileSprite/2 Objects/5 Grass/3.png',
  './assets/sprites/tileSprite/2 Objects/5 Grass/4.png',
  './assets/sprites/tileSprite/2 Objects/5 Grass/5.png',
  './assets/sprites/tileSprite/2 Objects/5 Grass/6.png',
  './assets/sprites/tileSprite/2 Objects/6 Flower/1.png',
  './assets/sprites/tileSprite/2 Objects/6 Flower/2.png',
  './assets/sprites/tileSprite/2 Objects/6 Flower/3.png',
  './assets/sprites/tileSprite/2 Objects/6 Flower/4.png',
  './assets/sprites/tileSprite/2 Objects/6 Flower/5.png',
  './assets/sprites/tileSprite/2 Objects/6 Flower/6.png',
  './assets/sprites/tileSprite/2 Objects/6 Flower/7.png',
  './assets/sprites/tileSprite/2 Objects/6 Flower/8.png',
  './assets/sprites/tileSprite/2 Objects/6 Flower/9.png',
  './assets/sprites/tileSprite/2 Objects/6 Flower/10.png',
  './assets/sprites/tileSprite/2 Objects/6 Flower/11.png',
  './assets/sprites/tileSprite/2 Objects/6 Flower/12.png',
  './assets/sprites/tileSprite/2 Objects/7 Decor/Lamp1.png',
  './assets/sprites/tileSprite/2 Objects/7 Decor/Log1.png',
  './assets/sprites/tileSprite/3 Animated Objects/2 Campfire/2.png',
  './assets/sprites/tileSprite/3 Animated Objects/2 Campfire/1.png',
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
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
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