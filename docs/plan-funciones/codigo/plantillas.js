// BORRADOR (plan de funciones, 2026-09-29) — al implementarlo va a src/utils/plantillas.js.
// Motor de modelos de escritos: funciones puras (sin React ni Supabase), probadas con plantillas.test.mjs.
//
// Sintaxis del cuerpo de un modelo (tabla modelos_escrito, SQL 32):
//   {{campo}} / {{compania.cuit}}              → valor; si falta queda "[campo]" resaltado para completarlo a mano
//   {{? clave | Etiqueta | tipo}}              → pregunta al generar (tipo: texto | monto | fecha). Su valor queda
//                                                disponible como {{clave}} y, si es monto, {{clave_letras}}
//   {{#si campo}} ... {{/si}}                  → el bloque sale solo si el campo tiene valor (se pueden anidar)
//   # Título · **negrita** · "1. ítem"         → formato mínimo que entienden el PDF y el Word

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const dos = n => String(n).padStart(2, "0");

export const fechaCorta = iso => {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
};
export const fechaLarga = iso => {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return y && m && d ? `${d} de ${MESES[m - 1]} de ${y}` : "";
};
export const pesos = n => (n === null || n === undefined || n === "" || isNaN(Number(n)) ? "" :
  "$ " + Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const hoyISO = (d = new Date()) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

// ── Número a letras (hasta 999.999.999.999) ──────────────────────────────────
const U = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece",
  "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés",
  "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const D = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const C = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function hasta999(n) {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100), r = n % 100;
  let s = C[c];
  if (r) s += (s ? " " : "") + (r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? " y " + U[r % 10] : ""));
  return s;
}
// "uno" se apocopa delante de mil/millones: "veintiún mil", "un millón"
const apocopar = s => s.replace(/veintiuno$/, "veintiún").replace(/(^|\s)uno$/, "$1un");

export function enteroALetras(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1e6), miles = Math.floor((n % 1e6) / 1000), resto = n % 1000;
  const partes = [];
  if (millones) partes.push(millones === 1 ? "un millón" : `${apocopar(enteroALetras(millones))} millones`);
  if (miles) partes.push(miles === 1 ? "mil" : `${apocopar(hasta999(miles))} mil`);
  if (resto) partes.push(hasta999(resto));
  return partes.join(" ");
}

// 1500000.5 → "pesos un millón quinientos mil con 50/100"
export function montoALetras(n) {
  if (n === null || n === undefined || n === "" || isNaN(Number(n))) return "";
  const v = Math.round(Number(n) * 100) / 100;
  const ent = Math.floor(v), cent = Math.round((v - ent) * 100);
  return `pesos ${apocopar(enteroALetras(ent))} con ${dos(cent)}/100`;
}

// ── Valores disponibles ──────────────────────────────────────────────────────
const MONTOS_CASO = ["monto_reclamado", "monto_ofrecimiento", "primer_ofrecimiento", "segundo_ofrecimiento", "monto_acordado",
  "monto_cobro_asegurado", "monto_honorarios", "monto_cobro_yo", "presupuesto"];
const FECHAS_CASO = ["fecha_siniestro", "fecha_derivacion", "fecha_inicio_reclamo", "fecha_reclamo", "fecha_ultimo_reclamo",
  "fecha_ofrecimiento", "fecha_aceptacion", "fecha_firma", "fecha_pago", "fecha_mediacion"];

// Aplana un objeto: {compania: {cuit: 1}} → {"compania.cuit": 1}
const aplanar = (obj, pre = "") => Object.entries(obj || {}).reduce((acc, [k, v]) =>
  v && typeof v === "object" && !Array.isArray(v) ? { ...acc, ...aplanar(v, `${pre}${k}.`) } : { ...acc, [`${pre}${k}`]: v }, {});

/**
 * Arma el diccionario de variables.
 * @param {object} p
 * @param {object} [p.caso]        fila de pas_casos
 * @param {object} [p.expediente]  fila de expedientes
 * @param {object} [p.compania]    ficha de pas_companias (utils/companias.js → fichaDe)
 * @param {object} [p.estudio]     pas_ajustes 'estudio'
 * @param {object} [p.liquidacion] fila de liquidaciones (SQL 36)
 * @param {string[]} [p.documental] lista para el reclamo
 */
