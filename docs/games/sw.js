/* BEBEN ARCADE service worker.
   RULE: bump CACHE on EVERY commit that touches docs/games/** —
   cache-first serves stale files forever otherwise. */

const CACHE = 'beben-arcade-v5';

const PRECACHE = [
    './',
    './arcade.css',
    './arcade.js',
    './manifest.webmanifest',
    './fonts/press-start-2p.woff2',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon-180.png',
    './2048/',
    './snake/',
    './blockfall/',
    './brick-bash/',
    './wingbeat/',
    './mines/',
    './pixel-dash/',
    './skystack/',
    './paddle-duel/',
    './star-swarm/',
    './sudoku/',
    './four-in-a-row/'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => /^beben-arcade-/.test(key) && key !== CACHE)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    if (!url.pathname.startsWith('/games/')) return;

    event.respondWith(
        caches.match(req, { ignoreSearch: true }).then((hit) => {
            if (hit) return hit;
            return fetch(req).catch(() => {
                if (req.mode === 'navigate') return caches.match('./');
                return Response.error();
            });
        })
    );
});
