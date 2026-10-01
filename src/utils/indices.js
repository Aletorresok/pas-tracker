// Series de índices para la calculadora de intereses (tabla indices, SQL 27).
import { supabase } from "../supabase.js";
import { fechaLocalISO } from "./formatters.js";

export const SERIES = {
  ipc: { l: "IPC (INDEC)", unidad: "variación mensual %", fuente: "INDEC · Índice de precios al consumidor, nivel general", automatica: true },
  icl: { l: "ICL (BCRA)", unidad: "valor del índice por día", fuente: "BCRA · Índice para Contratos de Locación (Ley 27.551)", automatica: true },
  tasa_activa_bna: { l: "Tasa activa BNA", unidad: "TNA % vigente desde esa fecha", fuente: "Banco Nación · tasa activa cartera general (nominal anual a 30 días)", automatica: false },
};

const FALTA_SQL = "Falta correr el SQL 27 (herramientas) en Supabase.";
const falta = error => (error?.code === "42P01" || error?.code === "PGRST205" ? FALTA_SQL : error?.message || "error desconocido");

export async function cargarSerie(serie) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from("indices").select("fecha, valor").eq("serie", serie).order("fecha").range(desde, desde + 999);
    if (error) return { error: falta(error) };
    filas.push(...data.map(f => ({ fecha: f.fecha, valor: Number(f.valor) })));
    if (data.length < 1000) break;
  }
  return { filas };
}

export async function guardarSerie(serie, filas) {
  for (let i = 0; i < filas.length; i += 500) {
    const lote = filas.slice(i, i + 500).map(f => ({ serie, fecha: f.fecha, valor: f.valor, actualizado: new Date().toISOString() }));
    const { error } = await supabase.from("indices").upsert(lote, { onConflict: "serie,fecha" });
    if (error) return { error: falta(error) };
  }
  return { ok: true };
}

export async function borrarDato(serie, fecha) {
  const { error } = await supabase.from("indices").delete().eq("serie", serie).eq("fecha", fecha);
  return error ? { error: falta(error) } : { ok: true };
}

// ── Pegar desde Excel ──────────────────────────────────────────────────────
// Acepta "31/01/2024  20,6", "2024-01-31;20.6", "01/2024 7.864,13", "ene-24 20,6%"...
const MESES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
const dos = n => String(n).padStart(2, "0");
const anio = a => (a < 100 ? 2000 + a : a);

export function leerFecha(txt) {
  const t = txt.trim().toLowerCase();
  let m;
  if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${dos(m[2])}-${dos(m[3])}`;
  if ((m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/))) return `${anio(+m[3])}-${dos(m[2])}-${dos(m[1])}`;
  if ((m = t.match(/^(\d{1,2})[/.-](\d{4})$/))) return `${m[2]}-${dos(m[1])}-01`;
  if ((m = t.match(/^([a-zá]{3})[a-zá]*[\s/.-]*(\d{2,4})$/)) && MESES[m[1].slice(0, 3)]) return `${anio(+m[2])}-${dos(MESES[m[1].slice(0, 3)])}-01`;
  return null;
}

export function leerNumero(txt) {
  let t = txt.trim().replace(/[%$\s]/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Devuelve { filas, errores }. Para el IPC, si los valores son el nivel del índice (no la variación),
// se pasan a variación mensual.
export function leerPegado(texto, { ipcEsNivel = false } = {}) {
  const filas = [];
  const errores = [];
  texto.split(/\r?\n/).forEach((linea, i) => {
    if (!linea.trim()) return;
    const partes = linea.split(/\t|;|\s{2,}|\s(?=[-\d])/).map(s => s.trim()).filter(Boolean);
    const fecha = partes.length >= 2 ? leerFecha(partes[0]) : null;
    const valor = partes.length >= 2 ? leerNumero(partes[partes.length - 1]) : null;
    if (fecha && valor !== null) filas.push({ fecha, valor });
    else if (i > 0 || !/[a-z]/i.test(linea)) errores.push(linea.trim()); // la primera línea puede ser el encabezado
  });
  filas.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  if (ipcEsNivel) {
    const variaciones = filas.slice(1).map((f, i) => ({ fecha: f.fecha, valor: +((f.valor / filas[i].valor - 1) * 100).toFixed(4) }));
    return { filas: variaciones, errores };
  }
  return { filas, errores };
}

// ── Actualizar desde internet ──────────────────────────────────────────────
// Busca en cualquier parte de la respuesta las listas de { fecha, valor } (las APIs cambian de forma).
function buscarPuntos(dato, salida = []) {
  if (Array.isArray(dato)) dato.forEach(x => buscarPuntos(x, salida));
  else if (dato && typeof dato === "object") {
    if ("fecha" in dato && "valor" in dato) salida.push({ fecha: String(dato.fecha).slice(0, 10), valor: Number(dato.valor) });
    else Object.values(dato).forEach(x => buscarPuntos(x, salida));
  }
  return salida;
}

async function traer(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// IPC: variación mensual desde ArgentinaDatos (la misma API de los feriados).
async function bajarIPC() {
  const puntos = buscarPuntos(await traer("https://api.argentinadatos.com/v1/finanzas/indices/inflacion"));
  return puntos.filter(p => /^\d{4}-\d{2}/.test(p.fecha) && Number.isFinite(p.valor)).map(p => ({ fecha: `${p.fecha.slice(0, 7)}-01`, valor: p.valor }));
}

// ICL: API de Principales Variables del BCRA. El número de variable se busca por nombre.
async function bajarICL() {
  const base = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias";
  const lista = await traer(base);
  const vars = [];
  (function juntar(d) {
    if (Array.isArray(d)) d.forEach(juntar);
    else if (d && typeof d === "object") {
      if ("idVariable" in d && ("descripcion" in d || "detalle" in d)) vars.push(d);
      Object.values(d).forEach(juntar);
    }
  })(lista);
  const icl = vars.find(v => /contratos de locaci|\bICL\b/i.test(String(v.descripcion || v.detalle || "")));
  if (!icl) throw new Error("no encontré el ICL en la lista del BCRA");
  const hoy = fechaLocalISO();
  const puntos = [];
  for (let anio = 2020; anio <= Number(hoy.slice(0, 4)); anio++) {
    const desde = anio === 2020 ? "2020-07-01" : `${anio}-01-01`;
    const hasta = `${anio}-12-31` < hoy ? `${anio}-12-31` : hoy;
    puntos.push(...buscarPuntos(await traer(`${base}/${icl.idVariable}?desde=${desde}&hasta=${hasta}&limit=3000`)));
  }
  return puntos.filter(p => /^\d{4}-\d{2}-\d{2}$/.test(p.fecha) && p.valor > 0);
}

export async function actualizarDesdeInternet(serie) {
  try {
    const filas = serie === "ipc" ? await bajarIPC() : serie === "icl" ? await bajarICL() : [];
    if (!filas.length) return { error: "La fuente no devolvió datos." };
    const unicos = [...new Map(filas.map(f => [f.fecha, f])).values()].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    const r = await guardarSerie(serie, unicos);
    return r.error ? r : { cantidad: unicos.length, ultimo: unicos[unicos.length - 1].fecha };
  } catch (e) {
    console.error("[indices] actualizar:", e);
    return { error: `No se pudo bajar de internet (${e.message}). Podés pegar los datos desde el Excel oficial.` };
  }
}
