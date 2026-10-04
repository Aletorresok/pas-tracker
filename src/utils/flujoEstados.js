// Qué pasa cuando un caso cambia de estado: la fecha de la etapa, la nota en la bitácora,
// la próxima acción sugerida y si conviene avisarle al cliente. Funciones puras.
import { fechaLocalISO, sumarDias } from "./formatters.js";
import { estadoInfo } from "../constants.js";
import { fechaPagoEstimada } from "./vistaCliente.js";
import { margenPara } from "./margenes.js";

// Fechas que se completan solas (si están vacías) al entrar a cada estado.
// Iniciado = cargó el reclamo o pidió mediación; Reclamado = primer pedido de respuesta a la compañía.
// Si se saltea Iniciado, Reclamado completa también el inicio.
const FECHAS_DE_ESTADO = {
  iniciado: ["fecha_inicio_reclamo"],
  reclamado: ["fecha_inicio_reclamo", "fecha_reclamo"],
  con_ofrecimiento: ["fecha_ofrecimiento"],
  en_juicio: ["fecha_inicio_juicio"],
  esperando_pago: ["fecha_aceptacion", "fecha_firma"], // pasa a Esperando pago con la conformidad firmada
};

export function fechasAlCambiarEstado(caso, nuevo, hoy = fechaLocalISO()) {
  const fechas = {};
  (FECHAS_DE_ESTADO[nuevo] || []).forEach(campo => { if (!caso[campo]) fechas[campo] = hoy; });
  return fechas;
}

export const textoCambioEstado = (anterior, nuevo, nota = "") =>
  `Pasó de ${estadoInfo(anterior).label} a ${estadoInfo(nuevo).label}${nota ? `: ${nota}` : ""}`;

// ── Datos que pide o limpia un cambio de etapa ───────────────────────────────
// Esperando pago, Cobrado y Desistido piden su dato (fecha y monto, monto, motivo).
export const ESTADOS_CON_DATOS = ["esperando_pago", "cobrado", "desistido"];

// Datos que pertenecen a una etapa: al volver a una anterior ya no corresponden.
// Las fechas se ofrecen tildadas para borrar; montos y plazo, sin tildar.
const DATOS_DE_ETAPA = [
  { campo: "fecha_inicio_reclamo", label: "Fecha de inicio del reclamo", etapa: 2, fecha: true },
  { campo: "fecha_reclamo", label: "Fecha del reclamo", etapa: 3, fecha: true },
  { campo: "fecha_ofrecimiento", label: "Fecha del ofrecimiento", etapa: 4, fecha: true },
  { campo: "fecha_inicio_juicio", label: "Fecha de inicio del juicio", etapa: 5, fecha: true },
  { campo: "fecha_aceptacion", label: "Fecha de aceptación", etapa: 6, fecha: true },
  { campo: "fecha_firma", label: "Fecha de firma del acuerdo", etapa: 6, fecha: true },
  { campo: "fecha_pago", label: "Fecha de pago", etapa: 6, fecha: true },
  { campo: "monto_acordado", label: "Monto acordado", etapa: 6 },
  { campo: "plazo_pago", label: "Plazo de pago", etapa: 6 },
  { campo: "fecha_cobro", label: "Fecha en que cobró el asegurado", etapa: 7, fecha: true },
];

// Volver a una etapa anterior (Desistido no cuenta: no es parte del camino)
export const esRetroceso = (anterior, nuevo) => {
  const a = estadoInfo(anterior).etapa, n = estadoInfo(nuevo).etapa;
  return a > 0 && n > 0 && n < a;
};

// Lo que sobra al volver a `nuevo`: [{ campo, label, valor, fecha, marcado }]
export function datosQueSobran(caso, nuevo) {
  if (!esRetroceso(caso.estado, nuevo)) return [];
  const hasta = estadoInfo(nuevo).etapa;
  return DATOS_DE_ETAPA
    .filter(d => d.etapa > hasta && caso[d.campo] !== null && caso[d.campo] !== undefined && caso[d.campo] !== "" && Number(caso[d.campo]) !== 0)
    .map(d => ({ ...d, valor: caso[d.campo], marcado: !!d.fecha }));
}

// ¿Hace falta preguntar algo antes de mover el caso?
export const pideDialogoEtapa = (caso, nuevo) => ESTADOS_CON_DATOS.includes(nuevo) || datosQueSobran(caso, nuevo).length > 0;

// Estados en los que conviene avisarle al cliente en el momento
export const ESTADOS_CON_AVISO = ["con_ofrecimiento", "esperando_pago"];

// Próxima acción que se propone al entrar a un estado: { texto, vence } o null
export function accionSugerida(caso, margenes = {}, hoy = fechaLocalISO()) {
  const cia = caso.compania_aseguradora || "la compañía";
  const en = dias => sumarDias(hoy, dias);
  switch (caso.estado) {
    case "doc_pendiente": return { texto: "Pedirle la documentación al cliente", vence: en(3) };
    case "iniciado": return { texto: "Presentar el reclamo", vence: en(3) };
    case "reclamado": return { texto: `Controlar la respuesta de ${cia} y reiterar si no contestó`, vence: en(margenPara(margenes, caso.compania_aseguradora)) };
    case "con_ofrecimiento": return { texto: "Hablar el ofrecimiento con el cliente", vence: en(3) };
    case "en_mediacion": return { texto: "Preparar la mediación", vence: en(7) };
    case "en_juicio": return { texto: "Seguimiento del expediente", vence: en(30) };
    case "esperando_pago": {
      const f = fechaPagoEstimada(caso);
      return { texto: `Controlar que ${cia} pague`, vence: f && f > hoy ? f : en(30) };
    }
    default: return null;
  }
}

// ── Prescripción ─────────────────────────────────────────────────────────────
// Plazo desde la fecha del siniestro y con cuánta anticipación avisar. Ajustables.
export const PRESCRIPCION_ANIOS = 3;
export const PRESCRIPCION_AVISO_DIAS = 90;
// En juicio (la demanda interrumpe) o con acuerdo firmado ya no corre el riesgo
const SIN_RIESGO = ["en_juicio", "esperando_pago", "cobrado", "desistido"];

// { vence, dias } si el caso está dentro del aviso (o ya venció); null si no
export function prescripcion(caso, hoy = fechaLocalISO()) {
  if (!caso.fecha_siniestro || SIN_RIESGO.includes(caso.estado)) return null;
  const siniestro = String(caso.fecha_siniestro).slice(0, 10);
  const [y, m, d] = siniestro.split("-").map(Number);
  if (!y) return null;
  const vence = `${y + PRESCRIPCION_ANIOS}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const dias = Math.round((new Date(vence + "T12:00:00") - new Date(hoy + "T12:00:00")) / 86400000);
  return dias <= PRESCRIPCION_AVISO_DIAS ? { vence, dias } : null;
}
