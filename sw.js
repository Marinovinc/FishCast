// FishCast service worker: precache del guscio app (offline il guscio), CDN cache-first.
// I DATI (Sentinel-2 COG, STAC, EMODnet WMS/WCS, tile mappa) passano sempre alla rete: sono live/grandi, non vanno in cache.
const CACHE = 'fishcast-v15';
const ASSETS = ['./', './index.html', './m.html', './engine.js', './i18n.js', './access.html', './guida.html', './privacy.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'fishcast-tiles').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  // dati dinamici/grandi -> sempre rete, niente cache
  if (u.hostname.includes('sentinel-cogs') || u.hostname.includes('earth-search') || u.hostname.includes('emodnet') || u.pathname.endsWith('.tif')) return;
  // tessere mappa base (satellite/OSM) -> cache-first: offline dalla zona salvata, altrimenti rete
  if (u.hostname.includes('arcgisonline') || u.hostname.includes('openstreetmap')) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    return;
  }
  if (u.origin === location.origin) { // guscio app -> network-first (sempre aggiornato online, offline dal cache)
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  // CDN (leaflet/geotiff/proj4) -> cache-first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(rr => { if (rr.ok) { const cp = rr.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return rr; })));
});
