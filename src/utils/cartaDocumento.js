// Carta documento para imprimir sobre el formulario preimpreso de Correo Argentino (oficio, 8,5 × 14").
// Solo se imprime el texto, en las posiciones del formulario (tomadas de un PDF de ejemplo que calza).
// Unidades: puntos; y = línea base desde arriba. Helvetica 10 (8 en localidad y provincia).

export const PAGINA = [612, 1008];
const MM = 72 / 25.4;
const COPIA_2 = 266.46; // la segunda mitad del formulario repite remitente y destinatario más abajo

// x, y (línea base) y ancho máximo de cada campo en la primera copia (medidos sobre el PDF de ejemplo)
const CAMPOS = {
  rem: {
    nombre1: { x: 116.22, y: 93.71, ancho: 190, t: 10, negrita: true },
    nombre2: { x: 73.7, y: 116.39, ancho: 232, t: 10, negrita: true },
    domicilio: { x: 110.55, y: 144.73, ancho: 195, t: 10 },
    cp: { x: 79.37, y: 167.41, ancho: 50, t: 10 },
    localidad: { x: 153.07, y: 166.81, ancho: 78, t: 8 },
    provincia: { x: 235.28, y: 166.81, ancho: 72, t: 8 },
  },
  dest: {
    nombre1: { x: 357.17, y: 93.71, ancho: 193, t: 10, negrita: true },
    nombre2: { x: 314.65, y: 116.39, ancho: 235, t: 10, negrita: true },
    domicilio: { x: 351.5, y: 144.73, ancho: 198, t: 10 },
    cp: { x: 320.32, y: 167.41, ancho: 55, t: 10, x2: 323.15 },
    localidad: { x: 388.35, y: 166.81, ancho: 84, t: 8 },
    provincia: { x: 476.22, y: 166.81, ancho: 74, t: 8 },
  },
};
const FECHA = { derecha: 549.9, y: 462.21 };
const CUERPO = { x: 45.35, ancho: 504.55, y: 490.56, interlineado: 11.34 };
export const LINEAS_MAXIMAS = 15; // después viene la firma
const FIRMA = { centro: 425.18, y: 677.65, y2: 691.82 };

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const fechaCarta = (lugar, iso) => {
  const [a, m, d] = iso.split("-").map(Number);
  const mes = MESES[m - 1];
  return `${lugar ? `${lugar}, ` : ""}${d} de ${mes.charAt(0).toUpperCase() + mes.slice(1)} de ${a}`;
};

// Escribe achicando la letra (hasta 6 pt) si no entra en el campo
function escribir(doc, texto, { x, y, ancho, t, negrita }) {
  if (!texto) return;
  doc.setFont("helvetica", negrita ? "bold" : "normal");
  let tam = t;
  doc.setFontSize(tam);
  while (tam > 6 && doc.getTextWidth(texto) > ancho) { tam -= 0.5; doc.setFontSize(tam); }
  doc.text(texto, x, y);
}

// El nombre va en dos renglones: lo que entra en el primero, el resto en el segundo
function partirNombre(doc, nombre, campo1) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(campo1.t);
  const palabras = (nombre || "").trim().split(/\s+/).filter(Boolean);
  let uno = "";
  while (palabras.length && doc.getTextWidth(`${uno} ${palabras[0]}`.trim()) <= campo1.ancho) uno = `${uno} ${palabras.shift()}`.trim();
  return [uno, palabras.join(" ")];
}

function renglonJustificado(doc, linea, x, y, ancho) {
  const palabras = linea.trim().split(/\s+/);
  const anchoPalabras = palabras.reduce((s, p) => s + doc.getTextWidth(p), 0);
  const hueco = palabras.length > 1 ? (ancho - anchoPalabras) / (palabras.length - 1) : 0;
  // Si quedaría muy estirado (renglón corto), va sin justificar
  if (palabras.length < 2 || hueco > doc.getTextWidth(" ") * 4) { doc.text(linea.trim(), x, y); return; }
  let cx = x;
  for (const p of palabras) { doc.text(p, cx, y); cx += doc.getTextWidth(p) + hueco; }
}

// Renglones del cuerpo: cada párrafo justificado salvo su último renglón
export function renglonesCuerpo(doc, texto) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const renglones = [];
  for (const parrafo of String(texto || "").split(/\n+/)) {
    if (!parrafo.trim()) continue;
    const lineas = doc.splitTextToSize(parrafo.trim(), CUERPO.ancho);
    lineas.forEach((l, i) => renglones.push({ texto: l, ultimo: i === lineas.length - 1 }));
  }
  return renglones;
}

