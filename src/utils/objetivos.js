// Objetivos del mes, trimestre, semestre y año (tabla `objetivos`, SQL 25).
// Los medibles se calculan solos con los datos de la app; los demás se tildan a mano.
import { supabase } from "../supabase.js";
import { fechaLocalISO, sumarDias, fmtMoney } from "./formatters.js";
import { netoYo, esActivo } from "./metricas.js";
import { mediana, diasEntre } from "./analisis.js";
import { rutinaCumplida } from "./rutina.js";

export const PERIODOS = [
  { k: "mes", l: "Mes", meses: 1 },
  { k: "trimestre", l: "Trimestre", meses: 3 },
  { k: "semestre", l: "Semestre", meses: 6 },
  { k: "anio", l: "Año", meses: 12 },
];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Primer y último día del período que contiene `hoy`
export function rangoPeriodo(periodo, hoy = fechaLocalISO()) {
  const { meses } = PERIODOS.find(p => p.k === periodo) || PERIODOS[0];
  const anio = Number(hoy.slice(0, 4)), mes = Number(hoy.slice(5, 7)) - 1;
  const mesIni = Math.floor(mes / meses) * meses;
  const inicio = `${anio}-${String(mesIni + 1).padStart(2, "0")}-01`;
  const fin = new Date(Date.UTC(anio, mesIni + meses, 0)).toISOString().slice(0, 10); // último día del período
  return { inicio, fin };
}

export function nombrePeriodo(periodo, inicio) {
  const anio = inicio.slice(0, 4), mes = Number(inicio.slice(5, 7)) - 1;
  if (periodo === "mes") return `${MESES_LARGOS[mes].charAt(0).toUpperCase()}${MESES_LARGOS[mes].slice(1)} ${anio}`;
  if (periodo === "trimestre") return `${Math.floor(mes / 3) + 1}.º trimestre ${anio}`;
  if (periodo === "semestre") return `${mes < 6 ? "1.er" : "2.º"} semestre ${anio}`;
  return `Año ${anio}`;
}

const dentro = (iso, desde, hasta) => { const f = String(iso || "").slice(0, 10); return f >= desde && f <= hasta; };

// acumula: se va sumando a lo largo del período (se compara con el ritmo esperado a hoy).
// Los que no acumulan (un nivel o un tiempo) se comparan directo con la meta.
export const METRICAS = [
  { k: "casos_nuevos", l: "Casos nuevos derivados", acumula: true,
    calc: ({ allCasos, desde, hasta }) => allCasos.filter(c => dentro(c.fecha_derivacion, desde, hasta)).length },
  { k: "casos_cobrados", l: "Casos cobrados", acumula: true,
    calc: ({ allCasos, desde, hasta }) => allCasos.filter(c => dentro(c.fecha_cobro_honorarios || c.fecha_cobro, desde, hasta)).length },
  { k: "honorarios_cobrados", l: "Honorarios cobrados (neto)", acumula: true, dinero: true,
    calc: ({ allCasos, desde, hasta }) => allCasos.filter(c => dentro(c.fecha_cobro_honorarios, desde, hasta)).reduce((s, c) => s + netoYo(c), 0) },
  { k: "pas_contactados", l: "PAS contactados", acumula: true,
    calc: ({ historial, desde, hasta }) => Object.values(historial || {}).filter(lista => (lista || []).some(e => dentro(e?.fecha, desde, hasta))).length },
  { k: "pas_activos", l: "PAS derivando (últimos 90 días)",
    calc: ({ allCasos, hoy }) => new Set(allCasos.filter(c => dentro(c.fecha_derivacion, sumarDias(hoy, -90), hoy)).map(c => String(c._pasId))).size },
  { k: "tiempo_cobro", l: "Días de la derivación al cobro (mediana)", sentido: "bajar", unidad: "d",
    calc: ({ allCasos, desde, hasta }) => mediana(allCasos
      .filter(c => dentro(c.fecha_cobro_honorarios || c.fecha_cobro, desde, hasta))
      .map(c => diasEntre(c.fecha_derivacion, c.fecha_cobro_honorarios || c.fecha_cobro))
      .filter(d => d !== null && d >= 0)) },
  { k: "rutina_cumplida", l: "Rutina cumplida", unidad: "%",
    calc: ({ rutina, desde, hasta }) => rutina ? rutinaCumplida(rutina.items, rutina.registro, desde, hasta) : null },
];
export const metrica = k => METRICAS.find(m => m.k === k) || null;

