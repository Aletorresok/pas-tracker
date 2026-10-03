// Historial de ofertas de la compañía y contactos (liquidador del caso + directorio de compañías). Tablas del SQL 21,
// solo para el administrador. Si el SQL todavía no se corrió, las lecturas devuelven null y la ficha lo avisa.
import { supabase } from "../supabase.js";
import { fmtMoney } from "./formatters.js";

export const RESPUESTAS = [
  { k: "pendiente", l: "Sin responder" },
  { k: "rechazada", l: "Rechazada" },
  { k: "contraoferta", l: "Contraoferta" },
  { k: "aceptada", l: "Aceptada" },
];
export const respuestaLabel = k => RESPUESTAS.find(r => r.k === k)?.l || k;

const ordenar = lista => [...lista].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.creado || "").localeCompare(String(b.creado || "")));

// ── Ofertas ──────────────────────────────────────────────────────────────────
export async function cargarOfertas(casoId) {
  const { data, error } = await supabase.from("pas_ofertas").select("*").eq("caso_id", casoId);
  return error ? null : ordenar(data || []);
}
// ¿Ya se corrió el SQL 45? (instancia de cada oferta, tipo de reclamo del caso, instancia habitual de la compañía)
let consultaSql45 = null;
export function haySql45() {
  if (!consultaSql45) consultaSql45 = supabase.from("pas_ofertas").select("instancia").limit(1).then(({ error }) => !error);
  return consultaSql45;
}

// Instancia que se propone para una oferta nueva: la del estado del caso si está en mediación o juicio; si no,
// la habitual de la compañía (Río Uruguay: mediación); si no, administrativa.
export const instanciaSugerida = (estado, habitual) => (estado === "en_juicio" ? "juicio" : estado === "en_mediacion" ? "mediacion" : habitual || "administrativa");

export async function todasLasOfertas() {
  const columnas = "caso_id, fecha, monto, respuesta, creado" + ((await haySql45()) ? ", instancia" : "");
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from("pas_ofertas").select(columnas).order("id").range(desde, desde + 999);
    if (error) return null;
    filas.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const porCaso = {};
  filas.forEach(o => (porCaso[o.caso_id] ||= []).push(o));
  Object.keys(porCaso).forEach(k => { porCaso[k] = ordenar(porCaso[k]); });
  return porCaso;
}
export async function agregarOferta(casoId, o) {
  const { data, error } = await supabase.from("pas_ofertas").insert({ caso_id: casoId, ...o }).select().single();
  return error ? { error: error.message } : { data };
}
export async function actualizarOferta(id, cambios) {
  const { error } = await supabase.from("pas_ofertas").update(cambios).eq("id", id);
  return error ? error.message : null;
}
// Al pasar a Esperando pago (conformidad firmada): la última oferta sin responder queda aceptada.
// Devuelve esa oferta, para completar el monto acordado (null sin el SQL 21, sin ofertas o si la última ya tenía respuesta).
export async function aceptarUltimaPendiente(casoId) {
  const lista = casoId ? await cargarOfertas(casoId) : null;
  const ultima = lista?.[lista.length - 1];
  if (!ultima || ultima.respuesta !== "pendiente") return null;
  return (await actualizarOferta(ultima.id, { respuesta: "aceptada" })) ? null : { ...ultima, respuesta: "aceptada" };
}
export async function borrarOferta(id) {
  const { error } = await supabase.from("pas_ofertas").delete().eq("id", id);
  return error ? error.message : null;
}

// Campos del caso que siguen al historial: el último ofrecimiento (lo ve el PAS), el primero y su fecha
// (para Análisis) y, si se aceptó una oferta, la fecha de aceptación y el monto acordado (solo si están vacíos).
export function camposDesdeOfertas(ofertas, caso) {
  if (!ofertas.length) return {};
  const lista = ordenar(ofertas);
  const primera = lista[0], ultima = lista[lista.length - 1];
  const cambios = { monto_ofrecimiento: ultima.monto };
  // La instancia del último ofrecimiento (SQL 45) es la que cuenta en Análisis y en el portal
  if (ultima.instancia && "instancia_ofrecimiento" in caso) cambios.instancia_ofrecimiento = ultima.instancia;
  if (!Number(caso.primer_ofrecimiento)) cambios.primer_ofrecimiento = primera.monto;
  if (!caso.fecha_ofrecimiento) cambios.fecha_ofrecimiento = primera.fecha;
  const aceptada = [...lista].reverse().find(o => o.respuesta === "aceptada");
  if (aceptada) {
    if (!caso.fecha_aceptacion) cambios.fecha_aceptacion = aceptada.fecha;
    if (!Number(caso.monto_acordado)) cambios.monto_acordado = aceptada.monto;
  }
  return cambios;
}

