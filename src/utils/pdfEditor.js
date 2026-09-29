// Editor de PDF (Herramientas): arma un PDF a partir de una lista de páginas que pueden venir de
// distintos PDFs o de imágenes, cada una con su rotación e imágenes estampadas (firma, sello).
// Todo corre en el navegador: los archivos no salen de la compu.
import { abrirPdf, dibujarPagina, canvasABlob } from "./pdfjs.js";

const A4 = [595.28, 841.89];
const MARGEN = 28;
const LADO_MAXIMO = 2400; // px: más que suficiente para imprimir una foto en A4

const esPngBytes = b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

// Deja la imagen derecha (las fotos del celular vienen giradas con un dato EXIF que pdf-lib ignora)
// y la achica si es enorme. Los PNG siguen siendo PNG para no perder la transparencia de firmas y sellos.
export async function normalizarImagen(blob) {
  const png = esPngBytes(new Uint8Array(await blob.slice(0, 4).arrayBuffer()));
  const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
  const k = Math.min(1, LADO_MAXIMO / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  const ctx = canvas.getContext("2d");
  if (!png) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const salida = await canvasABlob(canvas, png ? "image/png" : "image/jpeg", 0.9);
  return { blob: salida, ancho: canvas.width, alto: canvas.height };
}

// Para firmas o sellos fotografiados sobre papel: el blanco pasa a transparente (con borde suave).
export async function quitarFondoBlanco(blob, umbral = 205, suavizado = 60) {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const claro = Math.min(d[i], d[i + 1], d[i + 2]);
    if (claro >= umbral) d[i + 3] = 0;
    else if (claro > umbral - suavizado) d[i + 3] = Math.round((d[i + 3] * (umbral - claro)) / suavizado);
  }
  ctx.putImageData(img, 0, 0);
  return canvasABlob(canvas, "image/png");
}

export const puedeElegirDestino = () => typeof window !== "undefined" && !!window.showSaveFilePicker;

// Abre el explorador para elegir dónde guardar (Chrome/Edge). Hay que llamarlo apenas se hace click,
// antes de armar el PDF: el navegador solo lo permite justo después de una acción del usuario.
// Devuelve el archivo elegido, null si se canceló, o "descargar" si el navegador no lo permite.
export async function elegirDestino(nombre, carpeta) {
  if (!puedeElegirDestino()) return "descargar";
  try {
    return await window.showSaveFilePicker({
      suggestedName: nombre,
      startIn: carpeta || "downloads",
      types: [{ description: "Documento PDF", accept: { "application/pdf": [".pdf"] } }],
    });
  } catch (e) {
    if (e.name === "AbortError") return null;
    throw e;
  }
}

export async function escribirEn(destino, bytes, nombre) {
  if (destino === "descargar") { descargar(bytes, nombre); return nombre; }
  const w = await destino.createWritable();
  await w.write(bytes);
  await w.close();
  return destino.name;
}

export function descargar(bytes, nombre) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  // Con tildes, Chrome a veces ignora el nombre y descarga como "download"
  a.download = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function embeberImagen(pdfDoc, blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return esPngBytes(bytes) ? pdfDoc.embedPng(bytes) : pdfDoc.embedJpg(bytes);
}

// Punto tal como se ve (dx, dy desde arriba a la izquierda, en puntos) → coordenadas de la página
// sin rotar (origen abajo a la izquierda). R = rotación con la que se muestra la página.
export function puntoEnPagina(dx, dy, R, W, H) {
  switch (R) {
    case 90: return [dy, dx];
    case 180: return [W - dx, dy];
    case 270: return [W - dy, H - dx];
    default: return [dx, H - dy];
  }
}

// fuentes: { [id]: { tipo: "pdf", bytes } | { tipo: "imagen", blob } }
// paginas: [{ fuenteId, indice, rotacion, estampas: [{ blob, x, y, ancho }] }]
//   rotacion: la que se agrega a la que ya trae la página. Estampas en fracciones de la página tal como se ve.
export async function armarPdf({ fuentes, paginas }) {
  const PDFLib = await import("pdf-lib");
  const { PDFDocument, degrees } = PDFLib;
  const salida = await PDFDocument.create();
  const docs = new Map();
  const imagenes = new Map();
  const imagen = async blob => {
    if (!imagenes.has(blob)) imagenes.set(blob, await embeberImagen(salida, blob));
    return imagenes.get(blob);
  };

  for (const p of paginas) {
    const f = fuentes[p.fuenteId];
    let page;
    if (f.tipo === "pdf") {
      if (!docs.has(p.fuenteId)) docs.set(p.fuenteId, await PDFDocument.load(f.bytes, { ignoreEncryption: true }));
      const [copia] = await salida.copyPages(docs.get(p.fuenteId), [p.indice]);
      page = salida.addPage(copia);
    } else {
      const img = await imagen(f.blob);
      const [W, H] = img.width > img.height ? [A4[1], A4[0]] : A4;
      page = salida.addPage([W, H]);
      const k = Math.min((W - MARGEN * 2) / img.width, (H - MARGEN * 2) / img.height, 1);
      page.drawImage(img, { x: (W - img.width * k) / 2, y: (H - img.height * k) / 2, width: img.width * k, height: img.height * k });
    }

    const R = (page.getRotation().angle + (p.rotacion || 0)) % 360;
    page.setRotation(degrees(R));

    if (p.estampas?.length) {
      const caja = page.getCropBox();
      const [Dw, Dh] = R % 180 ? [caja.height, caja.width] : [caja.width, caja.height];
      for (const e of p.estampas) {
        const img = await imagen(e.blob);
        const w = e.ancho * Dw;
        const h = (w * img.height) / img.width;
        // Se ancla en la esquina de abajo a la izquierda de la imagen tal como se ve, y se gira
        // al revés que la página para que quede derecha.
        const [x, y] = puntoEnPagina(e.x * Dw, e.y * Dh + h, R, caja.width, caja.height);
        page.drawImage(img, { x: caja.x + x, y: caja.y + y, width: w, height: h, rotate: degrees(R) });
      }
    }
  }
  return salida.save();
}

export const COMPRESIONES = [
  { k: "no", l: "Sin comprimir", desc: "Mantiene el texto seleccionable" },
  { k: "media", l: "Media", desc: "150 ppp · bien para mandar por mail", dpi: 150, calidad: 0.75 },
  { k: "fuerte", l: "Fuerte", desc: "100 ppp · el más liviano", dpi: 100, calidad: 0.6 },
];

// Comprime pasando cada página a imagen (el texto deja de ser seleccionable). Sirve sobre todo para
// escaneos y fotos, que es lo que hace pesar a un PDF.
export async function comprimirPdf(bytes, { dpi, calidad }, onProgreso) {
  const PDFLib = await import("pdf-lib");
  const doc = await abrirPdf(bytes);
  const salida = await PDFLib.PDFDocument.create();
  try {
    for (let i = 0; i < doc.numPages; i++) {
      const { canvas, anchoPt, altoPt } = await dibujarPagina(doc, i, { escala: dpi / 72 });
      const jpg = await canvasABlob(canvas, "image/jpeg", calidad);
      canvas.width = canvas.height = 0;
      const img = await salida.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
      salida.addPage([anchoPt, altoPt]).drawImage(img, { x: 0, y: 0, width: anchoPt, height: altoPt });
      onProgreso?.(i + 1, doc.numPages);
    }
  } finally {
    doc.destroy();
  }
  return salida.save();
}

export const pesoLegible = n => (n >= 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
