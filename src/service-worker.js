// service-worker.js
// Enhanced service worker to help with auth persistence and browser compatibility

const CACHE_NAME = 'theta-tau-voting-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/auth.html',
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

// Cache-first strategy for static assets, network-first for everything else
self.addEventListener('fetch', event => {
  // Skip cross-origin requests, Firebase auth requests, and analytics
  if (!event.request.url.startsWith(self.location.origin) ||
      event.request.url.includes('firebaseapp.com/auth') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('gstatic.com') ||
      event.request.url.includes('google') ||
      event.request.url.includes('firebase') ||
      event.request.url.includes('analytics')) {
    return;
  }

  // For HTML requests (navigation), use network with cache fallback
  if (event.request.mode === 'navigate' || 
      (event.request.method === 'GET' && 
       event.request.headers.get('accept').includes('text/html'))) {
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response to store in cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              if (responseToCache.status === 200) {
                cache.put(event.request, responseToCache);
              }
            });
          return response;
        })
        .catch(() => {
          console.log('[Service Worker] Serving cached HTML fallback');
          return caches.match(event.request)
            .then(cachedResponse => {
              return cachedResponse || caches.match('/index.html');
            });
        })
    );
    return;
  }

  // For all other requests, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return the cached response
          return cachedResponse;
        }
        
        // If not in cache, get from network
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Clone the response to store in cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          })
          .catch(err => {
            console.error('[Service Worker] Fetch error:', err);
            // Return a simple offline response for API requests
            if (event.request.url.includes('/api/')) {
              return new Response(JSON.stringify({ 
                error: 'You are offline',
                offline: true 
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            }
          });
      })
  );
});

// Handle authentication messages
self.addEventListener('message', event => {
  if (event.data) {
    // Clear cache if requested by the application
    if (event.data.type === 'CLEAR_CACHE') {
      console.log('[Service Worker] Clearing cache by request');
      caches.delete(CACHE_NAME).then(() => {
        clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_CLEARED',
              timestamp: Date.now()
            });
          });
        });
      });
    }
    
    // Handle auth state messages
    if (event.data.type === 'AUTH_STATE_CHANGE') {
      console.log('[Service Worker] Auth state changed:', event.data.state);
      
      // Relay auth state to all clients
      clients.matchAll().then(clients => {
        clients.forEach(client => {
          if (client.id !== event.source.id) {
            client.postMessage({
              type: 'AUTH_STATE_UPDATE',
              state: event.data.state,
              timestamp: Date.now()
            });
          }
        });
      });
    }
  }
});