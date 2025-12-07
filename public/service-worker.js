const CACHE_NAME = 'barber-agenda-v11';
const ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/css/output.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/api_client.js',
    '/manifest.json'
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
    // Network first for API
    if (event.request.url.includes('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Stale-while-revalidate for other assets (try cache, but update in background? 
    // Or just Cache First as before? User wants "update everything". 
    // Let's stick to Cache First but with the new version, it will re-cache everything on install.)

    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