export const textoOferta = (o, cia) => `Ofrecimiento de ${cia || "la compañía"}${o.instancia === "mediacion" ? " en mediación" : o.instancia === "juicio" ? " en juicio" : ""}: ${fmtMoney(o.monto)}`;
export const textoRespuesta = o =>
  o.respuesta === "contraoferta" && Number(o.contraoferta) ? `Contraoferta a ${fmtMoney(o.monto)}: ${fmtMoney(o.contraoferta)}`
  : o.respuesta === "rechazada" ? `Se rechazó el ofrecimiento de ${fmtMoney(o.monto)}`
  : o.respuesta === "aceptada" ? `Se aceptó el ofrecimiento de ${fmtMoney(o.monto)}`
  : null;

// Cuánto subió la compañía de la primera oferta a la última (%). Sin historial, usa primer y último ofrecimiento del caso.
export function subaOfertas(ofertasDelCaso, caso) {
  const montos = ofertasDelCaso?.length >= 2
    ? ofertasDelCaso.map(o => Number(o.monto)).filter(Boolean)
    : [Number(caso.primer_ofrecimiento), Number(caso.segundo_ofrecimiento), Number(caso.monto_ofrecimiento)].filter(Boolean);
  if (montos.length < 2 || !montos[0]) return null;
  const suba = Math.round((montos[montos.length - 1] / montos[0] - 1) * 100);
  return Number.isFinite(suba) ? suba : null;
}

// ── Contactos ────────────────────────────────────────────────────────────────
export async function cargarContacto(casoId) {
  const { data, error } = await supabase.from("pas_caso_contactos").select("*").eq("caso_id", casoId).maybeSingle();
  return error ? null : (data || {});
}
export async function guardarContacto(casoId, datos) {
  const { error } = await supabase.from("pas_caso_contactos").upsert({ caso_id: casoId, ...datos, actualizado: new Date().toISOString() }, { onConflict: "caso_id" });
  return error ? error.message : null;
}
export async function cargarCompania(nombre) {
  if (!nombre) return {};
  const { data, error } = await supabase.from("pas_companias").select("*").eq("compania", nombre).maybeSingle();
  return error ? null : (data || {});
}
export async function guardarCompania(nombre, datos) {
  const { error } = await supabase.from("pas_companias").upsert({ compania: nombre, ...datos }, { onConflict: "compania" });
  return error ? error.message : null;
}

// Cuando el "Monto ofrecimiento" cambia desde la ficha o la fila de Casos, el anterior no se pierde:
// si el caso no tenía historial, primero se guarda el ofrecimiento que ya tenía; después, el nuevo.
// `caso` = cómo estaba guardado antes del cambio. Devuelve true si agregó algo (sin el SQL 21 no hace nada).
export async function registrarCambioOfrecimiento(caso, nuevo, hoy) {
  const monto = Number(nuevo);
  if (!caso?.id || !monto) return false;
  const previas = await cargarOfertas(caso.id);
  if (previas === null) return false;
  const ultima = previas[previas.length - 1];
  if (ultima && Number(ultima.monto) === monto) return false; // ya está (lo cargó la tarjeta de Ofertas)
  const anterior = Number(caso.monto_ofrecimiento);
  if (!previas.length && anterior && anterior !== monto) {
    await agregarOferta(caso.id, { fecha: String(caso.fecha_ofrecimiento || hoy).slice(0, 10), monto: anterior, respuesta: "pendiente", nota: "Ofrecimiento anterior" });
  }
  // Instancia (SQL 45): la del estado si está en mediación o juicio; si no, la que ya tenía el caso
  const instancia = "instancia_ofrecimiento" in caso ? { instancia: instanciaSugerida(caso.estado, caso.instancia_ofrecimiento) } : {};
  const r = await agregarOferta(caso.id, { fecha: hoy, monto, respuesta: "pendiente", ...instancia });
  return !r.error;
}

// Todas las compañías del directorio: { compania: { mail, telefono, notas, honorarios_pct } } (null si falta el SQL 21)
export async function todasLasCompanias() {
  const { data, error } = await supabase.from("pas_companias").select("*");
  if (error) return null;
  return Object.fromEntries((data || []).map(r => [r.compania, r]));
}

// ── Comisión de cada PAS (SQL 24) ────────────────────────────────────────────
// { pasId: pct } — sin entrada = ese PAS no cobra comisión. null si falta el SQL 24.
export async function cargarComisiones() {
  const { data, error } = await supabase.from("pas_comisiones").select("pas_id, pct");
  if (error) return null;
  return Object.fromEntries((data || []).map(r => [String(r.pas_id), Number(r.pct)]));
}
export async function guardarComision(pasId, pct) {
  const { error } = pct
    ? await supabase.from("pas_comisiones").upsert({ pas_id: String(pasId), pct }, { onConflict: "pas_id" })
    : await supabase.from("pas_comisiones").delete().eq("pas_id", String(pasId));
  return error ? error.message : null;
}
// Comisión que corresponde a unos honorarios con un % (null si no hay % o no hay honorarios)
export const comisionPara = (honorarios, pct) => (Number(honorarios) > 0 && Number(pct) > 0 ? Math.round(Number(honorarios) * Number(pct) / 100) : null);
