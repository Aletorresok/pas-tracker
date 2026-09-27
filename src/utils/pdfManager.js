// Gestor de PDF: combina PDFs e imágenes de la carpeta del caso en un único PDF,
// con portada + índice y membrete institucional. Usa pdf-lib (import dinámico:
// solo se descarga cuando se abre el Gestor de PDF, no infla el bundle principal).
import { DORADO, AZUL } from "./pdfMembrete.js";

const A4 = [595.28, 841.89];
const MARGEN = 40;

const hexRgb = hex => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const esPdf = archivo => archivo.ext === ".pdf";
export const esImagen = archivo => [".jpg", ".jpeg", ".png"].includes(archivo.ext);

async function agregarPaginaImagen(pdfDoc, PDFLib, archivo, rotacion) {
  const bytes = await archivo.blob.arrayBuffer();
  const img = archivo.ext === ".png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
  const page = pdfDoc.addPage(A4);
  const maxW = A4[0] - MARGEN * 2, maxH = A4[1] - MARGEN * 2;
  const escala = Math.min(maxW / img.width, maxH / img.height, 1);
  const w = img.width * escala, h = img.height * escala;
  page.drawImage(img, { x: (A4[0] - w) / 2, y: (A4[1] - h) / 2, width: w, height: h });
  if (rotacion) page.setRotation(PDFLib.degrees(rotacion));
}

async function agregarPaginasPdf(pdfDoc, PDFLib, archivo, rotacion) {
  const bytes = await archivo.blob.arrayBuffer();
  const src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
  const copiadas = await pdfDoc.copyPages(src, src.getPageIndices());
  copiadas.forEach(p => {
    if (rotacion) p.setRotation(PDFLib.degrees((p.getRotation().angle + rotacion) % 360));
    pdfDoc.addPage(p);
  });
}

function dibujarPortada(pdfDoc, PDFLib, font, fontBold, { caso, items }) {
  const azul = PDFLib.rgb(...hexRgb(AZUL));
  const dorado = PDFLib.rgb(...hexRgb(DORADO));
  const page = pdfDoc.insertPage(0, A4);
  let y = A4[1] - 90;

  page.drawText("DOCUMENTACIÓN COMPLETA", { x: MARGEN, y, size: 20, font: fontBold, color: azul });
  y -= 10;
  page.drawLine({ start: { x: MARGEN, y }, end: { x: A4[0] - MARGEN, y }, thickness: 1, color: dorado });
  y -= 28;

  const linea = (txt, size = 12, f = font) => { page.drawText(txt, { x: MARGEN, y, size, font: f, color: azul }); y -= size + 6; };
  if (caso?.asegurado) linea(`Asegurado: ${caso.asegurado}`);
  if (caso?.compania_aseguradora) linea(`Compañía: ${caso.compania_aseguradora}`);
  if (caso?.nro_siniestro) linea(`N° de siniestro: ${caso.nro_siniestro}`);
  if (caso?.patente) linea(`Patente: ${caso.patente}`);
  linea(`Generado el ${new Date().toLocaleDateString("es-AR")}`);

  y -= 10;
  linea("Contenido:", 13, fontBold);
  for (const it of items) {
    if (y < 60) { linea("… y más documentos", 11); break; }
    linea(`${items.indexOf(it) + 1}. ${it.archivo.nombre}`, 11);
  }
}

function dibujarPie(pdfDoc, PDFLib, font, fontBold) {
  const azul = PDFLib.rgb(...hexRgb(AZUL));
  const dorado = PDFLib.rgb(...hexRgb(DORADO));
  const paginas = pdfDoc.getPages();
  paginas.forEach((page, i) => {
    const { width } = page.getSize();
    const y = 30;
    page.drawLine({ start: { x: MARGEN, y }, end: { x: width - MARGEN, y }, thickness: 0.8, color: dorado });
    page.drawText("ATG Lex Solutions", { x: MARGEN, y: y - 14, size: 9, font: fontBold, color: azul });
    page.drawText(`${i + 1} / ${paginas.length}`, { x: width - MARGEN - 36, y: y - 14, size: 9, font, color: azul });
  });
}

// items: [{ archivo: { nombre, ext, blob }, rotacion: 0|90|180|270 }] en el orden deseado.
export async function combinarArchivos({ items, portada = true, caso = null }) {
  const PDFLib = await import("pdf-lib");
  const { PDFDocument, StandardFonts } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const it of items) {
    if (esPdf(it.archivo)) await agregarPaginasPdf(pdfDoc, PDFLib, it.archivo, it.rotacion);
    else if (esImagen(it.archivo)) await agregarPaginaImagen(pdfDoc, PDFLib, it.archivo, it.rotacion);
  }

  if (portada) dibujarPortada(pdfDoc, PDFLib, font, fontBold, { caso, items });
  if (portada) dibujarPie(pdfDoc, PDFLib, font, fontBold);

  return pdfDoc.save();
}
