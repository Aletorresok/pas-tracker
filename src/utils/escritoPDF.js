// Texto de un escrito (ya completado) → PDF A4 con jsPDF: títulos, renglones de encabezado, párrafos justificados
// con **negrita** en cualquier parte, ítems, firmas según el modelo y el pie con el logo (pdfMembrete.js).
// jsPDF se importa recién al generar.
import { bloques } from "./plantillas.js";
import { dibujarPie } from "./pdfMembrete.js";

const MARGEN = 20, ANCHO = 170, TOPE = 262, INICIO = 25; // mm; el pie empieza en 274
const CUERPO = 11, INTERLINEA = 5.8;

// Tramos {t, negrita} → palabras; una palabra puede tener partes en negrita y partes no ("**cuatro**.")
function palabrasDe(tramos) {
  const palabras = [];
  let pegar = false; // el próximo pedazo va pegado a la palabra anterior
  tramos.forEach(({ t, negrita }) => {
    t.split(/(\s+)/).forEach(pedazo => {
      if (!pedazo) return;
      if (/^\s+$/.test(pedazo)) { pegar = false; return; }
      if (pegar && palabras.length) palabras[palabras.length - 1].push({ t: pedazo, negrita });
      else palabras.push([{ t: pedazo, negrita }]);
      pegar = true;
    });
  });
  return palabras;
}

function anchoPalabra(doc, partes, tam) {
  return partes.reduce((s, p) => { doc.setFont("helvetica", p.negrita ? "bold" : "normal"); doc.setFontSize(tam); return s + doc.getTextWidth(p.t); }, 0);
}

// Parte las palabras en renglones de `ancho` mm
function renglones(doc, palabras, ancho, tam) {
  doc.setFont("helvetica", "normal"); doc.setFontSize(tam);
  const espacio = doc.getTextWidth(" ");
  const out = [];
  let actual = [], usado = 0;
  palabras.forEach(p => {
    const w = anchoPalabra(doc, p, tam);
    const extra = actual.length ? espacio + w : w;
    if (actual.length && usado + extra > ancho) { out.push({ palabras: actual, usado }); actual = [{ p, w }]; usado = w; }
    else { actual.push({ p, w }); usado += extra; }
  });
  if (actual.length) out.push({ palabras: actual, usado });
  return { lineas: out, espacio };
}

function dibujarRenglon(doc, { palabras }, x, y, ancho, espacio, justificar, tam) {
  const libre = ancho - palabras.reduce((s, q) => s + q.w, 0);
  const hueco = justificar && palabras.length > 1 ? libre / (palabras.length - 1) : espacio;
  let cx = x;
  palabras.forEach(({ p, w }) => {
    let px = cx;
    p.forEach(parte => {
      doc.setFont("helvetica", parte.negrita ? "bold" : "normal"); doc.setFontSize(tam);
      doc.text(parte.t, px, y);
      px += doc.getTextWidth(parte.t);
    });
    cx += w + hueco;
  });
}

/**
 * @param {object} p
 * @param {string} p.texto          texto final (el de la vista previa)
 * @param {string} p.firma          cliente | estudio | ambos | ninguna
 * @param {object} p.estudio        datos del abogado (utils/estudio.js)
 * @param {boolean} [p.membrete]    pie con el logo
 * @returns {Promise<ArrayBuffer>}
 */
export async function armarEscritoPDF({ texto, firma = "estudio", estudio = {}, membrete = true }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = INICIO;
  const lugar = alto => { if (y + alto > TOPE) { doc.addPage(); y = INICIO; } };

  const lista = bloques(texto);
  lista.forEach((b, i) => {
    const siguiente = lista[i + 1];
    if (b.tipo === "titulo") {
      const { lineas, espacio } = renglones(doc, palabrasDe(b.tramos.map(t => ({ ...t, negrita: true }))), ANCHO, 14);
      lineas.forEach(l => { lugar(7); dibujarRenglon(doc, l, MARGEN, y, ANCHO, espacio, false, 14); y += 7; });
      y += 2;
      return;
    }
    const sangria = b.tipo === "item" ? 4 : 0;
    const { lineas, espacio } = renglones(doc, palabrasDe(b.tramos), ANCHO - sangria, CUERPO);
    lineas.forEach((l, j) => {
      lugar(INTERLINEA);
      const justificar = b.tipo === "parrafo" && j < lineas.length - 1;
      dibujarRenglon(doc, l, MARGEN + sangria, y, ANCHO - sangria, espacio, justificar, CUERPO);
      y += INTERLINEA;
    });
    // Separación: los renglones de encabezado y los ítems van juntos; entre bloques distintos, aire
    const mismoGrupo = siguiente && siguiente.tipo === b.tipo && (b.tipo === "linea" || b.tipo === "item");
    y += mismoGrupo ? 0.6 : 4;
  });

  dibujarFirmas(doc, firma, estudio, y);
  if (membrete) dibujarPie(doc, { margen: MARGEN, ancho: ANCHO });
  doc.setTextColor("#000000");
  return doc.output("arraybuffer");
}

function dibujarFirmas(doc, firma, estudio, yTexto) {
  if (firma === "ninguna") return;
  let y = Math.max(yTexto + 26, 235);
  if (y + 14 > TOPE) { doc.addPage(); y = 60; }
  doc.setLineWidth(0.3); doc.setDrawColor("#000000"); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const linea = (x, ancho, textos) => {
    doc.line(x, y, x + ancho, y);
    textos.forEach((t, i) => {
      const renglon = doc.splitTextToSize(t, ancho + 10);
      doc.text(renglon, x + ancho / 2, y + 5 + i * 4.5, { align: "center" });
    });
  };
  const abogado = [estudio.abogado || "", "Abogado"].filter(Boolean);
  if (firma === "cliente") {
    // Tres espacios para que el cliente complete a mano, como el reclamo de siempre
    const w = 50, sep = (ANCHO - w * 3) / 2;
    ["Firma", "Aclaración", "DNI"].forEach((t, i) => linea(MARGEN + i * (w + sep), w, [t]));
  } else if (firma === "estudio") {
    linea(MARGEN + ANCHO - 70, 70, abogado);
  } else { // ambos
    linea(MARGEN, 70, ["Firma y aclaración del cliente"]);
    linea(MARGEN + ANCHO - 70, 70, abogado);
  }
}

// Nombre de archivo: "Aceptación de ofrecimiento - GOMEZ Maria.pdf" (sin caracteres que Windows no acepta)
export function nombreArchivo(titulo, de, ext = "pdf") {
  const limpio = s => String(s || "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  return `${[limpio(titulo), limpio(de)].filter(Boolean).join(" - ").slice(0, 120)}.${ext}`;
}
