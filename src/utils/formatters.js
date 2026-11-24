// ── FORMATEO ──────────────────────────────────────────────────────────────────────
export function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${String(y).slice(-2)}`;
}

export function fmtMoney(n) {
  if (n === null || n === undefined || n === "") return "—";
  // Montos de relleno ($1 cargado para que el campo no quede vacío) se muestran como sin dato.
  // Ningún monto real del estudio es menor a $10, así que no tapa datos.
  if (Number(n) > 0 && Number(n) < 10) return "—";
  return "$" + Number(n).toLocaleString("es-AR");
}

// Nombre para mostrar en listas: si vino todo en mayúsculas o todo en minúsculas ("ALAN DIAZ",
// "tolentino godoy nicolas") lo pasa a nombre propio; si ya tiene mayúsculas y minúsculas mezcladas
// se respeta como se cargó ("De la Fuente", "McDonald"). No toca el dato guardado ni los escritos.
const MINUSCULAS_NOMBRE = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "di", "do", "dos", "van", "von"]);
const SIGLAS = /^(s\.?a\.?|s\.?r\.?l\.?|s\.?a\.?s\.?|s\.?a\.?u\.?|s\.?c\.?|s\.?h\.?|ii|iii|iv)$/i;
export function nombrePropio(nombre) {
  if (!nombre) return nombre;
  const s = String(nombre).trim();
  if (s !== s.toUpperCase() && s !== s.toLowerCase()) return s;
  return s.toLowerCase().split(/(\s+)/).map((pal, i) => {
    if (/^\s+$/.test(pal) || !pal) return pal;
    if (SIGLAS.test(pal)) return pal.toUpperCase();
    if (i > 0 && MINUSCULAS_NOMBRE.has(pal)) return pal;
    // Mayúscula después de guion o apóstrofo: "Pérez-Gil", "D'Angelo"
    return pal.replace(/(^|[-'’])(\p{L})/gu, (_, sep, l) => sep + l.toUpperCase());
  }).join("");
}

// Patente para guardar: solo letras y números, en mayúsculas ("ab 123-cd" → "AB123CD")
export const normalizarPatente = v => String(v || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

// "hace 5 min", "hace 3 h", "ayer", "hace 4 días" (acepta ISO o Date)
export function haceCuanto(fecha) {
  if (!fecha) return "";
  const min = Math.round((Date.now() - new Date(fecha).getTime()) / 60000);
  if (min < 60) return `hace ${Math.max(min, 1)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

// ── TELÉFONOS ─────────────────────────────────────────────────────────────────────
export function cleanPhones(tel) {
  const str = String(tel || "");
  const nums = [...new Set(str.match(/\d{6,}/g) || [])];
  return nums.map(n => n.replace(/^0+/, ""));
}

export function primerNombre(nombre) {
  if (!nombre) return "";
  const parts = nombre.trim().replace(/,/g, " ").split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const llano = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  // Los nombres vienen como "APELLIDO(S) NOMBRE(S)": la primera palabra (después de la primera) que es un nombre de pila conocido
  let i = parts.findIndex((p, k) => k > 0 && NOMBRES_PILA.has(llano(p)));
  if (i < 0 && NOMBRES_PILA.has(llano(parts[0]))) i = 0; // cargado como "NOMBRE APELLIDO"
  if (i < 0) {
    // Sin coincidencia: se saltea el apellido (con partícula, "DELLA GIUSTINA", ocupa una palabra más; con 4 palabras, se asumen dos apellidos)
    const apellido = (PARTICULAS.has(llano(parts[0])) ? 2 : 1) + (parts.length >= 4 ? 1 : 0);
    i = Math.min(apellido, parts.length - 1);
  }
  const raw = parts[i];
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}
const PARTICULAS = new Set(["de", "del", "della", "dalla", "di", "da", "dos", "la", "las", "los", "san", "santa", "van", "von", "mc", "mac"]);
const NOMBRES_PILA = new Set(("agustin agustina alan alberto alejandra alejandro alejo alexis alfredo alicia ana analia andrea andres angel angela antonella antonio ariel "
  + "barbara beatriz belen benjamin brenda bruno camila carina carla carlos carolina cecilia cesar claudia claudio cristian cristina cynthia daiana damian daniel daniela dario david "
  + "debora diego eduardo elena elias elisa elsa emanuel emilia emiliano emilio enrique erica ernesto esteban estela eugenia ezequiel fabian facundo federico felipe fernanda fernando "
  + "florencia francisco franco gabriel gabriela gaston gerardo german gisela gladys gonzalo graciela guadalupe guillermina guillermo gustavo hector hernan horacio hugo ignacio ines irene "
  + "ivan ivana javier jesica jessica joaquin joel jonatan jonathan jorge jose josefina juan juana julia julian juliana julieta julio karina laura lautaro leandro leonardo liliana lorena "
  + "lourdes luca lucas lucia luciana luciano lucila luis luisa magali manuel marcela marcelo marcos maria mariana mariano mariel mariela marina mario marta martin martina matias mauricio "
  + "mauro maximiliano melina melisa mercedes micaela miguel milagros mirta monica nadia nahuel nancy natalia nelson nestor nicolas noelia noemi nora norma olga omar oscar pablo paola "
  + "patricia patricio paula pedro priscila rafael ramiro ramon raul ricardo roberto rocio rodolfo rodrigo romina roque rosa roxana ruben sabrina samanta sandra santiago sebastian sergio "
  + "silvia silvina sofia soledad sonia stella susana tamara tomas valentin valentina valeria vanesa vanina veronica victor victoria virginia walter yamila yanina yesica").split(" "));

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

// Descarga un Blob con el navegador. Sin tildes: con tildes Chrome a veces ignora el nombre y baja "download"
export function bajarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "") });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
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

// Desde cuántos días vencido un plazo pasa a "grave"
export const DIAS_VENCIDO_GRAVE = 30;

// Texto y severidad de un plazo: para chips de "vence en…"
export function describirPlazo(iso) {
  const dias = diasHasta(iso);
  if (dias === null) return null;
  // grave: 30 días o más vencido (se muestra más fuerte que un vencido reciente)
  if (dias < 0) return { dias, texto: `Vencido hace ${-dias} d`, nivel: "vencido", grave: dias <= -DIAS_VENCIDO_GRAVE };
  if (dias === 0) return { dias, texto: "Vence hoy", nivel: "hoy" };
  if (dias === 1) return { dias, texto: "Vence mañana", nivel: "pronto" };
  if (dias <= 3) return { dias, texto: `Vence en ${dias} d`, nivel: "pronto" };
  return { dias, texto: `Vence en ${dias} d`, nivel: "tranquilo" };
}
