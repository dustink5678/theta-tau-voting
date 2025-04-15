// service-worker.js - Simplified version
const CACHE_NAME = 'theta-tau-voting-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/index-*.js',
  '/assets/index-*.css',
  '/assets/logo-*.png'
];

// Install service worker and cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[Service Worker] Install error:', err);
      })
  );
  // Force activation without waiting for existing service workers to be removed
  self.skipWaiting();
});

// Clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[Service Worker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Very simple fetch handler that ignores all Firebase/auth requests
self.addEventListener('fetch', event => {
  // Skip all auth, Firebase, and other API requests
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('google') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('gstatic.com') ||
      event.request.url.includes('auth')) {
    return;
  }

  // Simple cache-first strategy for assets
  if (event.request.destination === 'script' ||
      event.request.destination === 'style' ||
      event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          return cachedResponse || fetch(event.request);
        })
    );
    return;
  }

  // For HTML requests, use network-first approach
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }
});