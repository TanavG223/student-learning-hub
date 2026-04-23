const CACHE_NAME = 'learnhub-pwa-v2';
const PRECACHE_URLS = [
  './',
  './index.html',
  './dashboard.html',
  './groups.html',
  './login.html',
  './resources.html',
  './schedule.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './assets/learnhub-logo.svg',
  './assets/icons/learnhub-icon-180.png',
  './assets/icons/learnhub-icon-192.png',
  './assets/icons/learnhub-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

const networkFirst = (request) =>
  fetch(request)
    .then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    })
    .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')));

const cacheFirst = (request) =>
  caches.match(request).then((cached) => {
    const fetchPromise = fetch(request)
      .then((response) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      })
      .catch(() => cached);
    return cached || fetchPromise;
  });

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const { origin } = new URL(event.request.url);
  if (origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});
