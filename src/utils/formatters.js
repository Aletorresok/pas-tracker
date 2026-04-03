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

export function formatoFecha(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${String(y).slice(-2)}`;
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
  const clean = phone.replace(/\D/g, "");
  const intl = clean.startsWith("54") ? clean : `54${clean}`;
  const n = primerNombre(nombre);
  const msg = `Hola ${n}, cómo estás? Soy Alexis, abogado.\nTrabajo con productores de seguros cuando el asegurado quiere reclamarle a la compañía del tercero.\nTe hago una consulta rápida: cuando un cliente tuyo tiene un choque y quiere reclamar, ¿cómo lo manejás hoy?`;
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