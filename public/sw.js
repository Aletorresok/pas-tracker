// Service worker mínimo de PAS Tracker: hace la app instalable y muestra un aviso si no hay conexión.
// No guarda la app en caché: cada vez que se abre con internet trae la última versión publicada.
const OFFLINE = "/offline.html";
const CACHE = "pas-offline-v3";

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

// Notificaciones push (las manda la función "notificar" de Supabase)
self.addEventListener("push", e => {
  let a = {};
  try { a = e.data ? e.data.json() : {}; } catch { a = { cuerpo: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(a.titulo || "PAS Tracker", {
    body: a.cuerpo || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/favicon-32.png",
    tag: a.etiqueta,
    data: { url: a.url || "/" },
  }));
});

// Al tocarla: vuelve a la app si ya está abierta; si no, la abre
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/", self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    const abierta = ws.find(w => { const u = new URL(w.url); return u.origin === self.location.origin && !u.pathname.startsWith("/portal") && !u.searchParams.has("vista"); });
    if (abierta) return abierta.focus();
    return self.clients.openWindow(url);
  }));
});
