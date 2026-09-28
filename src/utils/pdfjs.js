// pdf.js (motor de PDF de Firefox) para dibujar páginas: miniaturas, vista grande y compresión.
// Import dinámico: se descarga recién cuando se usa una herramienta de PDF.
let cargando = null;

export function cargarPdfjs() {
  cargando ||= Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return cargando;
}

// pdf.js se queda con el ArrayBuffer que recibe: se le pasa una copia para no romper el original.
export async function abrirPdf(bytes) {
  const pdfjs = await cargarPdfjs();
  return pdfjs.getDocument({ data: bytes.slice(0) }).promise;
}

// Dibuja una página en un canvas. rotacionExtra se suma a la que ya trae la página.
export async function dibujarPagina(doc, indice, { ancho, escala, rotacionExtra = 0 } = {}) {
  const pagina = await doc.getPage(indice + 1);
  const rotation = (pagina.rotate + rotacionExtra) % 360;
  const base = pagina.getViewport({ scale: 1, rotation });
  const viewport = pagina.getViewport({ scale: escala ?? ancho / base.width, rotation });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await pagina.render({ canvasContext: ctx, viewport }).promise;
  pagina.cleanup();
  return { canvas, anchoPt: base.width, altoPt: base.height };
}

export const canvasABlob = (canvas, tipo = "image/jpeg", calidad = 0.8) =>
  new Promise(res => canvas.toBlob(res, tipo, calidad));
