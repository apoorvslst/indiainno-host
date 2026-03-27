const CACHE_NAME = 'civicsync-v1';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
];

// Install: cache shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch: Network-first for API, Cache-first for static
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET
    if (request.method !== 'GET') return;

    // API calls: network only (don't cache dynamic data)
    if (request.url.includes('/api/')) return;

    event.respondWith(
        caches.match(request).then(async (cached) => {
            if (cached) {
                // Return cached version immediately, but fetch in background to update
                fetch(request).then(response => {
                    if (response.ok && request.url.startsWith('http')) {
                        caches.open(CACHE_NAME).then(cache => cache.put(request, response));
                    }
                }).catch(() => { });
                return cached;
            }

            try {
                const response = await fetch(request);
                if (response.ok && request.url.startsWith('http')) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            } catch (err) {
                // If network fails and no direct cache, fallback to index for SPA navigation
                if (request.mode === 'navigate') {
                    return caches.match('/');
                }
                return Response.error();
            }
        })
    );
});
