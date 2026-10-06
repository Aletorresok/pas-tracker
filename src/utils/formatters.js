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
  const msg = `Hola${n ? ` ${n}` : ""}, cómo estás? Soy Alexis Torres Gaveglio, abogado (saqué tu número del padrón de la SSN). Trabajo con productores gestionando los reclamos de terceros de sus clientes.\n\nTe hago una consulta rápida: cuando un asegurado tuyo choca, ¿el reclamo lo maneja el cliente por su cuenta, le das una mano vos, o lo derivás?`;
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
// Toda la app usa la hora de Argentina, aunque el dispositivo esté en otra zona.
// "Hoy" y "ahora" salen de acá; las fechas AAAA-MM-DD se cuentan como días de calendario (sin horas).
export const ZONA_AR = "America/Argentina/Buenos_Aires";
const PARTES_AR = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_AR, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// { fecha: "2026-10-01", hora: "14:05", minutos: 845 } de un instante, en hora de Argentina
export function partesAR(d = new Date()) {
  const fecha = new Date(d);
  if (isNaN(fecha)) return { fecha: "", hora: "", minutos: 0 };
  const o = {};
  PARTES_AR.formatToParts(fecha).forEach(p => { o[p.type] = p.value; });
  return { fecha: `${o.year}-${o.month}-${o.day}`, hora: `${o.hour}:${o.minute}`, minutos: Number(o.hour) * 60 + Number(o.minute) };
}
// Fecha y hora de Argentina → instante (Argentina no tiene horario de verano: siempre -03:00)
export const instanteAR = (fecha, hora = "00:00") => new Date(`${fecha}T${hora}:00-03:00`);

const diaUTC = iso => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
// Días de calendario de `desde` a `hasta` (AAAA-MM-DD)
export const diasEntreFechas = (desde, hasta) => Math.round((diaUTC(String(hasta)) - diaUTC(String(desde))) / 86400000);

export function diasDesde(iso) {
  if (!iso) return null;
  return diasEntreFechas(diaDeAccion(iso), fechaLocalISO());
}

export function sumarDias(iso, dias) {
  if (!iso || !dias) return null;
  const d = new Date(diaUTC(String(iso).slice(0, 10)));
  d.setUTCDate(d.getUTCDate() + Number(dias));
  return d.toISOString().slice(0, 10);
}

// ── FACTURAS ──────────────────────────────────────────────────────────────────────
// Número de factura de ARCA con sus ceros: "64" → "0001-00000064", "1-65" → "0001-00000065".
// Si no son solo números (con o sin punto de venta), lo deja como está.
export function normalizarFactura(str) {
  const s = String(str || "").trim();
  const m = s.match(/^(?:(\d{1,5})\s*[-/ ]\s*)?(\d{1,8})$/);
  if (!m) return s;
  return `${(m[1] || "1").padStart(4, "0")}-${m[2].padStart(8, "0")}`;
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
// ── PLAZOS (día de Argentina, no UTC: evita que después de las 21 h ya sea "mañana") ──
// Día de Argentina (AAAA-MM-DD) de un instante; sin argumento, hoy
export function fechaLocalISO(d = new Date()) {
  return partesAR(d).fecha;
}

// Día (AAAA-MM-DD, hora de Argentina) de un movimiento de la bitácora. Hay dos formas guardadas:
// fecha elegida a mano ("2026-09-30" → 00:00 UTC, se toma el día tal cual) y momento exacto
// (automáticos: 23:16 del 30/09 queda 02:16 UTC del 01/10 → hay que pasarlo a la hora de Argentina).
export function diaDeAccion(fecha) {
  if (!fecha) return "";
  const s = String(fecha);
  if (s.length <= 10 || /T00:00:00(\.0+)?(Z|\+00(:?00)?)$/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return isNaN(d) ? s.slice(0, 10) : fechaLocalISO(d);
}

// Fecha (YYYY-MM-DD) dentro de N días desde hoy
export function fechaEnDias(n) {
  return Number(n) ? sumarDias(fechaLocalISO(), n) : fechaLocalISO();
}

// Días que faltan hasta una fecha (negativo = vencido). null si no hay fecha.
export function diasHasta(iso) {
  if (!iso) return null;
  return diasEntreFechas(fechaLocalISO(), String(iso).slice(0, 10));
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
