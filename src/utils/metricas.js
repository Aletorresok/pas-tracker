// Cálculos del Dashboard y de Análisis. Funciones puras sobre la lista de casos.
import { fechaLocalISO, sumarDias } from "./formatters.js";
import { margenPara } from "./margenes.js";

export const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const INACTIVOS = ["cobrado", "desistido"];

export const esActivo = c => !INACTIVOS.includes(c.estado);
export const netoYo = c => (Number(c.monto_cobro_yo) || 0) - (Number(c.monto_comision_pas) || 0);
const claveMes = iso => String(iso).slice(0, 7);

// Casos con el id y nombre de su PAS: { ...caso, _pasId, _pasNombre }
export function aplanarCasos(casos, todosLosPas) {
  const nombres = Object.fromEntries(todosLosPas.map(p => [String(p.id), p.nombre]));
  return Object.entries(casos).flatMap(([pasId, lista]) =>
    (lista || []).map(c => ({ ...c, _pasId: pasId, _pasNombre: nombres[String(pasId)] || "PAS desconocido" }))
  );
}

// ── Pagos: la indemnización y los honorarios se pagan por separado ─────────────
// Un caso en "Cobrado" cuenta como pagado del todo (los casos viejos no tienen las fechas por separado)
export const indemnizacionPagada = c => Boolean(c.fecha_cobro) || c.estado === "cobrado";
export const honorariosCobrados = c => Boolean(c.fecha_cobro_honorarios) || c.estado_honorarios === "COBRADO" || c.estado === "cobrado";
export const tieneHonorarios = c => (Number(c.monto_cobro_yo) || 0) > 0;
// "Falta: indemnización y honorarios" / "Falta: honorarios" / "Falta: indemnización"
export const textoFalta = c => {
  const f = [c.faltaIndemnizacion && "indemnización", c.faltaHonorarios && "honorarios"].filter(Boolean);
  return f.length ? `Falta: ${f.join(" y ")}` : "";
};

// Honorarios netos cobrados por mes, últimos 12 meses (el último es el actual)
export function honorariosPorMes(allCasos, hoy = new Date()) {
  const mapa = {};
  allCasos.forEach(c => {
    if (c.monto_cobro_yo && c.fecha_cobro_honorarios) {
      const k = claveMes(c.fecha_cobro_honorarios);
      mapa[k] = (mapa[k] || 0) + netoYo(c);
    }
  });
  const datos = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    datos.push({ key, mes: MESES[d.getMonth()], anio: d.getFullYear(), valor: mapa[key] || 0 });
  }
  return datos;
}

const variacion = (actual, anterior) => (anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : null);

// Números de la fila de arriba del Dashboard
export function kpis(allCasos, hoy = new Date()) {
  const anio = hoy.getFullYear();
  const cobradoEnAnio = a => allCasos
    .filter(c => String(c.fecha_cobro_honorarios || "").startsWith(String(a)))
    .reduce((s, c) => s + netoYo(c), 0);
  const porMes = honorariosPorMes(allCasos, hoy);
  const esteMes = porMes[11].valor, mesAnterior = porMes[10].valor;
  const porCobrar = allCasos.filter(c => !c.fecha_cobro_honorarios && (Number(c.monto_cobro_yo) || 0) > 0);
  return {
    anio,
    cobradoAnio: cobradoEnAnio(anio),
    varAnual: variacion(cobradoEnAnio(anio), cobradoEnAnio(anio - 1)),
    porCobrar: porCobrar.reduce((s, c) => s + netoYo(c), 0),
    porCobrarCasos: porCobrar.length,
    enGestion: allCasos.filter(esActivo).length,
    total: allCasos.length,
    esteMes,
    varMensual: variacion(esteMes, mesAnterior),
    mesAnteriorNombre: porMes[10].mes,
    totalHistorico: allCasos.filter(c => c.fecha_cobro_honorarios).reduce((s, c) => s + netoYo(c), 0),
    comisionesPAS: allCasos.reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0),
  };
}

// Cobros pendientes: casos esperando pago, o con uno de los dos pagos hecho y el otro no. Con su fecha estimada.
export function cobrosPendientes(allCasos) {
  const hoyMs = Date.now();
  const falta = c => ({ faltaIndemnizacion: !indemnizacionPagada(c), faltaHonorarios: tieneHonorarios(c) && !honorariosCobrados(c) });
  return allCasos
    .filter(c => {
      if (c.estado === "desistido") return false;
      const f = falta(c);
      if (!f.faltaIndemnizacion && !f.faltaHonorarios) return false;
      return c.estado === "esperando_pago" || indemnizacionPagada(c) || honorariosCobrados(c);
    })
    .map(c => {
      let fechaEstimada = null, diasRestantes = null;
      if (c.fecha_firma && c.plazo_pago) {
        fechaEstimada = sumarDias(c.fecha_firma, Number(c.plazo_pago));
      } else if (c.fecha_pago) {
        fechaEstimada = String(c.fecha_pago).slice(0, 10);
      }
      if (fechaEstimada) diasRestantes = Math.ceil((new Date(fechaEstimada).getTime() - hoyMs) / 86400000);
      const f = falta(c);
      return { ...c, ...f, fechaEstimada, diasRestantes,
        montoYo: f.faltaHonorarios ? Number(c.monto_cobro_yo) || 0 : 0,
        montoAsegurado: f.faltaIndemnizacion ? Number(c.monto_cobro_asegurado) || 0 : 0 };
    })
    .sort((a, b) => (a.fechaEstimada || "9999").localeCompare(b.fechaEstimada || "9999"));
}

