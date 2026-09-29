// Finanzas del estudio: gastos (tabla `gastos`, SQL 28), facturación de honorarios y resultado del mes.
import { supabase } from "../supabase.js";
import { tieneHonorarios, honorariosCobrados, estadoHonorarios } from "./metricas.js";

export const CATEGORIAS_GASTO = [
  { k: "matricula", l: "Matrícula" },
  { k: "aportes", l: "Aportes" },
  { k: "mediaciones", l: "Mediaciones" },
  { k: "cartas", l: "Cartas documento" },
  { k: "tasas", l: "Tasas y sellados" },
  { k: "movilidad", l: "Movilidad" },
  { k: "software", l: "Software y suscripciones" },
  { k: "otros", l: "Otros" },
];
export const categoria = k => CATEGORIAS_GASTO.find(c => c.k === k) || CATEGORIAS_GASTO[CATEGORIAS_GASTO.length - 1];

const mesDe = iso => String(iso || "").slice(0, 7);
const num = v => Number(v) || 0;

// ── Base ──────────────────────────────────────────────────────────────────────
// null = falta la tabla (SQL 28)
export async function cargarGastos() {
  const { data, error } = await supabase.from("gastos").select("*").order("fecha", { ascending: false });
  if (error) { console.error("[gastos] cargar:", error.message); return null; }
  return data || [];
}

const CAMPOS = ["fecha", "categoria", "descripcion", "monto", "recurrente", "hasta", "caso_id", "expediente_id"];
export async function guardarGasto(g) {
  const fila = Object.fromEntries(CAMPOS.filter(k => k in g).map(k => [k, g[k] === "" || g[k] === undefined ? null : g[k]]));
  const q = g.id ? supabase.from("gastos").update(fila).eq("id", g.id) : supabase.from("gastos").insert(fila);
  const { data, error } = await q.select().single();
  if (error) { console.error("[gastos] guardar:", error.message); return null; }
  return data;
}

export async function borrarGasto(id) {
  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) { console.error("[gastos] borrar:", error.message); return false; }
  return true;
}

// Factura de honorarios desde Finanzas (fecha y número). null si falla.
export async function guardarFactura(caso, { fecha_factura, nro_factura }) {
  const cambios = { fecha_factura: fecha_factura || null, nro_factura: nro_factura || null };
  cambios.estado_honorarios = estadoHonorarios({ ...caso, ...cambios });
  const { error } = await supabase.from("pas_casos").update(cambios).eq("id", caso.id);
  if (error) { console.error("[factura] guardar:", error.message); return null; }
  return cambios;
}

// ── Cálculos ──────────────────────────────────────────────────────────────────
// Gastos que caen en un mes ("2026-09"). Los recurrentes cuentan todos los meses desde su fecha hasta `hasta`.
export function gastosDelMes(gastos, mes) {
  return (gastos || []).filter(g => g.recurrente
    ? mesDe(g.fecha) <= mes && (!g.hasta || mesDe(g.hasta) >= mes)
    : mesDe(g.fecha) === mes);
}

// Comisión del PAS: se toma cuando se pagó (o, en casos viejos sin esa fecha, cuando cobraste los honorarios)
const fechaComision = c => c.fecha_pago_comision || (c.fecha_pago_comision === undefined ? c.fecha_cobro_honorarios : null);

// Resultado de un mes: honorarios cobrados − comisiones pagadas − gastos
export function resultadoDelMes(allCasos, gastos, mes) {
  const cobrados = allCasos.filter(c => mesDe(c.fecha_cobro_honorarios) === mes);
  const honorarios = cobrados.reduce((s, c) => s + num(c.monto_cobro_yo), 0);
  const comisiones = allCasos.filter(c => num(c.monto_comision_pas) > 0 && mesDe(fechaComision(c)) === mes)
    .reduce((s, c) => s + num(c.monto_comision_pas), 0);
  const delMes = gastosDelMes(gastos, mes);
  const totalGastos = delMes.reduce((s, g) => s + num(g.monto), 0);
  const porCategoria = CATEGORIAS_GASTO.map(cat => ({ ...cat, total: delMes.filter(g => (g.categoria || "otros") === cat.k).reduce((s, g) => s + num(g.monto), 0) }))
    .filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  return { honorarios, casosCobrados: cobrados.length, comisiones, gastos: totalGastos, porCategoria, resultado: honorarios - comisiones - totalGastos };
}

// Los últimos N meses (el actual incluido), del más viejo al más nuevo
export function ultimosMeses(n, hoy = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

// Facturación: con honorarios cargados y no desistido
export function facturacion(allCasos) {
  const con = allCasos.filter(c => c.estado !== "desistido" && tieneHonorarios(c));
  const orden = (a, b) => String(b.fecha_factura || b.fecha_cobro_honorarios || b.fecha_derivacion || "").localeCompare(String(a.fecha_factura || a.fecha_cobro_honorarios || a.fecha_derivacion || ""));
  return {
    sinFacturar: con.filter(c => !c.fecha_factura && !honorariosCobrados(c)).sort(orden),
    facturadoSinCobrar: con.filter(c => c.fecha_factura && !honorariosCobrados(c)).sort((a, b) => String(a.fecha_factura).localeCompare(String(b.fecha_factura))),
    cobrados: con.filter(honorariosCobrados).sort(orden),
  };
}

// Gastos cargados a cada caso: Map caso_id → total
export function gastosPorCaso(gastos) {
  const m = new Map();
  (gastos || []).forEach(g => { if (g.caso_id) m.set(g.caso_id, (m.get(g.caso_id) || 0) + num(g.monto)); });
  return m;
}
