/* ARCADIA service worker.
   RULE: bump CACHE on EVERY commit that touches docs/games/** —
   cache-first serves stale files forever otherwise. */

const CACHE = 'beben-arcade-v38';

/* Every page, card icon and hero the app can show offline. Both app icons the
   page itself references are here too. The 512px and maskable app icons are
   NOT precached: only the OS install surface fetches them, they are never
   painted by a page, and together they are ~210KB of dead cache weight. */
const PRECACHE = [
    './',
    './arcade.css',
    './arcade.js',
    './manifest.webmanifest',
    './fonts/press-start-2p.woff2',
    './art/skatepark-day.webp',
    './art/skatepark-night.webp',
    './art/blockfall-terraces.webp',
    './icons/icon-192.png',
    './icons/apple-touch-icon-180.png',
    './icons/hero-01.webp',
    './icons/hero-02.webp',
    './icons/hero-03.webp',
    './icons/hero-mobile-01.webp',
    './icons/hero-mobile-02.webp',
    './icons/games/snake.webp',
    './icons/games/2048.webp',
    './icons/games/blockfall.webp',
    './icons/games/brick-bash.webp',
    './icons/games/wingbeat.webp',
    './icons/games/pixel-dash.webp',
    './icons/games/skystack.webp',
    './icons/games/paddle-duel.webp',
    './icons/games/star-swarm.webp',
    './icons/games/sudoku.webp',
    './icons/games/four-in-a-row.webp',
    './icons/games/five-letter.webp',
    './icons/games/dune-surf.webp',
    './icons/games/safari-hop.webp',
    './icons/games/pocket-putt.webp',
    './icons/games/void-dodger.webp',
    './icons/games/maze-muncher.webp',
    './icons/games/hop-across.webp',
    './icons/games/wave-rider.webp',
    './icons/games/solitaire.webp',
    './icons/games/checkers.webp',
    './icons/games/chess.webp',
    './2048/',
    './snake/',
    './blockfall/',
    './brick-bash/',
    './wingbeat/',
    './pixel-dash/',
    './skystack/',
    './paddle-duel/',
    './star-swarm/',
    './sudoku/',
    './four-in-a-row/',
    './five-letter/',
    './dune-surf/',
    './safari-hop/',
    './super-hop/',
    './pocket-putt/',
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
