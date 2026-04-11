const CACHE_NAME = 'primewater-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/vite.svg'
];

self.addEventListener('install', (event) => {
    // Skip waiting to activate immediately
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    // Claim all clients immediately
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Ignore non-GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Bypass ALL localhost/dev requests entirely — do not intercept
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return;
    }

    // For navigation requests (like going to /dashboard), serve index.html
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match('/index.html').then((response) => {
                return response || fetch(event.request);
            }).catch(() => {
                return fetch(event.request);
            })
        );
        return;
    }

    // For other requests, try cache first, then network
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) return response;
            return fetch(event.request);
        }).catch(() => {
            // Silently fail for non-critical resources
            return new Response('', { status: 503, statusText: 'Offline' });
        })
    );
});
