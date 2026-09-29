// Bandeja de novedades judiciales (SQL 37): lo que copiás del PJN o la MEV (despacho, cédula, notificación)
// y pegás a mano. Nada de scraping ni claves guardadas. Cada novedad se revisa antes de tocar el expediente:
// "Integrar" deja nota en la Bitácora (y opcionalmente un plazo del catálogo); "Descartar" la archiva.
import { supabase } from "../supabase.js";

// ¿Está corrido el SQL 37? (una sola consulta por sesión)
let soporte = null;
export function hayNovedadesJudiciales() {
  if (!soporte) soporte = supabase.from("novedades_judiciales").select("id").limit(1).then(({ error }) => !error);
  return soporte;
}

export const PORTALES = [{ k: "pjn", l: "PJN" }, { k: "mev", l: "MEV" }, { k: "otro", l: "Otro portal" }];
export const TIPOS_NOVEDAD = [{ k: "despacho", l: "Despacho" }, { k: "cedula", l: "Cédula" }, { k: "notificacion", l: "Notificación" }, { k: "otro", l: "Otro" }];

// Link al portal: el que cargaste en la ficha o la página de consulta general
const CONSULTA = { pjn: "https://scw.pjn.gov.ar/scw/home.seam", mev: "https://mev.scba.gov.ar/" };
export const linkPortal = e => e?.url_portal || (e?.portal && CONSULTA[e.portal]) || null;
export const nombrePortal = e => PORTALES.find(p => p.k === e?.portal)?.l || "el portal";

// Nuevas primero; null si falta el SQL 37
export async function cargarNovedades(estado = "nueva") {
  const { data, error } = await supabase.from("novedades_judiciales").select("*").eq("estado", estado).order("fecha", { ascending: false }).order("created_at", { ascending: false });
  if (error) { console.warn("[novedades_judiciales] cargar:", error.message); return null; }
  return data || [];
}

// Números de expediente que aparecen en el texto ("12345/2024", "CIV 012345/2024", "Expte. N° 45.678/23")
export function numerosEnTexto(texto) {
  const hallados = String(texto || "").match(/(?<![\d/])\d[\d.]*\s*\/\s*\d{2,4}(?![\d/])/g) || [];
  return [...new Set(hallados.map(n => n.replace(/[^0-9/]/g, "")))];
}

// Mismo criterio que la columna generada numero_normalizado, para no depender de que exista
const normalizar = n => String(n || "").replace(/[^0-9/]/g, "");
const sinCeros = n => n.replace(/^0+/, "");

// Expediente al que corresponde el texto, si el número aparece y coincide con uno solo
export function expedienteDelTexto(texto, expedientes) {
  const nums = numerosEnTexto(texto).map(sinCeros);
  if (!nums.length) return null;
  const hits = (expedientes || []).filter(e => { const n = sinCeros(e.numero_normalizado ?? normalizar(e.numero)); return n.includes("/") && nums.includes(n); });
  return hits.length === 1 ? hits[0] : null;
}

// Alta. { duplicada: true } si ya estaba cargada (hash único)
export async function pegarNovedad({ texto, expediente_id = null, fecha = null, tipo = null, url = null, fuente = "manual" }) {
  const fila = { texto: texto.trim(), expediente_id, fuente, tipo, url: url || null, ...(fecha ? { fecha } : {}) };
  const { data, error } = await supabase.from("novedades_judiciales").insert(fila).select().single();
  if (error?.code === "23505") return { duplicada: true };
  if (error) { console.error("[novedades_judiciales] pegar:", error.message); return { error: error.message }; }
  return { data };
}

export async function asignarNovedad(id, expediente_id) {
  const { error } = await supabase.from("novedades_judiciales").update({ expediente_id }).eq("id", id);
  return error ? error.message : null;
}

export async function descartarNovedad(id) {
  const { error } = await supabase.from("novedades_judiciales").update({ estado: "descartada", resuelta_en: new Date().toISOString() }).eq("id", id);
  return error ? error.message : null;
}

// Integrar: nota en la Bitácora del expediente (tabla acciones, con el id del expediente en caso_id, como la ficha) y la novedad pasa a "integrada" (con el plazo, si se creó)
export async function integrarNovedad(nov, { plazoId = null, nota = "" } = {}) {
  const tipo = TIPOS_NOVEDAD.find(t => t.k === nov.tipo)?.l || "Novedad";
  const descripcion = `${tipo} del ${new Date(`${nov.fecha}T12:00:00`).toLocaleDateString("es-AR")}: ${nota.trim() || nov.texto.trim()}`;
  const { error: errAcc } = await supabase.from("acciones").insert({ caso_id: nov.expediente_id, tipo: "nota", fecha: new Date().toISOString(), descripcion });
  if (errAcc) { console.error("[novedades_judiciales] bitácora:", errAcc.message); return errAcc.message; }
  const { error } = await supabase.from("novedades_judiciales").update({ estado: "integrada", plazo_id: plazoId, resuelta_en: new Date().toISOString() }).eq("id", nov.id);
  return error ? error.message : null;
}
