// Calendario judicial para el motor de plazos (utils/plazos.js):
//  · feriados nacionales de la API pública argentinadatos (se guardan en el navegador 30 días)
//  · feria y días inhábiles de la tabla dias_inhabiles (SQL 25)
// Si la API no responde, usa los feriados de fecha fija y lo avisa con `aproximado: true`.
import { supabase } from "../supabase.js";

const API = "https://api.argentinadatos.com/v1/feriados/";
const VIGENCIA_MS = 30 * 24 * 60 * 60 * 1000;
// Feriados que no se mueven (los trasladables y los puentes solo los sabe la API)
const FIJOS = ["01-01", "03-24", "04-02", "05-01", "05-25", "06-20", "07-09", "12-08", "12-25"];

const clave = anio => `feriados_${anio}`;

function leerGuardados(anio) {
  try {
    const g = JSON.parse(localStorage.getItem(clave(anio)) || "null");
    return g && Date.now() - g.guardado < VIGENCIA_MS ? g.fechas : null;
  } catch { return null; }
}

async function feriadosDelAnio(anio) {
  const guardados = leerGuardados(anio);
  if (guardados) return { fechas: guardados, aproximado: false };
  try {
    const res = await fetch(API + anio);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const fechas = (await res.json()).map(f => f.fecha).filter(Boolean);
    try { localStorage.setItem(clave(anio), JSON.stringify({ guardado: Date.now(), fechas })); } catch { /* sin almacenamiento */ }
    return { fechas, aproximado: false };
  } catch {
    return { fechas: FIJOS.map(mmdd => `${anio}-${mmdd}`), aproximado: true };
  }
}

async function diasInhabiles() {
  const { data, error } = await supabase.from("dias_inhabiles").select("fecha, jurisdiccion");
  if (error) { console.error("[calendario] dias_inhabiles:", error.message); return []; }
  return data || [];
}

let enCurso = null;

// Calendario del año pasado, el actual y el siguiente (alcanza para cualquier plazo abierto)
export function cargarCalendarioJudicial({ recargar = false } = {}) {
  if (enCurso && !recargar) return enCurso;
  const anio = new Date().getFullYear();
  enCurso = Promise.all([
    ...[anio - 1, anio, anio + 1].map(feriadosDelAnio),
    diasInhabiles(),
  ]).then(res => {
    const inhabilesFilas = res.pop();
    const feriados = new Set(res.flatMap(r => r.fechas));
    const inhabiles = new Map();
    inhabilesFilas.forEach(({ fecha, jurisdiccion }) => inhabiles.set(fecha, [...(inhabiles.get(fecha) || []), jurisdiccion]));
    return { feriados, inhabiles, aproximado: res.some(r => r.aproximado) };
  });
  return enCurso;
}
