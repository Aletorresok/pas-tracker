// Textos de la vista del cliente, compartidos con la ficha del caso (para que veas lo mismo que ve el cliente).
import { fmtDate, fmtMoney } from "./formatters.js";
import { ESTADOS_CASO, estadoInfo } from "../constants.js";

const masDias = (iso, dias) => {
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  d.setDate(d.getDate() + Number(dias));
  return d.toISOString().slice(0, 10);
};

// Fecha en que la compañía se comprometió a pagar y de dónde sale: firma + plazo del convenio; si no hay firma,
// aceptación + plazo; si no hay plazo, la fecha de pago cargada. { fecha, segun } (fecha null si no hay datos).
export function fechaPagoComprometida(c) {
  const plazo = Number(c.plazo_pago);
  if (c.fecha_firma && plazo) return { fecha: masDias(c.fecha_firma, plazo), segun: `Firma + ${plazo} d` };
  if (c.fecha_aceptacion && plazo) return { fecha: masDias(c.fecha_aceptacion, plazo), segun: `Aceptación + ${plazo} d` };
  if (c.fecha_pago) return { fecha: String(c.fecha_pago).slice(0, 10), segun: "Fecha de pago" };
  return { fecha: null, segun: null };
}
export const fechaPagoEstimada = c => fechaPagoComprometida(c).fecha;

// Qué está pasando ahora con el caso, en palabras para el cliente.
// Si el estudio no escribió un mensaje, es lo que el cliente ve como "Mensaje del estudio".
export function textoEtapaCliente(caso) {
  const cia = caso.compania_aseguradora || "la compañía";
  switch (caso.estado) {
    case "doc_pendiente": return "Estamos reuniendo la documentación de tu siniestro. Si te pedimos algo, mandalo cuanto antes así avanzamos.";
    case "iniciado": return "Ya tenemos tu caso y estamos preparando el reclamo.";
    case "reclamado": return `Presentamos el reclamo ante ${cia}. Ahora esperamos su respuesta.`;
    case "con_ofrecimiento": return `${cia} hizo un ofrecimiento. Lo estamos analizando para conseguir el mejor monto posible.`;
    case "en_mediacion": return `El caso está en mediación: una reunión formal para llegar a un acuerdo con ${cia}.`;
    case "en_juicio": return "Iniciamos una demanda judicial para defender tu reclamo. Estos procesos llevan más tiempo; te vamos a ir contando.";
    case "esperando_pago": {
      const f = fechaPagoEstimada(caso);
      return f
        ? `Hay acuerdo. Ahora ${cia} tiene que pagar (fecha estimada: ${fmtDate(f)}). Si pasada esa fecha no recibiste el pago, avisanos por WhatsApp así lo reclamamos.`
        : `Hay acuerdo. Ahora ${cia} tiene que pagar.`;
    }
    case "cobrado": {
      const monto = Number(caso.monto_cobro_asegurado) || 0;
      return monto ? `¡Listo! Cobraste ${fmtMoney(monto)}${caso.fecha_cobro ? ` el ${fmtDate(caso.fecha_cobro)}` : ""}.` : "¡Listo! Tu reclamo está cobrado.";
    }
    case "desistido": return "Este reclamo quedó cerrado. Si tenés dudas, escribinos.";
    default: return "";
  }
}

// Si las fechas cargadas muestran que el caso avanzó más que su estado, sugiere el estado que corresponde.
// Sirve para que el cliente (que ve la etapa según el estado) no vea el caso atrasado.
const ORDEN = Object.fromEntries(ESTADOS_CASO.map((e, i) => [e.key, i]));
export function estadoSugerido(caso) {
  if (["cobrado", "desistido"].includes(caso.estado)) return null;
  const actual = ORDEN[caso.estado] ?? -1;
  const pistas = [
    [caso.fecha_inicio_reclamo, "reclamado", "fecha de inicio del reclamo"],
    [caso.fecha_ofrecimiento, "con_ofrecimiento", "fecha de ofrecimiento"],
    [caso.fecha_inicio_juicio, "en_juicio", "fecha de inicio del juicio"],
    [caso.fecha_aceptacion || caso.fecha_firma, "esperando_pago", "fecha de aceptación o firma del acuerdo"],
  ].filter(([fecha, estado]) => fecha && ORDEN[estado] > actual);
  if (!pistas.length) return null;
  const [, estado, motivo] = pistas.reduce((a, b) => (ORDEN[b[1]] > ORDEN[a[1]] ? b : a));
  return { estado, motivo, label: estadoInfo(estado).label, actualLabel: estadoInfo(caso.estado).label };
}
