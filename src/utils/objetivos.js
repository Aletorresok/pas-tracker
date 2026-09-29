// Objetivos del mes, trimestre, semestre y año (tabla objetivos del SQL 25).
// Los medibles se calculan con los datos de la app; los demás se tildan a mano.
import { supabase } from "../supabase.js";
import { netoYo } from "./metricas.js";
import { estadisticasPas } from "./estadisticasPas.js";
import { sumarDiasISO } from "./plazos.js";
import { itemsDelDia, claveRegistro } from "./rutina.js";

export const PERIODOS = [
  { k: "mes", l: "Este mes", meses: 1 },
  { k: "trimestre", l: "Este trimestre", meses: 3 },
  { k: "semestre", l: "Este semestre", meses: 6 },
  { k: "anio", l: "Este año", meses: 12 },
];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const dos = n => String(n).padStart(2, "0");

// Rango del período que contiene a "hoy": { desde, hasta, nombre }
export function rangoPeriodo(periodo, hoy) {
  const a = Number(hoy.slice(0, 4)), m = Number(hoy.slice(5, 7));
  const largo = PERIODOS.find(p => p.k === periodo).meses;
  const mesIni = Math.floor((m - 1) / largo) * largo + 1;
  const mesFin = mesIni + largo - 1;
  const desde = `${a}-${dos(mesIni)}-01`;
  const hasta = `${a}-${dos(mesFin)}-${dos(new Date(a, mesFin, 0).getDate())}`;
  const nombre = periodo === "mes" ? `${MESES[m - 1]} ${a}` : periodo === "anio" ? `${a}` : `${MESES[mesIni - 1]} a ${MESES[mesFin - 1]} ${a}`;
  return { desde, hasta, nombre };
}

const enRango = (iso, d, h) => Boolean(iso) && String(iso).slice(0, 10) >= d && String(iso).slice(0, 10) <= h;
const dias = (a, b) => Math.round((new Date(`${String(b).slice(0, 10)}T12:00:00`) - new Date(`${String(a).slice(0, 10)}T12:00:00`)) / 86400000);
const mediana = xs => { if (!xs.length) return null; const s = [...xs].sort((x, y) => x - y); const k = s.length >> 1; return Math.round(s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2); };

// Métricas disponibles. calcular recibe { allCasos, historial, rutina, desde, hasta, hoy }
export const METRICAS = [
  { k: "casos_nuevos", l: "Casos nuevos", sentido: "subir",
    calcular: ({ allCasos, desde, hasta }) => allCasos.filter(c => enRango(c.fecha_derivacion, desde, hasta)).length },
  { k: "casos_cobrados", l: "Casos cobrados", sentido: "subir",
    calcular: ({ allCasos, desde, hasta }) => allCasos.filter(c => enRango(c.fecha_cobro, desde, hasta)).length },
  { k: "honorarios_cobrados", l: "Honorarios cobrados (netos)", sentido: "subir", dinero: true,
    calcular: ({ allCasos, desde, hasta }) => allCasos.filter(c => enRango(c.fecha_cobro_honorarios, desde, hasta)).reduce((s, c) => s + netoYo(c), 0) },
  { k: "pas_activos", l: "PAS activos derivando (últimos 90 días)", sentido: "subir", foto: true,
    calcular: ({ allCasos, hoy }) => new Set(allCasos.filter(c => enRango(c.fecha_derivacion, sumarDiasISO(hoy, -90), hoy)).map(c => String(c._pasId))).size },
  { k: "pas_contactados", l: "PAS contactados", sentido: "subir",
    calcular: ({ historial, desde, hasta }) => Object.values(historial || {}).reduce((n, lista) => n + (lista || []).filter(e => enRango(e.fecha, desde, hasta)).length, 0) },
  { k: "tiempo_cobro", l: "Días hasta el cobro (mediana)", sentido: "bajar", unidad: "días",
    calcular: ({ allCasos, desde, hasta }) => mediana(allCasos.filter(c => enRango(c.fecha_cobro, desde, hasta) && c.fecha_derivacion).map(c => dias(c.fecha_derivacion, c.fecha_cobro)).filter(d => d >= 0 && d < 1500)) },
  { k: "rutina_cumplida", l: "Rutina cumplida", sentido: "subir", unidad: "%",
    calcular: ({ rutina, desde, hasta, hoy }) => {
      if (!rutina?.items?.length) return null;
      const fin = hasta < hoy ? hasta : hoy;
      const debidas = new Set();
      for (let d = desde; d <= fin; d = sumarDiasISO(d, 1)) itemsDelDia(rutina.items, d).forEach(i => debidas.add(`${i.id}|${claveRegistro(i, d)}`));
      if (!debidas.size) return null;
      const hechas = [...debidas].filter(k => rutina.registro.has(k)).length;
      return Math.round((hechas / debidas.size) * 100);
    } },
];
export const metrica = k => METRICAS.find(m => m.k === k);

