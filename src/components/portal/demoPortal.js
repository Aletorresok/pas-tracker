// Demostración del portal de productores (/portal/demo): casos inventados, sin login y sin tocar la base.
// Las fechas se arman relativas a hoy, así la demo siempre se ve al día. Sin comisión (no se ofrece a PAS nuevos).
import { fechaEnDias } from "../../utils/formatters.js";

export const PAS_DEMO = { nombre: "Productor de ejemplo" };
export const TEXTO_ACCESO = "Hola Alexis, vi la demostración del portal de productores y quiero mi acceso.";

const mov = (dias, texto) => ({ texto, fecha: fechaEnDias(dias), ts: Date.parse(fechaEnDias(dias)) + 12 * 3600e3 });

export function casosDemo() {
  return [
    {
      id: "demo-1", asegurado: "Romero Lucía", patente: "AE512KD", compania_aseguradora: "Sancor",
      estado: "doc_pendiente", fecha_derivacion: fechaEnDias(-1), fecha_ultimo_movimiento: fechaEnDias(-1),
      telefono_asegurado: "1155550101",
      mensaje_cliente: "Recibimos tu caso. Te escribimos por WhatsApp para pedirte la cédula verde y las fotos del auto.",
      movimientos: [mov(-1, "Caso recibido. Se le pidió la documentación al asegurado.")],
    },
    {
      id: "demo-2", asegurado: "Fernández Martín", patente: "AC318PL", compania_aseguradora: "Federación Patronal",
      estado: "reclamado", fecha_derivacion: fechaEnDias(-30), fecha_inicio_reclamo: fechaEnDias(-24), fecha_reclamo: fechaEnDias(-22),
      fecha_ultimo_movimiento: fechaEnDias(-3), dni_asegurado: "30512487", telefono_asegurado: "1155550102",
      mensaje_cliente: "El reclamo está presentado. La compañía pidió el presupuesto del taller y ya se lo mandamos.",
      movimientos: [
        mov(-3, "La compañía pidió el presupuesto del taller: enviado."),
        mov(-22, "Pasó de Iniciado a Reclamado"),
        mov(-24, "Se presentó el reclamo con fotos, denuncia y presupuesto."),
      ],
    },
    {
      id: "demo-3", asegurado: "Suárez Carolina", patente: "AD904MN", compania_aseguradora: "La Segunda",
      estado: "con_ofrecimiento", fecha_derivacion: fechaEnDias(-58), fecha_inicio_reclamo: fechaEnDias(-50), fecha_reclamo: fechaEnDias(-48),
      fecha_ofrecimiento: fechaEnDias(-2), monto_ofrecimiento: 1850000, fecha_ultimo_movimiento: fechaEnDias(-2),
      dni_asegurado: "28441903", telefono_asegurado: "1155550103",
      mensaje_cliente: "La compañía ofreció $1.850.000. Lo estamos analizando para mejorarlo; te aviso esta semana.",
      movimientos: [
        mov(-2, "Pasó de Reclamado a Con ofrecimiento"),
        mov(-20, "Se reiteró el reclamo y se pidió respuesta."),
        mov(-48, "Pasó de Iniciado a Reclamado"),
      ],
    },
    {
      id: "demo-4", asegurado: "Gómez Pablo", patente: "AB276RT", compania_aseguradora: "San Cristóbal",
      estado: "en_mediacion", fecha_derivacion: fechaEnDias(-110), fecha_inicio_reclamo: fechaEnDias(-100), fecha_reclamo: fechaEnDias(-98),
      fecha_ofrecimiento: fechaEnDias(-60), monto_ofrecimiento: 900000, fecha_ultimo_movimiento: fechaEnDias(-5),
      dni_asegurado: "33120566", telefono_asegurado: "1155550104",
      mensaje_cliente: "La compañía ofreció poco, así que vamos a mediación. Te pasamos la fecha y el link de la audiencia.",
      movimientos: [
        mov(-5, "Se agendó la audiencia de mediación."),
        mov(-30, "Pasó de Con ofrecimiento a En mediación"),
        mov(-60, "Pasó de Reclamado a Con ofrecimiento"),
      ],
    },
    {
      id: "demo-5", asegurado: "Díaz Valeria", patente: "AF155GH", compania_aseguradora: "Mercantil Andina",
      estado: "esperando_pago", fecha_derivacion: fechaEnDias(-90), fecha_inicio_reclamo: fechaEnDias(-84), fecha_reclamo: fechaEnDias(-82),
      fecha_ofrecimiento: fechaEnDias(-30), monto_ofrecimiento: 2300000, monto_acordado: 2300000,
      fecha_aceptacion: fechaEnDias(-12), fecha_firma: fechaEnDias(-10), plazo_pago: 30, fecha_ultimo_movimiento: fechaEnDias(-10),
      dni_asegurado: "35882014", telefono_asegurado: "1155550105",
      mensaje_cliente: "Firmaste el acuerdo por $2.300.000. La compañía tiene 30 días para pagar; te avisamos apenas se acredite.",
      movimientos: [
        mov(-10, "Pasó de Con ofrecimiento a Esperando pago"),
        mov(-12, "Se aceptó el ofrecimiento de $2.300.000."),
      ],
    },
    {
      id: "demo-6", asegurado: "Benítez Raúl", patente: "AA730BC", compania_aseguradora: "Rivadavia",
      estado: "cobrado", fecha_derivacion: fechaEnDias(-140), fecha_inicio_reclamo: fechaEnDias(-132), fecha_ofrecimiento: fechaEnDias(-70),
      monto_ofrecimiento: 1400000, monto_acordado: 1400000, monto_cobro_asegurado: 1400000,
      fecha_cobro: fechaEnDias(-15), fecha_ultimo_movimiento: fechaEnDias(-15),
      mensaje_cliente: "¡Listo! La compañía pagó $1.400.000.",
      movimientos: [mov(-15, "Pasó de Esperando pago a Cobrado")],
    },
  ];
}

