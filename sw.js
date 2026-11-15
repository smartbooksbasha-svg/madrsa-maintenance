/* Madrsa Maintenance Register — service worker (network-first, full offline)
   CACHE bump on every change. SHELL = must-have files, OPTIONAL = big extras
   (Urdu report font) cached in the background so install can never fail. */
const CACHE = 'mmr-v9';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './vendor/jspdf.umd.min.js',
  './vendor/jspdf.plugin.autotable.min.js',
  './vendor/html2canvas.min.js',
  './manifest.webmanifest',
  './fonts/sora-xMQ9uFFYT72X5wkB_18qmnndmSdSnh2BAfO5mnuyOo1lfiQwV6-x.woff2',
  './fonts/manrope-xn7gYHE41ni1AdIRggexSg.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon-180.png'
];
/* big, only needed for Urdu reports — downloaded once, never blocks install */
const OPTIONAL = ['./fonts/jameel-noori-nastaleeq.woff2'];

/* one file at a time: a single 404 must not leave the whole app uncached */
function addAll(cache, urls) {
  return Promise.all(urls.map(function (u) {
    return cache.add(new Request(u, { cache: 'reload' })).then(function () { return true; })
      .catch(function () { return false; });
  }));
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => addAll(c, SHELL))
      .then(c => addAll(c, OPTIONAL))          /* best effort, background */
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(r).then(res => {
      const c = res.clone();
      caches.open(CACHE).then(x => x.put(r, c)).catch(() => {});
      return res;
    }).catch(() =>
      caches.match(r, { ignoreSearch: true })
        .then(h => h || caches.match('./index.html'))
        .then(h => h || caches.match('./'))
    )
  );
});
