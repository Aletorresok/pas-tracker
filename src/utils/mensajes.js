// Plantillas de WhatsApp para el cliente y el PAS, completadas con los datos del caso.
import { fmtMoney, fmtDate, primerNombre } from "./formatters.js";

export const FIRMA = "Dr. Alexis Torres Gaveglio";

// Número para wa.me en formato argentino de celular: 54 9 + característica + número.
// Acepta "11 3313-3259", "011 15 3313 3259", "+54 9 11 3313 3259", etc. Devuelve "" si no hay número.
export function telefonoWa(tel) {
  let d = String(tel || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (!d.startsWith("9")) d = "9" + d;
  // "11 15 xxxx xxxx" → sin el 15 (solo en el caso típico de 10 dígitos + 15)
  const sin9 = d.slice(1);
  if (sin9.length === 12 && /^\d{2,4}15/.test(sin9)) {
    const m = sin9.match(/^(\d{2,4})15(\d{6,8})$/);
    if (m && (m[1] + m[2]).length === 10) d = "9" + m[1] + m[2];
  }
  return "54" + d;
}

export const linkWhatsApp = (tel, texto) => {
  const n = telefonoWa(tel);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
};

export const linkVistaCliente = (patente) =>
  `${window.location.origin}/?vista=cliente&patente=${encodeURIComponent(String(patente || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase())}`;

// Los asegurados se cargan como "APELLIDO NOMBRE": el saludo usa la segunda palabra
const nombreCliente = (c) => primerNombre(c.asegurado || "");
const cia = (c) => c.compania_aseguradora || "la compañía";
const monto = (v) => (Number(v) > 0 ? fmtMoney(Number(v)) : "");

// Plantillas para el cliente. `cuerpo` es lo que puede quedar como "Mensaje del estudio" en el portal.
export const PLANTILLAS_CLIENTE = [
  {
    k: "primer_contacto", l: "Primer contacto",
    cuerpo: (c) => `Recibimos tu caso y nos vamos a encargar del reclamo ante ${cia(c)}.`,
    texto: (c, x) => `Hola ${nombreCliente(c)}, ¿cómo estás? Soy el ${FIRMA}, abogado. ${x.pasNombre ? `${x.pasNombre} me pasó tu caso` : "Me pasaron tu caso"} por el siniestro${c.patente ? ` del vehículo ${c.patente}` : ""}. Me voy a encargar del reclamo ante ${cia(c)}. ¿Tenés un minuto para que hablemos?`,
  },
  {
    k: "documentacion", l: "Pedir documentación",
    cuerpo: () => "Para avanzar con el reclamo necesitamos: denuncia administrativa, fotos de los daños, DNI (frente y dorso), cédula verde y certificado de cobertura.",
  },
  {
    k: "reclamo", l: "Reclamo presentado",
    cuerpo: (c) => `Ya presentamos el reclamo ante ${cia(c)}. Ahora esperamos su respuesta; te avisamos apenas haya novedades.`,
  },
  {
    k: "ofrecimiento", l: "Llegó un ofrecimiento",
    cuerpo: (c) => `${cia(c)} ofreció ${monto(c.monto_ofrecimiento) || "un monto"} por tu reclamo. Lo estamos analizando para conseguir el mejor monto posible; te llamo para charlarlo.`,
  },
  {
    k: "acuerdo", l: "Acuerdo firmado",
    cuerpo: (c) => `Cerramos el acuerdo con ${cia(c)}. El pago está previsto ${c.fecha_pago ? `para el ${fmtDate(c.fecha_pago)}` : "para los próximos días"}; te avisamos cuando se acredite.`,
  },
  {
    k: "cobrado", l: "Pago acreditado",
    cuerpo: (c) => `¡Buenas noticias! ${cia(c)} ya pagó${monto(c.monto_cobro_asegurado) ? `: te corresponden ${monto(c.monto_cobro_asegurado)}` : ""}. Coordinemos para liquidarte.`,
  },
  {
    k: "seguimiento", l: "Link para seguir el caso",
    cuerpo: (c) => `Podés ver cómo va tu reclamo cuando quieras en ${linkVistaCliente(c.patente)} (con tu patente y los últimos 3 números de tu DNI).`,
  },
];

// Qué contar según el estado, para el PAS
const NOVEDAD_POR_ESTADO = {
  doc_pendiente: "estamos juntando la documentación con el asegurado.",
  iniciado: "estamos preparando el reclamo.",
  reclamado: (c) => `ya presentamos el reclamo ante ${cia(c)} y esperamos respuesta.`,
  con_ofrecimiento: (c) => `${cia(c)} ofreció ${monto(c.monto_ofrecimiento) || "un monto"}; lo estamos negociando.`,
  en_mediacion: "está en mediación.",
  en_juicio: "iniciamos la demanda judicial.",
  esperando_pago: (c) => `hay acuerdo y esperamos el pago${c.fecha_pago ? ` (previsto para el ${fmtDate(c.fecha_pago)})` : ""}.`,
  cobrado: (c) => `¡se cobró!${monto(c.monto_comision_pas) ? ` Tu comisión es de ${monto(c.monto_comision_pas)}.` : ""}`,
  desistido: "lo cerramos sin reclamo.",
};

export const PLANTILLAS_PAS = [
  {
    k: "tomado", l: "Ya tomé el caso",
    texto: (c, x) => `Hola ${primerNombre(x.pasNombre)}, ¿cómo estás? Ya tomé el caso de ${c.asegurado || "tu asegurado"}${c.patente ? ` (${c.patente})` : ""}. Me contacto con el asegurado y te voy contando. ¡Gracias por la confianza!`,
  },
  {
    k: "novedad", l: "Novedad del caso",
    texto: (c, x) => {
      const n = NOVEDAD_POR_ESTADO[c.estado];
      const txt = typeof n === "function" ? n(c) : n || "seguimos trabajando.";
      return `Hola ${primerNombre(x.pasNombre)}, te cuento cómo va el caso de ${c.asegurado || "tu asegurado"}: ${txt}`;
    },
  },
];

// Plantilla sugerida según el estado del caso
export function plantillaSugerida(c) {
  switch (c.estado) {
    case "doc_pendiente": return c.fecha_contacto_asegurado ? "documentacion" : "primer_contacto";
    case "iniciado": return c.fecha_contacto_asegurado ? "documentacion" : "primer_contacto";
    case "reclamado": return "reclamo";
    case "con_ofrecimiento": return "ofrecimiento";
    case "esperando_pago": return "acuerdo";
    case "cobrado": return "cobrado";
    default: return "seguimiento";
  }
}

// Texto completo de una plantilla para el cliente (saludo + cuerpo + firma)
export function textoCliente(p, c, x = {}) {
  if (p.texto) return p.texto(c, x);
  return `Hola ${nombreCliente(c)}, ¿cómo estás? ${p.cuerpo(c, x)}\n\n${FIRMA}`;
}
