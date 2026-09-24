/* ARCADIA service worker.
   RULE: bump CACHE on EVERY commit that touches docs/games/** —
   cache-first serves stale files forever otherwise. */

const CACHE = 'beben-arcade-v11';

const PRECACHE = [
    './',
    './arcade.css',
    './arcade.js',
    './manifest.webmanifest',
    './fonts/press-start-2p.woff2',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon-180.png',
    './icons/hero-01.webp',
    './icons/hero-02.webp',
    './icons/hero-03.webp',
    './icons/hero-mobile-01.webp',
    './icons/hero-mobile-02.webp',
    './icons/games/snake.png',
    './icons/games/2048.png',
    './icons/games/blockfall.png',
    './icons/games/brick-bash.png',
    './icons/games/wingbeat.png',
    './icons/games/mines.png',
    './icons/games/pixel-dash.png',
    './icons/games/skystack.png',
    './icons/games/paddle-duel.png',
    './icons/games/star-swarm.png',
    './icons/games/sudoku.png',
    './icons/games/four-in-a-row.png',
    './icons/games/rockfield.png',
    './icons/games/void-dodger.png',
    './icons/games/maze-muncher.png',
    './icons/games/hop-across.png',
    './icons/games/wave-rider.png',
    './icons/games/solitaire.png',
    './icons/games/checkers.png',
    './icons/games/chess.png',
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
    './four-in-a-row/',
    './rockfield/',
    './void-dodger/',
    './maze-muncher/',
    './hop-across/',
    './wave-rider/',
    './solitaire/',
    './checkers/',
    './chess/'
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