// datos: { remitente: { nombre, domicilio, cp, localidad, provincia }, destinatario: {...}, fecha, cuerpo,
//          firma: [renglón1, renglón2] }, opciones: { corrimientoX, corrimientoY (mm), referencias }
export async function generarCarta(datos, { corrimientoX = 0, corrimientoY = 0, referencias = false } = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: PAGINA });
  const dx = corrimientoX * MM, dy = corrimientoY * MM;
  const en = (c, extraY = 0, x2) => ({ ...c, x: (x2 ?? c.x) + dx, y: c.y + dy + extraY });

  if (referencias) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(150);
    for (const extra of [0, COPIA_2]) {
      doc.text("REMITENTE", 74 + dx, 80 + dy + extra);
      doc.text("DESTINATARIO", 315 + dx, 80 + dy + extra);
    }
    doc.text("TEXTO", CUERPO.x + dx, CUERPO.y - 12 + dy);
    doc.setTextColor(0);
  }

  for (const [clave, persona] of [["rem", datos.remitente], ["dest", datos.destinatario]]) {
    const c = CAMPOS[clave];
    const [n1, n2] = partirNombre(doc, (persona.nombre || "").toUpperCase(), c.nombre1);
    for (const extra of [0, COPIA_2]) {
      escribir(doc, n1, en(c.nombre1, extra));
      escribir(doc, n2, en(c.nombre2, extra));
      escribir(doc, persona.domicilio, en(c.domicilio, extra));
      escribir(doc, persona.cp, en(c.cp, extra, extra ? c.cp.x2 : undefined));
      escribir(doc, persona.localidad, en(c.localidad, extra));
      escribir(doc, persona.provincia, en(c.provincia, extra));
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (datos.fecha) doc.text(datos.fecha, FECHA.derecha + dx, FECHA.y + dy, { align: "right" });

  const renglones = renglonesCuerpo(doc, datos.cuerpo);
  renglones.forEach((r, i) => {
    const y = CUERPO.y + dy + i * CUERPO.interlineado;
    if (r.ultimo) doc.text(r.texto.trim(), CUERPO.x + dx, y);
    else renglonJustificado(doc, r.texto, CUERPO.x + dx, y, CUERPO.ancho);
  });

  const [f1, f2] = datos.firma || [];
  if (f1) doc.text(f1, FIRMA.centro + dx, FIRMA.y + dy, { align: "center" });
  if (f2) doc.text(f2, FIRMA.centro + dx, FIRMA.y2 + dy, { align: "center" });

  return { bytes: new Uint8Array(doc.output("arraybuffer")), renglones: renglones.length };
}

// ── Modelos de texto ───────────────────────────────────────────────────────
// {marcas} que se completan con los datos del caso; si falta el dato queda [marca] para completar a mano.
export const MODELOS_BASE = [
  {
    id: "intimacion-pago",
    titulo: "Intimación de pago (acuerdo incumplido)",
    texto: "Me dirijo a Uds. en relación al Siniestro N° {siniestro} (vehículo {vehiculo}, dominio {patente}, ocurrido el {fecha_siniestro}). Habiéndose acordado el pago de la suma de $[monto], a la fecha no se ha efectivizado. Por la presente los INTIMO a que en el plazo perentorio e improrrogable de tres (3) días hábiles de recibida la presente abonen la suma acordada, con más sus intereses, bajo apercibimiento de iniciar las acciones judiciales correspondientes y de efectuar la denuncia ante la Superintendencia de Seguros de la Nación, con costas a su cargo. Quedan Uds. debidamente notificados.",
  },
  {
    id: "reclamo-tercero",
    titulo: "Reclamo de tercero damnificado",
    texto: "Me dirijo a Uds. a fin de formular formal reclamo por los daños sufridos en el vehículo dominio {patente} con motivo del siniestro ocurrido el {fecha_siniestro}, del que resultó responsable el conductor del vehículo asegurado por esa compañía. Solicito se sirvan informar el número de siniestro asignado y abonar los daños reclamados dentro del plazo legal, poniendo a su disposición la documentación respaldatoria. Bajo apercibimiento de iniciar las acciones legales pertinentes, con costas. Quedan Uds. debidamente notificados.",
  },
  {
    id: "art-56",
    titulo: "Asegurado: falta de pronunciamiento (art. 56 Ley 17.418)",
    texto: "Me dirijo a Uds. como asegurado en relación al Siniestro N° {siniestro} (dominio {patente}, ocurrido el {fecha_siniestro}). Habiendo transcurrido holgadamente el plazo de treinta (30) días previsto por el art. 56 de la Ley 17.418 sin que se hayan pronunciado sobre mi derecho, su silencio importa aceptación. En consecuencia, los INTIMO a abonar la indemnización correspondiente en el plazo de tres (3) días hábiles de recibida la presente, bajo apercibimiento de iniciar las acciones judiciales pertinentes y de efectuar la denuncia ante la Superintendencia de Seguros de la Nación. Quedan Uds. debidamente notificados.",
  },
  { id: "blanco", titulo: "En blanco", texto: "" },
];

const fechaDMA = iso => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");

export function completarModelo(texto, caso) {
  const valores = caso ? {
    siniestro: caso.nro_siniestro, patente: caso.patente, vehiculo: caso.vehiculo,
    fecha_siniestro: fechaDMA(caso.fecha_siniestro), compania: caso.compania_aseguradora, asegurado: caso.asegurado,
  } : {};
  return texto.replace(/\{(\w+)\}/g, (_, k) => (valores[k] ? String(valores[k]).trim() : `[${k.replace("_", " ")}]`));
}
