// Estadísticas de la pestaña Análisis: compañías, PAS, etapas y flujo de caja.
// Funciones puras sobre la lista de casos aplanada (metricas.aplanarCasos).
import { fechaLocalISO, sumarDias } from "./formatters.js";
import { netoYo, esActivo, tieneHonorarios, honorariosCobrados } from "./metricas.js";
import { estadisticasPas } from "./estadisticasPas.js";
import { subaOfertas } from "./ofertas.js";
import { fechaPagoComprometida } from "./vistaCliente.js";
import { INSTANCIAS, CULPA_CONCURRENCIA } from "../constants.js";

const MAX_DIAS = 1825; // más de 5 años entre dos fechas = error de carga
const aISO = v => (v ? String(v).slice(0, 10) : "");
const num = v => Number(v) || 0;

export const pct = (n, total) => (total ? Math.round((n / total) * 100) : null);

export function diasEntre(a, b) {
  if (!a || !b) return null;
  const d = Math.round((new Date(aISO(b) + "T12:00:00") - new Date(aISO(a) + "T12:00:00")) / 86400000);
  return Number.isFinite(d) && d >= 0 && d <= MAX_DIAS ? d : null;
}

export function mediana(xs) {
  const s = xs.filter(x => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

// { valor, n }: mediana de días entre dos fechas y sobre cuántos casos se calculó
function medianaDias(casos, desde, hasta) {
  const ds = casos.map(c => diasEntre(desde(c), hasta(c))).filter(d => d !== null);
  return { valor: mediana(ds), n: ds.length };
}
const promedio = xs => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

// Sobre qué monto se mide lo ofrecido y lo cobrado (SQL 45). En concurrencia, sobre la parte a cargo del tercero
// (50% si no se cargó otra): si ofrecen la mitad de lo reclamado con culpa compartida, es el 100% de lo que correspondía.
// La franquicia devuelve 0 y queda afuera de los %: se paga entera y no muestra cómo negocia la compañía.
export function baseReclamo(c) {
  if (c.tipo_reclamo === "franquicia") return 0;
  const r = num(c.monto_reclamado);
  return c.tipo_reclamo === "concurrencia" ? Math.round(r * (num(c.porcentaje_culpa) || CULPA_CONCURRENCIA) / 100) : r;
}

// Instancia del último ofrecimiento del caso. Sin el SQL 45, se deduce de las fechas y el estado como antes.
export const instanciaDe = c => c.instancia_ofrecimiento
  || (c.fecha_inicio_juicio || c.estado === "en_juicio" ? "juicio" : c.fecha_mediacion || c.estado === "en_mediacion" ? "mediacion" : "administrativa");

// Lo ofrecido en cada instancia, en % de la base: la última oferta de cada instancia (con historial de ofertas;
// sin él, el último ofrecimiento del caso con su instancia). { administrativa: [pcts], mediacion: [...], juicio: [...] }
function pctsPorInstancia(casos, ofertas = {}) {
  const por = Object.fromEntries(INSTANCIAS.map(i => [i.key, []]));
  casos.forEach(c => {
    const base = baseReclamo(c);
    if (!base) return;
    const hist = ofertas[c.id];
    const ultimas = {};
    if (hist?.length && hist.some(o => o.instancia)) hist.forEach(o => { ultimas[o.instancia || "administrativa"] = num(o.monto); });
    else if (num(c.monto_ofrecimiento)) ultimas[instanciaDe(c)] = num(c.monto_ofrecimiento);
    Object.entries(ultimas).forEach(([k, m]) => { if (m && por[k]) por[k].push(Math.round((m / base) * 100)); });
  });
  return por;
}

// Cuántos casos de cada tipo hay en el grupo (para aclarar sobre qué base están los %)
export const tiposDeReclamo = casos => ({
  concurrencias: casos.filter(c => c.tipo_reclamo === "concurrencia").length,
  franquicias: casos.filter(c => c.tipo_reclamo === "franquicia").length,
});

function medianaPct(casos, parte, total) {
  const ps = casos.filter(c => num(total(c)) > 0 && num(parte(c)) > 0).map(c => Math.round((num(parte(c)) / num(total(c))) * 100));
  return { valor: mediana(ps), n: ps.length };
}

// "Acuerdo": aceptación del ofrecimiento o, si no está, la firma del convenio
export const fechaAcuerdo = c => c.fecha_aceptacion || c.fecha_firma || null;
const fueAMediacion = c => Boolean(c.fecha_mediacion) || c.estado === "en_mediacion";
const fueAJuicio = c => Boolean(c.fecha_inicio_juicio) || c.estado === "en_juicio";

// ── Incumplimientos de pago ─────────────────────────────────────────────────
// Casos con fecha comprometida de pago (firma o aceptación + plazo, o fecha de pago) y qué pasó:
// "a_termino" (pagó ese día o antes), "tarde" (pagó después) o "impago" (ya pasó la fecha y no pagó).
// El pago es la fecha de cobro de la indemnización. Los "Cobrado" viejos sin esa fecha no se pueden evaluar.
const diasConSigno = (a, b) => Math.round((new Date(aISO(b) + "T12:00:00") - new Date(aISO(a) + "T12:00:00")) / 86400000);
export function incumplimientos(casos, hoy = new Date()) {
  const hoyISO = fechaLocalISO(hoy);
  return casos.map(c => {
    if (c.estado === "desistido") return null;
    const { fecha, segun } = fechaPagoComprometida(c);
    if (!fecha) return null;
    if (c.fecha_cobro) {
      const atraso = diasConSigno(fecha, c.fecha_cobro);
      return { caso: c, debia: fecha, segun, pago: aISO(c.fecha_cobro), atraso: Math.max(0, atraso), estado: atraso > 0 ? "tarde" : "a_termino" };
    }
    if (c.estado === "cobrado" || fecha >= hoyISO) return null; // sin fecha de cobro, o todavía en plazo
    return { caso: c, debia: fecha, segun, pago: null, atraso: diasConSigno(fecha, hoyISO), estado: "impago" };
  }).filter(Boolean);
}
function resumenPagos(casos) {
  const lista = incumplimientos(casos);
  const tarde = lista.filter(x => x.estado === "tarde");
  const incumplidos = lista.filter(x => x.estado !== "a_termino");
  const aTermino = lista.filter(x => x.estado === "a_termino").length;
  const cerrados = aTermino + tarde.length; // los impagos todavía no terminaron
  return {
    total: lista.length, aTermino, tarde: tarde.length, impagos: lista.filter(x => x.estado === "impago").length,
    pctATermino: pct(aTermino, cerrados), cerrados,
    atraso: mediana(tarde.map(x => x.atraso)),
    // Pagos tarde + vencidos sin pagar, y los días de demora en promedio (los impagos, hasta hoy)
    incumplidos: incumplidos.length,
    demoraPromedio: promedio(incumplidos.map(x => x.atraso)),
  };
}

// ── Compañías ───────────────────────────────────────────────────────────────
function statsDeGrupo(nombre, casos, ofertas = {}) {
  const subas = casos.map(c => subaOfertas(ofertas[c.id], c)).filter(v => v !== null);
  const porInstancia = pctsPorInstancia(casos, ofertas);
  return {
    ...tiposDeReclamo(casos),
    // % ofrecido en cada instancia (mediana); n = 0 si la compañía no ofreció en esa instancia
    instancias: Object.fromEntries(Object.entries(porInstancia).map(([k, xs]) => [k, { valor: mediana(xs), n: xs.length }])),
    suba: { valor: mediana(subas), n: subas.length },
    pagos: resumenPagos(casos),
    nombre,
    total: casos.length,
    diasOferta: medianaDias(casos, c => c.fecha_inicio_reclamo, c => c.fecha_ofrecimiento),
    diasIndemnizacion: medianaDias(casos, fechaAcuerdo, c => c.fecha_cobro),
    diasHonorarios: medianaDias(casos, fechaAcuerdo, c => c.fecha_cobro_honorarios),
    diasFactura: medianaDias(casos, c => c.fecha_factura, c => c.fecha_cobro_honorarios),
    // Primer ofrecimiento si está cargado; si no, el último
    // Sobre la base del reclamo (concurrencia: la parte del tercero; franquicias afuera)
    pctOfrecido: medianaPct(casos, c => num(c.primer_ofrecimiento) || num(c.monto_ofrecimiento), baseReclamo),
    pctCobrado: medianaPct(casos, c => c.monto_cobro_asegurado, baseReclamo),
    mediacion: casos.filter(fueAMediacion).length,
    juicio: casos.filter(fueAJuicio).length,
  };
}

export function statsCompanias(allCasos, ofertas = {}) {
  const grupos = {};
  allCasos.forEach(c => { if (c.compania_aseguradora) (grupos[c.compania_aseguradora] ||= []).push(c); });
  return {
    general: statsDeGrupo("Todas", allCasos.filter(c => c.compania_aseguradora), ofertas),
    companias: Object.entries(grupos).map(([nombre, casos]) => statsDeGrupo(nombre, casos, ofertas)),
  };
}

// Cuadro de una compañía (Análisis → Compañías y portal del PAS): promedios simples, para leer de un vistazo.
// Sin `ofertas` (portal), el % por instancia sale del último ofrecimiento de cada caso.
export function cuadroCompania(casos, ofertas = {}) {
  const dias = (a, b) => casos.map(c => diasEntre(a(c), b(c))).filter(d => d !== null && d <= 730);
  const cobrado = casos.filter(c => baseReclamo(c) > 0 && num(c.monto_cobro_asegurado) > 0).map(c => Math.round((num(c.monto_cobro_asegurado) / baseReclamo(c)) * 100));
  const oferta = dias(c => c.fecha_inicio_reclamo, c => c.fecha_ofrecimiento), cobro = dias(c => c.fecha_inicio_reclamo, c => c.fecha_cobro);
  const pagos = resumenPagos(casos);
  // Reclamos iniciados que todavía esperan el ofrecimiento: cuántos días llevan (cuentan aunque no haya respuesta)
  const hoyISO = fechaLocalISO(new Date());
  const esperando = casos.filter(c => c.fecha_inicio_reclamo && !c.fecha_ofrecimiento && !num(c.monto_ofrecimiento) && !["desistido", "cobrado"].includes(c.estado))
    .map(c => diasEntre(c.fecha_inicio_reclamo, hoyISO)).filter(d => d !== null && d <= 730);
  const r = {
    total: casos.length, ...tiposDeReclamo(casos),
    diasOferta: { valor: promedio(oferta), n: oferta.length },
    sinOferta: { n: esperando.length, dias: promedio(esperando) },
    diasCobro: { valor: promedio(cobro), n: cobro.length },
    pctCobrado: { valor: promedio(cobrado), n: cobrado.length },
    incumplimientos: { cantidad: pagos.incumplidos, demora: pagos.demoraPromedio, evaluados: pagos.cerrados + pagos.impagos },
    instancias: Object.fromEntries(Object.entries(pctsPorInstancia(casos, ofertas)).map(([k, v]) => [k, { valor: promedio(v), n: v.length }])),
  };
  // ¿Hay algo para mostrar? Un reclamo esperando ofrecimiento ya alcanza
  r.conDatos = r.sinOferta.n > 0 || [r.diasOferta, r.diasCobro, r.pctCobrado, ...Object.values(r.instancias)].some(x => x.n > 0) || r.incumplimientos.evaluados > 0;
  return r;
}

// ── PAS ─────────────────────────────────────────────────────────────────────
// Usa estadisticasPas (lo mismo que Clientes) y agrega el neto por caso cobrado
export function statsPasAnalisis(allCasos, hoy = new Date()) {
  const grupos = {};
  allCasos.forEach(c => { (grupos[c._pasId] ||= { nombre: c._pasNombre, casos: [] }).casos.push(c); });
  return Object.entries(grupos).map(([pasId, { nombre, casos }]) => {
    const est = estadisticasPas(casos, hoy);
    const conHonorarios = casos.filter(c => tieneHonorarios(c) && honorariosCobrados(c));
    const neto = conHonorarios.reduce((s, c) => s + netoYo(c), 0);
    return {
      pasId, nombre, ...est,
      neto,
      casosConNeto: conHonorarios.length,
      netoPorCaso: conHonorarios.length ? Math.round(neto / conHonorarios.length) : null,
    };
  });
}

// ── Etapas: embudo y tiempos ────────────────────────────────────────────────
// "estados" = estados actuales que implican haber pasado por la etapa aunque falte la fecha
export const ETAPAS = [
  { key: "derivado", label: "Derivado", fecha: c => c.fecha_derivacion || c.fecha_carga, estados: null },
  { key: "reclamado", label: "Reclamado", fecha: c => c.fecha_inicio_reclamo, estados: ["reclamado", "con_ofrecimiento", "en_mediacion", "en_juicio", "esperando_pago", "cobrado"] },
  { key: "ofrecimiento", label: "Ofrecimiento", fecha: c => c.fecha_ofrecimiento, estados: ["con_ofrecimiento", "esperando_pago", "cobrado"] },
  { key: "acuerdo", label: "Acuerdo", fecha: fechaAcuerdo, estados: ["esperando_pago", "cobrado"] },
  { key: "indemnizacion", label: "Indemnización cobrada", fecha: c => c.fecha_cobro, estados: ["cobrado"] },
  { key: "honorarios", label: "Honorarios cobrados", fecha: c => c.fecha_cobro_honorarios, estados: ["cobrado"] },
];

const llego = (c, etapa, i) => i === 0 || Boolean(etapa.fecha(c)) || Boolean(etapa.estados?.includes(c.estado));

export function embudo(allCasos) {
  const etapas = ETAPAS.map((e, i) => ({
    key: e.key, label: e.label,
    llegaron: allCasos.filter(c => llego(c, e, i)).length,
    // Días desde la etapa anterior (solo casos con las dos fechas)
    tiempo: i === 0 ? null : medianaDias(allCasos, ETAPAS[i - 1].fecha, e.fecha),
  }));
  // Desistidos: última etapa a la que llegaron antes de caerse
  const caidas = {};
  const desistidos = allCasos.filter(c => c.estado === "desistido");
  desistidos.forEach(c => {
    let ultima = 0;
    ETAPAS.forEach((e, i) => { if (e.fecha(c)) ultima = i; });
    caidas[ETAPAS[ultima].key] = (caidas[ETAPAS[ultima].key] || 0) + 1;
  });
  return { etapas, caidas, desistidos: desistidos.length };
}

// No hay historial de cambios de estado: la entrada al estado actual se aproxima con la fecha del expediente que le corresponde
const ENTRADA_ESTADO = {
  doc_pendiente: c => c.fecha_derivacion || c.fecha_carga,
  iniciado: c => c.fecha_contacto_asegurado || c.fecha_derivacion || c.fecha_carga,
  reclamado: c => c.fecha_ultimo_reclamo || c.fecha_reclamo || c.fecha_inicio_reclamo,
  con_ofrecimiento: c => c.fecha_reconsideracion || c.fecha_ofrecimiento,
  en_mediacion: c => c.fecha_mediacion,
  en_juicio: c => c.fecha_inicio_juicio,
  esperando_pago: fechaAcuerdo,
};

// Casos activos con los días que llevan en su estado (null = falta la fecha para saberlo)
// `cambios` = cambios de estado registrados en la bitácora (ver cambiosDeEstado). Si el caso tiene registrada
// su entrada al estado actual, se usa esa fecha (exacta); si no, la aproximación con las fechas del expediente.
export function tiempoEnEstado(allCasos, hoy = new Date(), cambios = {}) {
  const hoyISO = fechaLocalISO(hoy);
  return allCasos.filter(esActivo).map(c => {
    const registrada = [...(cambios[c.id] || [])].reverse().find(x => x.a === c.estado)?.fecha;
    const desde = registrada || ENTRADA_ESTADO[c.estado]?.(c);
    return { caso: c, desde: aISO(desde), dias: desde ? diasEntre(desde, hoyISO) : null, exacto: Boolean(registrada) };
  });
}

// ── Cambios de estado registrados ───────────────────────────────────────────
// Desde el 25/09/2026 cada cambio de estado deja en la bitácora "Pasó de {estado} a {estado}".
// De acciones [{ caso_id, fecha, descripcion }] arma { casoId: [{ de, a, fecha }] } ordenado por fecha.
export function cambiosDeEstado(acciones, estados) {
  const porLabel = Object.fromEntries(estados.map(e => [e.label, e.key]));
  const res = {};
  acciones.forEach(x => {
    const m = /^Pasó de (.+) a (.+)$/.exec(String(x.descripcion || "").trim());
    if (!m || !porLabel[m[1]] || !porLabel[m[2]]) return;
    (res[x.caso_id] ||= []).push({ de: porLabel[m[1]], a: porLabel[m[2]], fecha: aISO(x.fecha) });
  });
  Object.values(res).forEach(l => l.sort((a, b) => a.fecha.localeCompare(b.fecha)));
  return res;
}

// Cuánto duró cada estado, con los casos que entraron y salieron de él estando registrados: { estado: { valor, n } }
export function duracionPorEstado(cambios) {
  const dias = {};
  Object.values(cambios).forEach(lista => {
    for (let i = 0; i < lista.length - 1; i++) {
      const d = diasEntre(lista[i].fecha, lista[i + 1].fecha);
      if (d !== null && lista[i].a === lista[i + 1].de) (dias[lista[i].a] ||= []).push(d);
    }
  });
  return Object.fromEntries(Object.entries(dias).map(([k, ds]) => [k, { valor: mediana(ds), n: ds.length }]));
}

// ── Flujo de caja (honorarios por cobrar) ───────────────────────────────────
export const DIAS_FACTURA = 30; // plazo que se asume entre factura y cobro de honorarios (igual que en Hoy)

// Fecha estimada de cobro de los honorarios y de qué dato sale
export function estimarCobro(c) {
  const comprometida = fechaPagoComprometida(c);
  if (comprometida.fecha) return comprometida;
  if (c.estado_honorarios === "FACTURADO" && c.fecha_factura) return { fecha: sumarDias(aISO(c.fecha_factura), DIAS_FACTURA), segun: `Factura + ${DIAS_FACTURA} d` };
  return { fecha: null, segun: null };
}

export const TRAMOS_CAJA = [
  { key: "vencido", label: "Vencido" },
  { key: "d30", label: "0 a 30 días" },
  { key: "d60", label: "31 a 60" },
  { key: "d90", label: "61 a 90" },
  { key: "mas", label: "Más de 90" },
  { key: "sin_fecha", label: "Sin fecha" },
];

export function flujoCaja(allCasos, hoy = new Date()) {
  const hoyISO = fechaLocalISO(hoy);
  const items = allCasos
    .filter(c => c.estado !== "desistido" && tieneHonorarios(c) && !honorariosCobrados(c))
    .map(c => {
      const { fecha, segun } = estimarCobro(c);
      const dias = fecha ? Math.round((new Date(fecha + "T12:00:00") - new Date(hoyISO + "T12:00:00")) / 86400000) : null;
      const tramo = dias === null ? "sin_fecha" : dias < 0 ? "vencido" : dias <= 30 ? "d30" : dias <= 60 ? "d60" : dias <= 90 ? "d90" : "mas";
      return { caso: c, fecha, segun, dias, tramo, bruto: num(c.monto_cobro_yo), comision: num(c.monto_comision_pas), neto: netoYo(c) };
    })
    .sort((a, b) => (a.fecha || "9999").localeCompare(b.fecha || "9999"));

  const tramos = TRAMOS_CAJA.map(t => {
    const del = items.filter(i => i.tramo === t.key);
    return { ...t, casos: del.length, neto: del.reduce((s, i) => s + i.neto, 0), comision: del.reduce((s, i) => s + i.comision, 0) };
  });
  return { items, tramos };
}

// ── ¿Conviene ir a mediación? ───────────────────────────────────────────────
// Casos ya cobrados, separados en: arreglo sin mediación, con mediación (sin juicio) y con juicio.
// Por grupo: % cobrado sobre lo reclamado, días desde la derivación hasta el cobro, tus honorarios netos y,
// con mediación, cuánto más se cobró que la última oferta anterior a la mediación (si está en el historial).
export const GRUPOS_MEDIACION = [
  { k: "sin", l: "Arreglo sin mediación" },
  { k: "mediacion", l: "Con mediación" },
  { k: "juicio", l: "Con juicio" },
];
export function comparativaMediacion(casos, cambios = {}, ofertas = {}) {
  const paso = (c, estado) => (cambios[c.id] || []).some(t => t.a === estado);
  const cobrados = casos.filter(c => (c.estado === "cobrado" || c.fecha_cobro) && num(c.monto_cobro_asegurado) > 0);
  // Con el SQL 45, la instancia marcada en el ofrecimiento; antes, por fechas y cambios de estado
  const grupoDe = c => (c.instancia_ofrecimiento ? (c.instancia_ofrecimiento === "administrativa" ? "sin" : c.instancia_ofrecimiento)
    : c.fecha_inicio_juicio || paso(c, "en_juicio") ? "juicio" : c.fecha_mediacion || paso(c, "en_mediacion") ? "mediacion" : "sin");
  return GRUPOS_MEDIACION.map(g => {
    const del = cobrados.filter(c => grupoDe(c) === g.k);
    const pctCobrado = del.filter(c => baseReclamo(c) > 0).map(c => Math.round((num(c.monto_cobro_asegurado) / baseReclamo(c)) * 100));
    const dias = del.map(c => diasEntre(c.fecha_derivacion, c.fecha_cobro)).filter(d => d !== null);
    const neto = del.map(c => netoYo(c)).filter(v => v > 0);
    const mejora = g.k === "mediacion" ? del.map(c => {
      // Ofertas antes de la mediación: las marcadas administrativas o, sin esa marca, las anteriores a la fecha de mediación
      const previas = (ofertas[c.id] || []).filter(o => (o.instancia ? o.instancia === "administrativa" : c.fecha_mediacion && String(o.fecha) < aISO(c.fecha_mediacion)));
      const ultima = previas.length ? num(previas[previas.length - 1].monto) : 0;
      return ultima ? Math.round((num(c.monto_cobro_asegurado) / ultima - 1) * 100) : null;
    }).filter(v => v !== null) : [];
    return {
      ...g, casos: del.length,
      pctCobrado: { valor: mediana(pctCobrado), n: pctCobrado.length },
      dias: { valor: mediana(dias), n: dias.length },
      neto: { valor: mediana(neto), n: neto.length },
      mejora: { valor: mediana(mejora), n: mejora.length },
    };
  });
}

// ── Proyección "si todo sale bien" ──────────────────────────────────────────
// Para cada caso en curso sin honorarios cobrados: cuánto cobrarías si se cobra, y cuándo. NO es plata comprometida.
//   Indemnización: lo acordado; si no hay acuerdo, lo reclamado × el % que suele pagar esa compañía (o todas).
//   Honorarios: los cargados; si no, la indemnización × el % de honorarios de la compañía (cargado en Análisis →
//   Compañías, o el que surge de tus casos cobrados).
//   Comisión PAS: la cargada; si no, la proporción habitual sobre los honorarios.
//   Fecha: la comprometida de pago; si no, derivación + lo que suele tardar esa compañía hasta el cobro de honorarios.
// `comisiones` = { pasId: % } (SQL 24): si está cargado, el PAS sin % no cobra comisión; si es null, se usa la proporción habitual.
export function proyeccion(allCasos, companias = {}, hoy = new Date(), comisiones = null) {
  const hoyISO = fechaLocalISO(hoy);
  const { general, companias: porCia } = statsCompanias(allCasos);
  const pctCobradoCia = Object.fromEntries(porCia.map(x => [x.nombre, x.pctCobrado.valor]));
  const cobradosCon = allCasos.filter(c => honorariosCobrados(c) && num(c.monto_cobro_yo) > 0 && num(c.monto_cobro_asegurado) > 0);
  const pctHonorariosDe = lista => mediana(lista.map(c => Math.round((num(c.monto_cobro_yo) / num(c.monto_cobro_asegurado)) * 1000) / 10));
  const pctHonGeneral = pctHonorariosDe(cobradosCon);
  const pctHonDatos = cia => pctHonorariosDe(cobradosCon.filter(c => c.compania_aseguradora === cia));
  const ratioComision = mediana(allCasos.filter(c => num(c.monto_cobro_yo) > 0 && num(c.monto_comision_pas) > 0).map(c => Math.round((num(c.monto_comision_pas) / num(c.monto_cobro_yo)) * 1000) / 10));
  const plazoCia = cia => mediana(allCasos.filter(c => !cia || c.compania_aseguradora === cia).map(c => diasEntre(c.fecha_derivacion, c.fecha_cobro_honorarios)).filter(d => d !== null));
  const plazoGeneral = plazoCia(null);

  let sinDatos = 0;
  const items = allCasos
    .filter(c => esActivo(c) && !honorariosCobrados(c))
    .map(c => {
      const cia = c.compania_aseguradora;
      // Indemnización esperada
      let indem = num(c.monto_acordado), baseTxt = "Acordado";
      if (!indem) {
        const p = pctCobradoCia[cia] ?? general.pctCobrado.valor;
        // Franquicia: se cobra entera. Concurrencia: el % habitual sobre la parte del tercero.
        if (c.tipo_reclamo === "franquicia" && num(c.monto_reclamado)) { indem = num(c.monto_reclamado); baseTxt = "Franquicia (reclamado)"; }
        else if (baseReclamo(c) && p) { indem = Math.round(baseReclamo(c) * p / 100); baseTxt = `${c.tipo_reclamo === "concurrencia" ? "Parte del tercero" : "Reclamado"} × ${p}%${pctCobradoCia[cia] != null ? "" : " (todas)"}`; }
      }
      // Honorarios
      let honor = num(c.monto_cobro_yo), honTxt = "Cargados";
      if (!honor) {
        const cargado = num(companias[cia]?.honorarios_pct), datos = pctHonDatos(cia);
        const p = cargado || datos || pctHonGeneral;
        if (!indem || !p) { sinDatos++; return null; }
        honor = Math.round(indem * p / 100);
        honTxt = `${p}%${cargado ? "" : datos ? " (tus casos)" : " (todas)"}`;
      }
      const pctPas = comisiones ? num(comisiones[String(c._pasId)]) : null;
      const comision = num(c.monto_comision_pas) || (comisiones ? Math.round(honor * (pctPas || 0) / 100) : (ratioComision ? Math.round(honor * ratioComision / 100) : 0));
      // Cuándo
      // Sin plazo en el caso, el plazo habitual de la compañía (desde la firma o la aceptación)
      const plazoHabitual = num(companias[cia]?.plazo_pago_dias);
      let { fecha, segun: cuandoTxt } = fechaPagoComprometida(!num(c.plazo_pago) && plazoHabitual ? { ...c, plazo_pago: plazoHabitual } : c);
      if (!fecha) {
        const plazo = plazoCia(cia) ?? plazoGeneral;
        fecha = c.fecha_derivacion && plazo ? sumarDias(aISO(c.fecha_derivacion), plazo) : null;
        cuandoTxt = fecha ? `Derivación + ${plazo} d` : "Sin datos";
      }
      if (!fecha || fecha < hoyISO) fecha = hoyISO; // lo atrasado o sin fecha, en el mes actual
      return { caso: c, indem, baseTxt, honor, honTxt, comision, neto: honor - comision, fecha, cuandoTxt };
    })
    .filter(Boolean)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Meses: el actual + 5, y "después"
  const meses = [];
  const d0 = new Date(hoyISO + "T12:00:00");
  for (let i = 0; i < 6; i++) {
    const d = new Date(d0.getFullYear(), d0.getMonth() + i, 1);
    meses.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, mes: d.toLocaleDateString("es-AR", { month: "short" }), neto: 0, casos: 0 });
  }
  const despues = { key: "despues", mes: "Después", neto: 0, casos: 0 };
  items.forEach(i => { const m = meses.find(x => x.key === i.fecha.slice(0, 7)) || despues; m.neto += i.neto; m.casos++; });

  const cerrados = allCasos.filter(c => ["cobrado", "desistido"].includes(c.estado));
  const tasaCobro = pct(cerrados.filter(c => c.estado === "cobrado").length, cerrados.length);
  const total = items.reduce((s, i) => s + i.neto, 0);
  return { items, meses: [...meses, despues], total, sinDatos, tasaCobro, esperable: tasaCobro !== null ? Math.round(total * tasaCobro / 100) : null, pctHonGeneral, pctHonDatos };
}