export function formatoValor(m, v) {
  if (v === null || v === undefined) return "—";
  if (m?.dinero) return fmtMoney(Math.round(v));
  return `${Math.round(v)}${m?.unidad === "%" ? " %" : m?.unidad ? ` ${m.unidad}` : ""}`;
}

// Avance de un objetivo medible: valor, % hecho, dónde deberías estar hoy, color y una frase útil
export function avanceObjetivo(obj, datos, hoy = fechaLocalISO()) {
  const m = metrica(obj.metrica);
  if (!m) return null;
  const { inicio: desde, fin: hasta } = rangoPeriodo(obj.periodo, obj.inicio);
  const hastaHoy = hoy < hasta ? hoy : hasta;
  const valor = m.calc({ ...datos, desde, hasta: hastaHoy, hoy });
  const meta = Number(obj.meta) || 0;
  const bajar = (obj.sentido || m.sentido) === "bajar";
  const totalDias = diasEntre(desde, hasta) + 1;
  const transcurridos = diasEntre(desde, hoy); // null si el período todavía no empezó
  const pasados = transcurridos === null ? 0 : Math.min(totalDias, transcurridos + 1);
  const fraccion = totalDias ? pasados / totalDias : 1;

  if (valor === null || !meta) return { m, valor, meta, pct: 0, esperadoPct: null, nivel: "sin", frase: valor === null ? "Todavía no hay datos para medirlo." : "Cargale una meta." };

  if (bajar) {
    const nivel = valor <= meta ? "ok" : valor <= meta * 1.2 ? "atras" : "muy_atras";
    return { m, valor, meta, pct: Math.min(100, Math.round((meta / valor) * 100)), esperadoPct: null, nivel,
      frase: valor <= meta ? `Vas ${Math.round(meta - valor)} ${m.unidad || ""} por debajo de la meta.` : `Te sobran ${Math.round(valor - meta)} ${m.unidad || ""} para llegar a la meta.` };
  }

  const pct = Math.min(100, Math.round((valor / meta) * 100));
  if (!m.acumula) {
    const nivel = valor >= meta ? "ok" : valor >= meta * 0.8 ? "atras" : "muy_atras";
    const frase = valor >= meta ? "Meta cumplida." : `Faltan ${formatoValor(m, meta - valor)}.`;
    return { m, valor, meta, pct, esperadoPct: null, nivel, frase };
  }

  const esperado = meta * fraccion;
  const nivel = valor >= esperado ? "ok" : valor >= esperado * 0.8 ? "atras" : "muy_atras";
  let frase;
  if (valor >= meta) frase = "Meta cumplida.";
  else if (hoy > hasta) frase = `Terminó en ${formatoValor(m, valor)} de ${formatoValor(m, meta)}.`;
  else if (pasados < 3 || !valor) frase = `Para llegar hacen falta ${formatoValor(m, meta / totalDias * 30)} por mes.`;
  else frase = `A este ritmo cerrás ${obj.periodo === "anio" ? "el año" : obj.periodo === "mes" ? "el mes" : `el ${obj.periodo}`} en ${formatoValor(m, valor / fraccion)}.`;
  return { m, valor, meta, pct, esperadoPct: Math.round(fraccion * 100), nivel, frase };
}

// Casos activos: se usa en la frase de algunos objetivos y en listas
export const activos = allCasos => allCasos.filter(esActivo);

// ── Base ──────────────────────────────────────────────────────────────────────
export async function cargarObjetivos() {
  const { data, error } = await supabase.from("objetivos").select("*").order("orden").order("created_at");
  if (error) { console.error("[objetivos] cargar:", error.message); return null; }
  return data || [];
}

const CAMPOS = ["periodo", "inicio", "titulo", "metrica", "meta", "sentido", "hecho", "orden"];
export async function guardarObjetivo(obj) {
  const fila = Object.fromEntries(CAMPOS.filter(k => k in obj).map(k => [k, obj[k] === "" || obj[k] === undefined ? null : obj[k]]));
  const q = obj.id ? supabase.from("objetivos").update(fila).eq("id", obj.id) : supabase.from("objetivos").insert(fila);
  const { data, error } = await q.select().single();
  if (error) { console.error("[objetivos] guardar:", error.message); return null; }
  return data;
}

export async function borrarObjetivo(id) {
  const { error } = await supabase.from("objetivos").delete().eq("id", id);
  if (error) { console.error("[objetivos] borrar:", error.message); return false; }
  return true;
}
