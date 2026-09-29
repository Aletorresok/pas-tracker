import { plazosParaAvisar } from "./avisos.ts";
import { sb, unaVez, enviar } from "./base.ts";

// Resumen del día (9 hs): tareas vencidas y de hoy, pagos que ya deberían haber entrado, mediaciones y audiencias
// de la semana, casos nuevos del portal sin abrir y comisiones que le debés a un PAS. Una vez por día (salvo `forzar`).
export const agregar = (y: string, m: string, d: string, dias: number) => {
  const f = new Date(`${y}-${m}-${d}T12:00:00Z`);
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().slice(0, 10);
};
export async function resumenDelDia(forzar = false) {
  const hoy = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  if (!forzar && !(await unaVez(`resumen:${hoy}`))) return 0;
  const { data: casos } = await sb.from("pas_casos")
    .select("estado, proxima_accion, proxima_accion_vence, fecha_firma, fecha_aceptacion, plazo_pago, fecha_pago, origen, revisado_en, monto_cobro_yo, monto_comision_pas, fecha_cobro_honorarios, estado_honorarios, fecha_pago_comision");
  const activos = (casos || []).filter(c => !["cobrado", "desistido"].includes(c.estado));
  const conAccion = activos.filter(c => (c.proxima_accion || "").trim() && c.proxima_accion_vence);
  const vencidas = conAccion.filter(c => String(c.proxima_accion_vence).slice(0, 10) < hoy).length;
  const deHoy = conAccion.filter(c => String(c.proxima_accion_vence).slice(0, 10) === hoy).length;
  const pagosVencidos = activos.filter(c => {
    if (c.estado !== "esperando_pago") return false;
    let f = c.fecha_pago ? String(c.fecha_pago).slice(0, 10) : null;
    const base = c.fecha_firma || c.fecha_aceptacion; // firma o aceptación + plazo del convenio
    if (base && Number(c.plazo_pago)) { const [y, m, d] = String(base).slice(0, 10).split("-"); f = agregar(y, m, d, Number(c.plazo_pago)); }
    return !!f && f <= hoy;
  }).length;
  const nuevos = (casos || []).filter(c => c.origen === "portal" && !c.revisado_en).length;
  const honorariosCobrados = (c: Record<string, unknown>) => !!c.fecha_cobro_honorarios || c.estado_honorarios === "COBRADO" || c.estado === "cobrado";
  const comisiones = (casos || []).filter(c => Number(c.monto_comision_pas) > 0 && c.estado !== "desistido" && honorariosCobrados(c) && !c.fecha_pago_comision).length;
  const [y, m, d] = hoy.split("-");
  const { count: eventos } = await sb.from("pas_eventos").select("id", { count: "exact", head: true })
    .in("tipo", ["mediacion", "audiencia"]).gte("inicio", `${hoy}T00:00:00-03:00`).lte("inicio", `${agregar(y, m, d, 6)}T23:59:59-03:00`);

  const plazos = await plazosParaAvisar();
  const plazosVencidos = plazos.filter(p => p.dias_restantes < 0).length;
  const plazosHoy = plazos.filter(p => p.dias_restantes === 0).length;
  const plazosProximos = plazos.filter(p => p.dias_restantes > 0).length;

  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
  const partes = [
    plazosVencidos && plural(plazosVencidos, "plazo vencido sin marcar cumplido", "plazos vencidos sin marcar cumplidos"),
    plazosHoy && plural(plazosHoy, "plazo vence hoy", "plazos vencen hoy"),
    plazosProximos && plural(plazosProximos, "plazo vence en los próximos días", "plazos vencen en los próximos días"),
    vencidas && plural(vencidas, "tarea vencida", "tareas vencidas"),
    deHoy && plural(deHoy, "tarea para hoy", "tareas para hoy"),
    pagosVencidos && plural(pagosVencidos, "pago que ya debería haber entrado", "pagos que ya deberían haber entrado"),
    eventos && plural(eventos, "mediación o audiencia esta semana", "mediaciones o audiencias esta semana"),
    nuevos && plural(nuevos, "caso nuevo del portal sin abrir", "casos nuevos del portal sin abrir"),
    comisiones && plural(comisiones, "comisión por pagar a un PAS", "comisiones por pagar a PAS"),
  ].filter(Boolean);
  return enviar({
    titulo: partes.length ? "Tu día en ATG Lex" : "Todo al día",
    cuerpo: partes.length ? partes.join(" · ") : "No hay tareas vencidas ni pendientes para hoy.",
    url: "/", etiqueta: `resumen-${hoy}`,
  });
}
