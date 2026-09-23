// Estadísticas por PAS (a partir de sus casos) y el resumen del mes para mandarle.
import { fechaLocalISO, sumarDias, fmtMoney, primerNombre } from "./formatters.js";
import { esActivo, netoYo } from "./metricas.js";

const aISO = v => (v ? String(v).slice(0, 10) : "");
const dias = (a, b) => {
  if (!a || !b) return null;
  const d = Math.round((new Date(aISO(b) + "T12:00:00") - new Date(aISO(a) + "T12:00:00")) / 86400000);
  return Number.isFinite(d) ? d : null;
};
const mediana = xs => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};
const promedio = xs => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
const pct = (n, total) => (total ? Math.round((n / total) * 100) : null);

// Un PAS está "dormido" si pasó el doble de su ritmo habitual (y al menos 45 días) sin derivarte
export const MIN_CASOS_RITMO = 3;
const MIN_DIAS_DORMIDO = 45;

export function estadisticasPas(casos, hoy = new Date()) {
  const hoyISO = fechaLocalISO(hoy);
  const fechas = casos.map(c => aISO(c.fecha_derivacion)).filter(Boolean).sort();
  const intervalos = fechas.slice(1).map((f, i) => dias(fechas[i], f)).filter(d => d !== null && d >= 0);
  const ritmo = fechas.length >= MIN_CASOS_RITMO ? mediana(intervalos) : null;
  const ultimo = fechas[fechas.length - 1] || "";
  const diasDesdeUltimo = ultimo ? dias(ultimo, hoyISO) : null;
  const umbralDormido = ritmo !== null ? Math.max(ritmo * 2, MIN_DIAS_DORMIDO) : null;

  const cobrados = casos.filter(c => c.estado === "cobrado");
  const desistidos = casos.filter(c => c.estado === "desistido");
  const cerrados = cobrados.length + desistidos.length;

  const hace6 = sumarDias(hoyISO, -182), hace12 = sumarDias(hoyISO, -365);
  const ult6 = fechas.filter(f => f > hace6).length;
  const prev6 = fechas.filter(f => f > hace12 && f <= hace6).length;

  const cias = {};
  casos.forEach(c => { if (c.compania_aseguradora) cias[c.compania_aseguradora] = (cias[c.compania_aseguradora] || 0) + 1; });

  return {
    total: casos.length,
    enCurso: casos.filter(esActivo).length,
    cobrados: cobrados.length,
    desistidos: desistidos.length,
    pctDesistidos: pct(desistidos.length, casos.length),
    pctExito: pct(cobrados.length, cerrados),        // de los casos ya cerrados, cuántos se cobraron
    primero: fechas[0] || "",
    ultimo,
    diasDesdeUltimo,
    ritmo,                                            // cada cuántos días deriva (mediana)
    dormido: umbralDormido !== null && diasDesdeUltimo !== null && diasDesdeUltimo > umbralDormido,
    umbralDormido,
    diasACobro: promedio(cobrados.map(c => dias(c.fecha_derivacion, c.fecha_cobro)).filter(d => d !== null && d >= 0 && d < 1500)),
    cobroPromedioCliente: promedio(cobrados.map(c => Number(c.monto_cobro_asegurado)).filter(v => v > 0)),
    honorarios: cobrados.reduce((s, c) => s + netoYo(c), 0),
    comisionPagada: cobrados.reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0),
    companias: Object.entries(cias).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nombre, n]) => ({ nombre, n })),
    ult6, prev6,
  };
}

// ── Resumen del mes para el PAS ─────────────────────────────────────────────
export const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const COMO_VA = {
  doc_pendiente: "estamos juntando la documentación",
  iniciado: "estamos preparando el reclamo",
  reclamado: c => `reclamado ante ${c.compania_aseguradora || "la compañía"}, esperamos respuesta`,
  con_ofrecimiento: c => `${c.compania_aseguradora || "la compañía"} hizo un ofrecimiento; lo estamos negociando`,
  en_mediacion: "en mediación",
  en_juicio: "en juicio",
  esperando_pago: "hay acuerdo, esperamos el pago",
};

export function resumenDelMes(pas, casos, { anio, mes }, hoy = new Date()) {
  const clave = `${anio}-${String(mes + 1).padStart(2, "0")}`;
  const enMes = v => aISO(v).startsWith(clave);
  const nombre = c => c.asegurado || "Sin nombre";

  const nuevos = casos.filter(c => enMes(c.fecha_derivacion));
  const cobradosMes = casos.filter(c => c.estado === "cobrado" && enMes(c.fecha_cobro || c.fecha_cobro_honorarios));
  const enCurso = casos.filter(esActivo);
  const comisionMes = cobradosMes.reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0);
  const comisionAnio = casos
    .filter(c => c.estado === "cobrado" && aISO(c.fecha_cobro || c.fecha_cobro_honorarios).startsWith(String(anio)))
    .reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0);

  const lineas = [`Hola ${primerNombre(pas.nombre)}, ¿cómo estás? Te paso cómo vienen tus casos en ${MESES_LARGOS[mes]}:`, ""];
  if (nuevos.length) lineas.push(`• ${nuevos.length === 1 ? "1 caso nuevo" : `${nuevos.length} casos nuevos`}: ${nuevos.map(nombre).join(", ")}`);
  cobradosMes.forEach(c => lineas.push(`• ${nombre(c)}: ¡cobrado!${Number(c.monto_comision_pas) > 0 ? ` Tu comisión: ${fmtMoney(Number(c.monto_comision_pas))}` : ""}`));
  enCurso.filter(c => !nuevos.includes(c)).forEach(c => {
    const t = COMO_VA[c.estado];
    lineas.push(`• ${nombre(c)}: ${typeof t === "function" ? t(c) : t || "en curso"}`);
  });
  if (lineas.length === 2) lineas.push("• Este mes no hubo novedades en tus casos.");
  lineas.push("");
  if (comisionAnio > 0) lineas.push(`Tu comisión cobrada en ${anio}: ${fmtMoney(comisionAnio)}.`);
  lineas.push("¡Gracias por la confianza! Cualquier siniestro nuevo, mandámelo.");

  return { texto: lineas.join("\n"), nuevos: nuevos.length, cobrados: cobradosMes.length, enCurso: enCurso.length, comisionMes, comisionAnio };
}