export function variablesDe({ caso = null, expediente = null, compania = null, estudio = {}, liquidacion = null, documental = [], hoy = hoyISO() } = {}) {
  const v = { hoy: fechaCorta(hoy), hoy_largo: fechaLarga(hoy), estudio: { ...estudio } };
  if (caso) {
    Object.assign(v, {
      asegurado: caso.asegurado || "", asegurado_mayus: (caso.asegurado || "").toUpperCase(),
      asegurado_nombre: primerNombre(caso.asegurado),
      dni: formatearDni(caso.dni_asegurado), patente: (caso.patente || "").toUpperCase(),
      nro_siniestro: caso.nro_siniestro || "", vehiculo: caso.vehiculo || "", compania: caso.compania_aseguradora || "",
      tercero: caso.tercero_nombre || "", domicilio_asegurado: [caso.domicilio_asegurado, caso.localidad_asegurado].filter(Boolean).join(", "),
    });
    MONTOS_CASO.forEach(k => { v[k] = pesos(caso[k]); v[`${k}_letras`] = montoALetras(caso[k]); });
    FECHAS_CASO.forEach(k => { v[k] = fechaCorta(caso[k]); v[`${k}_larga`] = fechaLarga(caso[k]); });
  }
  if (expediente) {
    Object.assign(v, {
      caratula: expediente.caratula || "", juzgado: expediente.juzgado || "", secretaria: expediente.secretaria || "",
      numero: expediente.numero || "", fuero: expediente.fuero || "", jurisdiccion: expediente.jurisdiccion || "",
      cliente: expediente.cliente_nombre || "", cliente_dni: formatearDni(expediente.cliente_dni),
      contraparte: expediente.contraparte || "", letrado_contrario: expediente.letrado_contrario || "",
      rol_cliente: { actora: "parte actora", demandada: "parte demandada" }[expediente.rol_cliente] || "parte",
    });
    if (!caso) { v.asegurado = v.cliente; v.asegurado_nombre = primerNombre(v.cliente); v.dni = v.cliente_dni; }
  }
  if (compania) {
    v.compania = v.compania || compania.nombre || "";
    v.compania = { ...compania, nombre: v.compania,
      razon_social: compania.razon_social || v.compania,
      domicilio: [compania.domicilio, [compania.cp && `(${compania.cp})`, compania.localidad].filter(Boolean).join(" "), compania.provincia].filter(Boolean).join(", "),
    };
  } else if (v.compania) v.compania = { nombre: v.compania, razon_social: v.compania };
  if (liquidacion) {
    v.liquidacion = liquidacion.texto || "";
    v.liquidacion_total = pesos(liquidacion.resultado);
    v.liquidacion_total_letras = montoALetras(liquidacion.resultado);
  }
  v.documental = documental.map((d, i) => `${i + 1}. ${d}`).join("\n");
  const plano = aplanar(v);
  if (typeof v.compania === "object") plano.compania = v.compania.nombre; // {{compania}} a secas = nombre corto
  return plano;
}

// Misma regla que formatters.primerNombre: "APELLIDO NOMBRE" → "Nombre" (al implementarlo, importarla de ahí)
export function primerNombre(nombre) {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  const raw = partes.length >= 2 ? partes[1] : partes[0] || "";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function formatearDni(dni) {
  const d = String(dni || "").replace(/\D/g, "");
  return d.length === 7 || d.length === 8 ? d.replace(/\B(?=(\d{3})+$)/g, ".") : String(dni || "").trim();
}

// ── Preguntas ────────────────────────────────────────────────────────────────
const RE_PREGUNTA = /\{\{\?\s*([\w.]+)\s*(?:\|\s*([^|}]*?)\s*)?(?:\|\s*(texto|monto|fecha)\s*)?\}\}/g;

// [{clave, etiqueta, tipo}] sin repetir, en el orden en que aparecen
export function preguntasDe(cuerpo) {
  const vistas = new Map();
  for (const [, clave, etiqueta, tipo] of String(cuerpo || "").matchAll(RE_PREGUNTA))
    if (!vistas.has(clave)) vistas.set(clave, { clave, etiqueta: etiqueta || clave.replace(/_/g, " "), tipo: tipo || "texto" });
  return [...vistas.values()];
}

// Respuestas crudas → valores listos (montos con $ y en letras, fechas dd/mm/aaaa)
export function valoresDeRespuestas(preguntas, respuestas = {}) {
  const v = {};
  preguntas.forEach(({ clave, tipo }) => {
    const r = respuestas[clave];
    if (r === undefined || r === "") return;
    if (tipo === "monto") { v[clave] = pesos(r); v[`${clave}_letras`] = montoALetras(r); }
    else if (tipo === "fecha") { v[clave] = fechaCorta(r); v[`${clave}_larga`] = fechaLarga(r); }
    else v[clave] = String(r);
  });
  return v;
}

