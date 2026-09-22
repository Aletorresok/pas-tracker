// ── FORMATEO ──────────────────────────────────────────────────────────────────────
export function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${String(y).slice(-2)}`;
}

export function fmtMoney(n) {
  if (n === null || n === undefined || n === "") return "—";
  return "$" + Number(n).toLocaleString("es-AR");
}

// Alias unificado para evitar duplicación de lógica con fmtDate
export function formatoFecha(iso) {
  return fmtDate(iso);
}

export function formatoFechaCarpeta(iso) {
  if (!iso) return "00-00-0000";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
}

// ── TELÉFONOS ─────────────────────────────────────────────────────────────────────
export function cleanPhones(tel) {
  const str = String(tel || "");
  const nums = [...new Set(str.match(/\d{6,}/g) || [])];
  return nums.map(n => n.replace(/^0+/, ""));
}

export function primerNombre(nombre) {
  if (!nombre) return "";
  const parts = nombre.trim().split(/\s+/);
  const raw = parts.length >= 2 ? parts[1] : parts[0];
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function waLink(phone, nombre) {
  if (!phone) return "#";
  const clean = phone.replace(/\D/g, "");
  const intl = clean.startsWith("54") ? clean : `54${clean}`;
  const n = primerNombre(nombre);
  const msg = `Hola ${n}, cómo estás? Soy Alexis Torres Gaveglio, abogado.\nTe hago una consulta rápida: cuando un asegurado tuyo choca contra un tercero, ¿el reclamo lo maneja el cliente por su cuenta, le das una mano vos o se lo derivás a algún abogado?`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

// ── PARSEO ────────────────────────────────────────────────────────────────────────
export function parsePAS(rows) {
  return rows.map((row, i) => {
    const [nombre, mail, tel, contacto, respuesta, seguimiento] = row;
    if (seguimiento && String(seguimiento).includes("Borrado")) return null;
    const telefonos = cleanPhones(tel);
    return {
      id: i,
      nombre: nombre || "",
      mail: mail || "",
      telefonos,
      contacto: contacto || "",
      respuesta: respuesta || "",
      seguimiento: seguimiento || "",
      prioridad: telefonos.length === 1 ? "agendado" : telefonos.length > 1 ? "multi" : "sin_tel",
    };
  }).filter(Boolean);
}

// ── FECHAS ────────────────────────────────────────────────────────────────────────
export function diasDesde(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function sumarDias(iso, dias) {
  if (!iso || !dias) return null;
  const d = new Date(iso);
  d.setDate(d.getDate() + Number(dias));
  return d.toISOString().slice(0, 10);
}

// ── ARCHIVOS ──────────────────────────────────────────────────────────────────────
export function getExtension(nombre) {
  const parts = nombre.split(".");
  if (parts.length < 2) return "";
  return "." + parts[parts.length - 1].toLowerCase();
}

export function sanitizarNombre(str) {
  return String(str || "").replace(/[/\\:*?"<>|]/g, "").trim();
}

// ── PERMISO FILESYSTEM ────────────────────────────────────────────────────────────
export async function verificarPermiso(handle, mode = "readwrite") {
  try {
    const perm = await handle.queryPermission({ mode });
    if (perm === "granted") return true;
    const req = await handle.requestPermission({ mode });
    return req === "granted";
  } catch {
    return false;
  }
}
// ── PLAZOS (fecha local, no UTC: evita que después de las 21 h ya sea "mañana") ──
export function fechaLocalISO(d = new Date()) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Fecha (YYYY-MM-DD) dentro de N días desde hoy
export function fechaEnDias(n) {
  const d = new Date();
  d.setDate(d.getDate() + Number(n));
  return fechaLocalISO(d);
}

// Días que faltan hasta una fecha (negativo = vencido). null si no hay fecha.
export function diasHasta(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  const objetivo = new Date(y, m - 1, d);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((objetivo - hoy) / 86400000);
}

// Texto y severidad de un plazo: para chips de "vence en…"
export function describirPlazo(iso) {
  const dias = diasHasta(iso);
  if (dias === null) return null;
  if (dias < 0) return { dias, texto: `Vencido hace ${-dias} d`, nivel: "vencido" };
  if (dias === 0) return { dias, texto: "Vence hoy", nivel: "hoy" };
  if (dias === 1) return { dias, texto: "Vence mañana", nivel: "pronto" };
  if (dias <= 3) return { dias, texto: `Vence en ${dias} d`, nivel: "pronto" };
  return { dias, texto: `Vence en ${dias} d`, nivel: "tranquilo" };
}
