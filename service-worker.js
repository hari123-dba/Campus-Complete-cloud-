const CACHE_NAME = 'competehub-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event: Cache core assets and force activation
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate Event: Clean up old caches to ensure users get the latest version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network-first for navigation, Cache-first for assets
self.addEventListener('fetch', (event) => {
  // Navigation requests (HTML): Network first, fall back to cache
  // This ensures users always get the latest app shell if online
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets (JS, CSS, Images): Cache first, fall back to network
  // This ensures fast loading performance
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});