// ── Completar ────────────────────────────────────────────────────────────────
const tieneValor = x => x !== undefined && x !== null && String(x).trim() !== "";

// Resuelve {{#si}} de adentro hacia afuera
function condicionales(texto, valores) {
  const RE = /\{\{#si\s+([\w.]+)\s*\}\}((?:(?!\{\{#si\s)[\s\S])*?)\{\{\/si\}\}/;
  let t = texto, m;
  while ((m = t.match(RE))) t = t.replace(m[0], tieneValor(valores[m[1]]) ? m[2] : "");
  return t;
}

/**
 * Completa un modelo. Devuelve { texto, faltantes } — faltantes = variables sin valor (quedan como [variable]).
 */
export function completar(cuerpo, variables = {}, respuestas = {}, preguntas = preguntasDe(cuerpo)) {
  const valores = { ...variables, ...valoresDeRespuestas(preguntas, respuestas) };
  let t = String(cuerpo || "").replace(RE_PREGUNTA, (_, clave) => `{{${clave}}}`);
  t = condicionales(t, valores);
  const faltantes = new Set();
  t = t.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    if (tieneValor(valores[k])) return String(valores[k]);
    faltantes.add(k);
    return `[${k.replace(/[._]/g, " ")}]`;
  });
  t = t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(); // limpia lo que dejaron los bloques vacíos
  return { texto: t, faltantes: [...faltantes] };
}

// ── Bloques para el PDF / Word ───────────────────────────────────────────────
// "# Título" → titulo · "1. algo" → item · línea vacía separa párrafos · **x** → tramos en negrita
export function bloques(texto) {
  const tramos = linea => linea.split(/(\*\*[^*]+\*\*)/).filter(Boolean)
    .map(p => p.startsWith("**") && p.endsWith("**") ? { t: p.slice(2, -2), negrita: true } : { t: p, negrita: false });
  const out = [];
  let parrafo = [];
  const cerrar = () => { if (parrafo.length) { out.push({ tipo: "parrafo", tramos: tramos(parrafo.join(" ")) }); parrafo = []; } };
  String(texto || "").split("\n").forEach(l => {
    const s = l.trim();
    if (!s) return cerrar();
    if (s.startsWith("# ")) { cerrar(); out.push({ tipo: "titulo", tramos: tramos(s.slice(2)) }); return; }
    if (/^\d+\.\s/.test(s)) { cerrar(); out.push({ tipo: "item", tramos: tramos(s) }); return; }
    // Renglones cortos de encabezado (destinatario, CUIT, "Ref.:") van cada uno en su línea
    if (/^(\*\*.*\*\*|CUIT |Domicilio:|Ref\.:)/.test(s)) { cerrar(); out.push({ tipo: "linea", tramos: tramos(s) }); return; }
    parrafo.push(s);
  });
  cerrar();
  return out;
}

// Catálogo para el selector de variables del editor de modelos (Herramientas → Modelos)
export const CATALOGO_VARIABLES = [
  { grupo: "Caso", vars: ["asegurado", "asegurado_mayus", "asegurado_nombre", "dni", "patente", "vehiculo", "nro_siniestro", "compania", "tercero", "domicilio_asegurado"] },
  { grupo: "Fechas del caso", vars: FECHAS_CASO.flatMap(k => [k, `${k}_larga`]) },
  { grupo: "Montos del caso", vars: MONTOS_CASO.flatMap(k => [k, `${k}_letras`]) },
  { grupo: "Compañía", vars: ["compania.razon_social", "compania.cuit", "compania.domicilio", "compania.mail"] },
  { grupo: "Expediente", vars: ["caratula", "juzgado", "secretaria", "numero", "fuero", "jurisdiccion", "cliente", "cliente_dni", "contraparte", "letrado_contrario", "rol_cliente"] },
  { grupo: "Estudio", vars: ["estudio.abogado", "estudio.matriculas", "estudio.cuit", "estudio.domicilio", "estudio.condicion_fiscal"] },
  { grupo: "Otros", vars: ["hoy", "hoy_largo", "documental", "liquidacion", "liquidacion_total", "liquidacion_total_letras"] },
];