const formatear = (m, v) => (v === null || v === undefined ? "—" : m?.dinero ? `$${Math.round(v).toLocaleString("es-AR")}` : `${Math.round(v).toLocaleString("es-AR")}${m?.unidad === "%" ? "%" : m?.unidad ? ` ${m.unidad}` : ""}`);
export const formatoValor = formatear;

// Estado de un objetivo medible: cuánto va, dónde debería estar hoy, color y una frase útil.
export function evaluar(obj, ctx) {
  const m = metrica(obj.metrica);
  const { desde, hasta, nombre } = rangoPeriodo(obj.periodo, ctx.hoy);
  const valor = m.calcular({ ...ctx, desde, hasta });
  const meta = Number(obj.meta) || 0;
  const total = dias(desde, hasta) + 1;
  const transcurrido = Math.min(1, Math.max(0, (dias(desde, ctx.hoy) + 1) / total));
  const periodoTxt = obj.periodo === "anio" ? "el año" : obj.periodo === "mes" ? "el mes" : `el ${obj.periodo}`;

  if (valor === null || valor === undefined) return { valor: null, meta, avance: 0, esperado: transcurrido, nivel: "sin", frase: "Todavía no hay datos en el período.", nombre };

  if (m.sentido === "bajar") {
    const nivel = valor <= meta ? "bien" : valor <= meta * 1.2 ? "atras" : "mal";
    return { valor, meta, avance: meta ? Math.min(1, meta / valor) : 0, esperado: null, nivel, nombre,
      frase: valor <= meta ? `Vas bien: ${formatear(m, valor)}, la meta es ${formatear(m, meta)} o menos.` : `Hoy está en ${formatear(m, valor)}; la meta es ${formatear(m, meta)} o menos.` };
  }

  const avance = meta ? Math.min(1, valor / meta) : 0;
  // Las "fotos" (PAS activos, % de rutina) se comparan directo con la meta; lo acumulable, con lo esperado a hoy
  const esperado = m.foto || m.unidad === "%" ? 1 : transcurrido;
  const ratio = meta ? valor / (meta * esperado) : 0;
  const nivel = valor >= meta ? "bien" : ratio >= 1 ? "bien" : ratio >= 0.8 ? "atras" : "mal";
  let frase;
  if (valor >= meta) frase = "¡Cumplido!";
  else if (m.foto || m.unidad === "%") frase = `Faltan ${formatear(m, meta - valor)} para la meta.`;
  else {
    const proyeccion = transcurrido > 0 ? valor / transcurrido : 0;
    frase = `A este ritmo cerrás ${periodoTxt} en ${formatear(m, proyeccion)} (meta ${formatear(m, meta)}).`;
  }
  if (obj.metrica === "pas_activos" && valor < meta) {
    const porPas = {};
    ctx.allCasos.forEach(c => { (porPas[c._pasId] ||= []).push(c); });
    const dormidos = Object.values(porPas).filter(cs => estadisticasPas(cs).dormido).length;
    if (dormidos) frase += ` Hay ${dormidos} PAS dormido${dormidos > 1 ? "s" : ""} que derivaban.`;
  }
  return { valor, meta, avance, esperado: m.foto || m.unidad === "%" ? null : transcurrido, nivel, frase, nombre };
}

// ── Datos ──────────────────────────────────────────────────────────────────
export async function cargarObjetivos() {
  const { data, error } = await supabase.from("objetivos").select("*").order("orden").order("created_at");
  if (error) { console.error("[objetivos] cargar:", error.message); return []; }
  return data || [];
}
export async function guardarObjetivo(o) {
  const fila = { periodo: o.periodo, inicio: o.inicio, titulo: o.titulo, metrica: o.metrica || null, meta: o.metrica ? Number(o.meta) || null : null,
    sentido: o.metrica ? metrica(o.metrica).sentido : "subir", hecho: Boolean(o.hecho) };
  const { error } = o.id ? await supabase.from("objetivos").update(fila).eq("id", o.id) : await supabase.from("objetivos").insert(fila);
  if (error) console.error("[objetivos] guardar:", error.message);
  return !error;
}
export async function borrarObjetivo(id) {
  const { error } = await supabase.from("objetivos").delete().eq("id", id);
  return !error;
}
