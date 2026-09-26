// Qué pasa cuando un caso cambia de estado: la fecha de la etapa, la nota en la bitácora,
// la próxima acción sugerida y si conviene avisarle al cliente. Funciones puras.
import { fechaLocalISO, sumarDias } from "./formatters.js";
import { estadoInfo } from "../constants.js";
import { fechaPagoEstimada } from "./vistaCliente.js";
import { margenPara } from "./margenes.js";

// Fecha que se completa sola (si está vacía) al entrar a cada estado
const FECHA_DE_ESTADO = {
  reclamado: "fecha_inicio_reclamo",
  con_ofrecimiento: "fecha_ofrecimiento",
  en_juicio: "fecha_inicio_juicio",
  esperando_pago: "fecha_aceptacion",
};

export function fechasAlCambiarEstado(caso, nuevo, hoy = fechaLocalISO()) {
  const campo = FECHA_DE_ESTADO[nuevo];
  return campo && !caso[campo] ? { [campo]: hoy } : {};
}

export const textoCambioEstado = (anterior, nuevo) =>
  `Pasó de ${estadoInfo(anterior).label} a ${estadoInfo(nuevo).label}`;

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
