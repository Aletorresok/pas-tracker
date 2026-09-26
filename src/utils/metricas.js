// Cálculos del Dashboard y de Análisis. Funciones puras sobre la lista de casos.
import { fechaLocalISO, sumarDias } from "./formatters.js";
import { margenPara } from "./margenes.js";
import { prescripcion, PRESCRIPCION_ANIOS } from "./flujoEstados.js";
import { fechaPagoEstimada } from "./vistaCliente.js";

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
// Comisión del PAS pagada: por su fecha (SQL 20). Sin esa columna todavía, como antes: pagada cuando cobraste los honorarios.
export const comisionPagada = c => (c.fecha_pago_comision !== undefined ? Boolean(c.fecha_pago_comision) : honorariosCobrados(c));
// La debés: ya cobraste tus honorarios y todavía no se la pagaste
export const comisionPorPagar = c => (Number(c.monto_comision_pas) || 0) > 0 && c.estado !== "desistido" && honorariosCobrados(c) && !comisionPagada(c);
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
  // Mismo criterio que Cobros pendientes y Flujo de caja: con honorarios cargados, sin cobrar y no desistido
  const porCobrar = allCasos.filter(c => c.estado !== "desistido" && tieneHonorarios(c) && !honorariosCobrados(c));
  const cobrados = allCasos.filter(c => tieneHonorarios(c) && honorariosCobrados(c));
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
    // Neto (ya descontada la comisión) y comisiones de los casos donde cobraste los honorarios
    totalHistorico: cobrados.reduce((s, c) => s + netoYo(c), 0),
    comisionesPAS: allCasos.filter(c => (Number(c.monto_comision_pas) || 0) > 0 && comisionPagada(c)).reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0),
    comisionesPorPagar: allCasos.filter(comisionPorPagar).reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0),
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
      let diasRestantes = null;
      const fechaEstimada = fechaPagoEstimada(c); // firma o aceptación + plazo, o fecha de pago
      if (fechaEstimada) diasRestantes = Math.ceil((new Date(fechaEstimada).getTime() - hoyMs) / 86400000);
      const f = falta(c);
      return { ...c, ...f, fechaEstimada, diasRestantes,
        montoYo: f.faltaHonorarios ? Number(c.monto_cobro_yo) || 0 : 0,
        // Lo que va a cobrar el asegurado: si todavía no se cargó "Lo que cobró", el acordado o el ofrecimiento
        montoAsegurado: f.faltaIndemnizacion ? Number(c.monto_cobro_asegurado) || Number(c.monto_acordado) || Number(c.monto_ofrecimiento) || 0 : 0 };
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

// Margen sugerido por compañía: el día en que ya respondió el 75% de sus reclamos (con al menos 3 casos),
// nunca menos que el general ni más de 60 días. Así no avisa antes de tiempo con las que suelen tardar.
export const MIN_CASOS_SUGERIDO = 3;
export const MARGEN_SUGERIDO_MAX = 60;
const percentil = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};

// { cia: dias } con los márgenes sugeridos (solo las compañías con datos suficientes)
export const margenesSugeridos = allCasos => Object.fromEntries(
  Object.entries(plazosRespuesta(allCasos)).filter(([, p]) => p.sugerido !== null).map(([cia, p]) => [cia, p.sugerido])
);

// Cuánto tarda cada compañía en responder un reclamo (inicio del reclamo → ofrecimiento), con tus datos.
// { cia: { promedio, n, sugerido } }; sugerido es null si hay pocos casos.
export function plazosRespuesta(allCasos) {
  const porCia = {};
  allCasos.forEach(c => {
    const d = diasEntre(c.fecha_inicio_reclamo, c.fecha_ofrecimiento);
    if (!c.compania_aseguradora || d === null || d < 0 || d > 730) return;
    (porCia[c.compania_aseguradora] ||= []).push(d);
  });
  return Object.fromEntries(Object.entries(porCia).map(([cia, ds]) => [cia, {
    promedio: Math.round(ds.reduce((s, x) => s + x, 0) / ds.length),
    n: ds.length,
    sugerido: ds.length >= MIN_CASOS_SUGERIDO ? Math.min(MARGEN_SUGERIDO_MAX, percentil(ds, 75)) : null,
  }]));
}

// Casos "Reclamado" sin respuesta hace más que el margen de su compañía (Análisis → Reclamo quieto)
export function reclamosQuietos(allCasos, hoy = new Date(), margenes = {}) {
  const hoyISO = fechaLocalISO(hoy);
  const sugeridos = margenesSugeridos(allCasos);
  return allCasos
    .filter(c => c.estado === "reclamado")
    .map(c => {
      const desde = aISO(c.fecha_ultimo_reclamo || c.fecha_reclamo || c.fecha_inicio_reclamo || c.fecha_ultimo_movimiento);
      const dias = diasEntre(desde, hoyISO);
      if (!desde || dias === null) return null;
      const umbral = margenPara(margenes, c.compania_aseguradora, sugeridos);
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

  // Prescripción: casos activos a menos de 90 días de cumplir el plazo desde el siniestro
  allCasos.filter(esActivo).forEach(c => {
    const p = prescripcion(c, hoyISO);
    if (!p) return;
    tareas.push({ id: `presc-${c.id}`, tipo: "prescripcion", vence: p.vence, titulo: c.asegurado || "Sin nombre", caso: c,
      detalle: p.dias < 0 ? `Pasaron más de ${PRESCRIPCION_ANIOS} años desde el siniestro` : `Se cumplen ${PRESCRIPCION_ANIOS} años del siniestro en ${p.dias} días` });
  });

  // Comisiones que le debés al PAS (ya cobraste tus honorarios)
  allCasos.filter(comisionPorPagar).forEach(c => {
    tareas.push({ id: `com-${c.id}`, tipo: "comision", vence: aISO(c.fecha_cobro_honorarios) || hoyISO, titulo: c._pasNombre || "PAS", caso: c,
      detalle: `Pagarle la comisión por ${c.asegurado || "el caso"}`, monto: Number(c.monto_comision_pas) || null });
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
