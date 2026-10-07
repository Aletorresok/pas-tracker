// ¿Conviene aceptar el ofrecimiento? Lo compara con lo que esa compañía terminó pagando en los otros casos del estudio.
// Todo en % de la base del reclamo (baseReclamo: en concurrencia, la parte del tercero; franquicias afuera).
// Es una referencia para decidir, no una regla: con pocos casos cerrados no da veredicto.
import { supabase } from "../supabase.js";
import { baseReclamo, mediana } from "./analisis.js";
import { subaOfertas } from "./ofertas.js";

const num = v => Number(v) || 0;
export const MINIMO_CASOS = 3; // con menos casos cerrados no se sugiere nada
const MARGEN = 10; // hasta 10 puntos por debajo de lo habitual cuenta como "cerca"
const CERRADOS = ["esperando_pago", "cobrado"];

// Lo que cerró cada caso: lo cobrado por el asegurado o, si todavía no cobró, lo acordado
const montoCierre = c => num(c.monto_cobro_asegurado) || num(c.monto_acordado);

// caso: el de la ficha (con lo que se está editando) · monto: el ofrecimiento a evaluar
// casosCompania: los casos de la misma compañía · ofertasPorCaso: { caso_id: [ofertas] } (para cuánto suelen subir)
export function referenciaOferta({ caso, monto, casosCompania = [], ofertasPorCaso = {} }) {
  const base = baseReclamo(caso);
  if (caso.tipo_reclamo === "franquicia") return { tipo: "franquicia" };
  if (!base || !num(monto)) return null;
  const pctOferta = Math.round((num(monto) / base) * 100);

  const otros = casosCompania.filter(c => c.id !== caso.id);
  // % de cierre de los casos con acuerdo o cobro (más de 150% = error de carga)
  const cierres = otros.filter(c => CERRADOS.includes(c.estado) && baseReclamo(c) > 0 && montoCierre(c) > 0)
    .map(c => Math.round((montoCierre(c) / baseReclamo(c)) * 100)).filter(p => p > 0 && p <= 150);
  // Cuánto subió la compañía de la primera oferta a la última, en los casos con más de una
  const subas = otros.map(c => subaOfertas(ofertasPorCaso[c.id], c)).filter(s => s !== null && s > 0);

  const cierre = mediana(cierres);
  const r = { tipo: "comparacion", pctOferta, cierre, n: cierres.length, suba: mediana(subas), nSuba: subas.length };
  if (cierres.length < MINIMO_CASOS) return { ...r, veredicto: null };
  r.veredicto = pctOferta >= cierre ? "en_linea" : pctOferta >= cierre - MARGEN ? "cerca" : "abajo";
  // Hasta cuánto suele llegar: el % de cierre aplicado a la base de este caso
  r.montoHabitual = Math.round((base * cierre) / 100);
  return r;
}

// Casos de la compañía y sus ofertas, para la ficha. null si no se pudo leer (sin sesión de administrador o sin SQL 21).
export async function datosCompania(cia) {
  if (!cia) return { casos: [], ofertas: {} };
  const { data: casos, error } = await supabase.from("pas_casos").select("*").eq("compania_aseguradora", cia);
  if (error) return null;
  const ofertas = {};
  const ids = (casos || []).map(c => c.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase.from("pas_ofertas").select("caso_id, fecha, monto, creado").in("caso_id", ids.slice(i, i + 200));
    (data || []).forEach(o => (ofertas[o.caso_id] ||= []).push(o));
  }
  Object.values(ofertas).forEach(l => l.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.creado || "").localeCompare(String(b.creado || ""))));
  return { casos: casos || [], ofertas };
}
