/* Gallo Holding Affitti — service worker
   pagina: network-first (aggiornamenti immediati) con cache come fallback offline
   asset statici e librerie: cache-first
   dati (REST/Auth/Realtime Supabase): mai in cache */
const CACHE = 'affitti-gallo-v4';
const ASSETS = [
  './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (/^\/(rest|auth|realtime|storage)\//.test(url.pathname)) return;
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/index.html')){
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok){ const c = res.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); }
        return res;
      }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && (url.origin === location.origin || ASSETS.includes(e.request.url))){
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