// Próxima mediación del caso 4
export function eventosDemo() {
  const d = new Date(`${fechaEnDias(6)}T10:00:00-03:00`);
  return { "demo-4": { caso_id: "demo-4", tipo: "mediacion", inicio: d.toISOString() } };
}

// "Plazos por compañía" del portal: días hasta el ofrecimiento, hasta el cobro y % cobrado sobre lo reclamado
export function plazosDemo() {
  // Números inventados y moderados: ~1 mes hasta el ofrecimiento, ~2 meses hasta el cobro, ~90% de lo reclamado
  const filas = [];
  [["Sancor", [25, 30, 34]], ["Federación Patronal", [20, 24, 28]], ["La Segunda", [30, 35, 40]], ["Rivadavia", [32, 38]], ["Mercantil Andina", [26, 31]]]
    .forEach(([cia, dias]) => dias.forEach((d, i) => filas.push({
      compania_aseguradora: cia, estado: "cobrado",
      fecha_inicio_reclamo: fechaEnDias(-d - 40), fecha_ofrecimiento: fechaEnDias(-40),
      monto_reclamado: 2000000, monto_ofrecimiento: 1700000 + i * 100000, monto_cobro_asegurado: 1750000 + i * 100000,
      // Ejemplos de instancia y pagos: el tercer caso se arregló en mediación; Rivadavia pagó una vez 3 días tarde
      instancia_ofrecimiento: i === 2 ? "mediacion" : "administrativa",
      fecha_aceptacion: fechaEnDias(-35), plazo_pago: 30,
      fecha_cobro: fechaEnDias(cia === "Rivadavia" && i === 0 ? -2 : -10),
    })));
  // Un reclamo que todavía espera el ofrecimiento (cuenta en "Días hasta ofrecimiento")
  filas.push({ compania_aseguradora: "Sancor", estado: "reclamado", fecha_inicio_reclamo: fechaEnDias(-18), monto_reclamado: 1800000 });
  return filas;
}
