/**
 * Service Worker para THE TIKI TAKA PWA
 * Habilita funcionamiento offline, caché de recursos estáticos y experiencia de app instalable.
 */

const CACHE_NAME = 'the-tiki-taka-cache-v2';

const STATIC_ASSETS = [
    '/',
    '/static/css/style.css',
    '/static/js/app.js',
    '/static/manifest.json',
    '/static/img/logo.png',
    '/static/img/icono.png',
    '/static/img/personaje.png',
    '/static/img/pelota.png',
    '/static/icons/icon-192.png',
    '/static/icons/icon-512.png',
    '/static/icons/icon-maskable.png',
    '/static/icons/icon.svg',
    '/static/icons/favicon.png',
    '/static/favicon.ico'
];

// Instalación: Precarga recursos esenciales
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activación: Limpia cachés antiguas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Intercepción de peticiones
self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // No cachear llamadas a API POST (partidas activas se validan en vivo si hay red)
    if (req.method !== 'GET') {
        event.respondWith(
            fetch(req).catch(() => {
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: 'Modo sin conexión. Conéctate a la red para registrar partidas en el servidor.'
                    }),
                    { headers: { 'Content-Type': 'application/json' } }
                );
            })
        );
        return;
    }

    // Estrategia Network-First para la página principal y endpoints GET de API
    if (url.pathname === '/' || url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(req)
                .then((networkRes) => {
                    if (networkRes && networkRes.status === 200) {
                        const copy = networkRes.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                    }
                    return networkRes;
                })
                .catch(() => {
                    return caches.match(req).then((cached) => {
                        if (cached) return cached;
                        if (url.pathname.startsWith('/api/records')) {
                            return new Response(JSON.stringify({ success: true, records: [] }), {
                                headers: { 'Content-Type': 'application/json' }
                            });
                        }
                        return caches.match('/');
                    });
                })
        );
        return;
    }

    // Estrategia Cache-First para recursos estáticos (CSS, JS, imágenes, fuentes)
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;

            return fetch(req)
                .then((networkRes) => {
                    if (networkRes && networkRes.status === 200) {
                        const copy = networkRes.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                    }
                    return networkRes;
                })
                .catch(() => {
                    // Si falla una imagen, responder algo vacío o fallback
                    if (req.destination === 'image') {
                        return caches.match('/static/icons/icon-192.png');
                    }
                });
        })
    );
});