// ── Reclamos quietos ──────────────────────────────────────────────────────────
const aISO = v => (v ? String(v).slice(0, 10) : "");
const diasEntre = (a, b) => {
  if (!a || !b) return null;
  const d = Math.round((new Date(aISO(b) + "T12:00:00") - new Date(aISO(a) + "T12:00:00")) / 86400000);
  return Number.isFinite(d) ? d : null;
};

// Cuánto tarda cada compañía en responder un reclamo (inicio del reclamo → ofrecimiento), con tus datos. Solo informativo.
export function plazosRespuesta(allCasos) {
  const porCia = {};
  allCasos.forEach(c => {
    const d = diasEntre(c.fecha_inicio_reclamo, c.fecha_ofrecimiento);
    if (!c.compania_aseguradora || d === null || d < 0 || d > 730) return;
    (porCia[c.compania_aseguradora] ||= []).push(d);
  });
  return Object.fromEntries(Object.entries(porCia).map(([cia, ds]) => [cia, { promedio: Math.round(ds.reduce((s, x) => s + x, 0) / ds.length), n: ds.length }]));
}

// Casos "Reclamado" sin respuesta hace más que el margen de su compañía (Análisis → Reclamo quieto)
export function reclamosQuietos(allCasos, hoy = new Date(), margenes = {}) {
  const hoyISO = fechaLocalISO(hoy);
  return allCasos
    .filter(c => c.estado === "reclamado")
    .map(c => {
      const desde = aISO(c.fecha_ultimo_reclamo || c.fecha_reclamo || c.fecha_inicio_reclamo || c.fecha_ultimo_movimiento);
      const dias = diasEntre(desde, hoyISO);
      if (!desde || dias === null) return null;
      const umbral = margenPara(margenes, c.compania_aseguradora);
      return { caso: c, desde, dias, umbral, vence: sumarDias(desde, umbral) };
    })
    .filter(q => q && q.dias > q.umbral);
}

// Lista única de "Para hacer", ordenada por vencimiento (sin fecha, al final). Los cobros van en su propia tarjeta.
export function tareasPendientes({ allCasos, hoy = new Date(), margenes = {} }) {
  const tareas = [];
  const hoyISO = fechaLocalISO(hoy);
  const enUnaSemana = sumarDias(hoyISO, 7);

  // Reclamos quietos (salvo que ya tengan una próxima acción con plazo vigente: ya lo estás siguiendo)
  reclamosQuietos(allCasos, hoy, margenes).forEach(q => {
    const c = q.caso;
    if (c.proxima_accion?.trim() && c.proxima_accion_vence && c.proxima_accion_vence >= hoyISO) return;
    const cia = c.compania_aseguradora || "La compañía";
    tareas.push({
      id: `quieto-${c.id}`, tipo: "quieto", vence: q.vence, titulo: c.asegurado || "Sin nombre", caso: c,
      detalle: `${cia}: sin respuesta hace ${q.dias} d (margen ${q.umbral} d)`,
    });
  });

  allCasos.filter(esActivo).forEach(c => {
    if (c.proxima_accion?.trim()) {
      tareas.push({ id: `accion-${c.id}`, tipo: "accion", vence: c.proxima_accion_vence || null, titulo: c.asegurado || "Sin nombre", detalle: c.proxima_accion.trim(), caso: c });
    }
  });

  allCasos.forEach(c => {
    if (c.estado_honorarios === "FACTURADO" && c.fecha_factura && !c.fecha_cobro_honorarios) {
      const vence = sumarDias(String(c.fecha_factura).slice(0, 10), 30);
      if (vence && vence <= enUnaSemana) {
        tareas.push({ id: `hon-${c.id}`, tipo: "honorarios", vence, titulo: c.asegurado || "Sin nombre", detalle: "Honorarios facturados sin cobrar", monto: Number(c.monto_honorarios) || null, caso: c });
      }
    }
  });

  return tareas.sort((a, b) => (a.vence || "9999-12-31").localeCompare(b.vence || "9999-12-31"));
}

// Etapas agrupadas para el tablero (orden de avance). Desistidos van aparte.
export const TRAMOS = [
  { key: "arranque", label: "Arranque", estados: ["doc_pendiente", "iniciado"] },
  { key: "reclamado", label: "Reclamado", estados: ["reclamado"] },
  { key: "negociacion", label: "Negociación", estados: ["con_ofrecimiento", "en_mediacion", "en_juicio"] },
  { key: "pago", label: "Esperando pago", estados: ["esperando_pago"] },
  { key: "cobrado", label: "Cobrado", estados: ["cobrado"] },
];

export function casosPorTramo(allCasos) {
  return {
    tramos: TRAMOS.map(t => ({ ...t, count: allCasos.filter(c => t.estados.includes(c.estado)).length })),
    desistidos: allCasos.filter(c => c.estado === "desistido").length,
  };
}
