const CACHE_NAME = 'barber-agenda-v13';
const ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/css/output.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/api_client.js',
    '/manifest.json',
    '/assets/icon-192.png',
    '/assets/icon-512.png'
];

self.addEventListener('install', (event) => {
    // Force this service worker to become the active service worker
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    // Claim any clients immediately, so they don't wait for a reload
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API Strategy: Network First, falling back to Cache
    if (url.pathname.startsWith('/api/')) {
        // Only cache GET requests
        if (event.request.method === 'GET') {
            event.respondWith(
                fetch(event.request)
                    .then((response) => {
                        // Clone and cache the valid response
                        if (response.ok) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Network failed, try cache
                        return caches.match(event.request);
                    })
            );
        } else {
            // Non-GET requests (POST, PUT, DELETE) - just fetch, client handles error
            event.respondWith(fetch(event.request));
        }
        return;
    }

    // Static Assets Strategy: Stale-While-Revalidate
    // Serve from cache immediately, then update cache in background
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                const fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse.ok) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, networkResponse.clone());
                            });
                        }
                        return networkResponse;
                    })
                    .catch((err) => {
                        // Network failed, nothing to update
                        // console.log('Fetch failed, keeping cache', err);
                    });

                return cachedResponse || fetchPromise;
            })
    );
});
