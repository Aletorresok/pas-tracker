// Service worker mínimo de PAS Tracker: hace la app instalable y muestra un aviso si no hay conexión.
// No guarda la app en caché: cada vez que se abre con internet trae la última versión publicada.
const OFFLINE = "/offline.html";
const CACHE = "pas-offline-v2";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll([OFFLINE])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Solo las páginas: si no hay red, la pantalla "Sin conexión". Lo demás (Supabase, archivos) va directo.
self.addEventListener("fetch", e => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
