// Links que abren una ficha de la app del estudio (calendario, notificaciones, mails, "Copiar link de la ficha"):
//   /?abrir=caso-<uuid>        → ficha del caso PAS
//   /?abrir=expediente-<uuid>  → ficha del expediente
// Ojo: ?caso= y ?vista= los usa la vista del cliente (App.jsx), por eso el parámetro es "abrir".
// Si la app ya está abierta, la notificación no recarga: el service worker le manda { tipo: "abrir", url } (public/sw.js).

const PARAM = "abrir";
const RE = /^(caso|expediente)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export const linkFicha = (tipo, id, origen = window.location.origin) => `${origen}/?${PARAM}=${tipo}-${id}`;

// "?abrir=caso-…" (o una URL completa) → { tipo, id } o null
export function leerAbrir(textoOUrl) {
  let busqueda = String(textoOUrl || "");
  try { if (/^https?:/i.test(busqueda)) busqueda = new URL(busqueda).search; } catch { return null; }
  const m = new URLSearchParams(busqueda).get(PARAM)?.trim().match(RE);
  return m ? { tipo: m[1].toLowerCase(), id: m[2].toLowerCase() } : null;
}

// Saca ?abrir= de la barra de direcciones sin recargar (para que un F5 no vuelva a abrir la ficha)
export function limpiarAbrir() {
  const u = new URL(window.location.href);
  if (!u.searchParams.has(PARAM)) return;
  u.searchParams.delete(PARAM);
  window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash);
}
