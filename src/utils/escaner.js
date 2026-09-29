// Escáner con el celular: detectar la hoja en la foto, enderezarla (perspectiva) y "limpiarla"
// como un escáner (sin sombras, fondo blanco). Todo en el navegador, sin librerías.
import { canvasABlob } from "./pdfjs.js";

const LADO_TRABAJO = 420; // px para detectar la hoja (rápido)
const LADO_SALIDA = 2000; // px del lado largo de la página escaneada

export function nuevoCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export async function cargarImagen(blob) {
  const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
  const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = nuevoCanvas(bmp.width * k, bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

// ── Detección de la hoja ───────────────────────────────────────────────────
// La hoja suele ser lo más claro y grande de la foto: umbral de Otsu, la mancha clara más grande
// y sus cuatro puntas. Si no convence, se usa casi toda la foto (y se ajusta a mano).
export function detectarHoja(canvas) {
  const k = Math.min(1, LADO_TRABAJO / Math.max(canvas.width, canvas.height));
  const w = Math.round(canvas.width * k), h = Math.round(canvas.height * k);
  const chico = nuevoCanvas(w, h);
  const ctx = chico.getContext("2d", { willReadFrequently: true });
  ctx.filter = "blur(2px)";
  ctx.drawImage(canvas, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;

  const gris = new Uint8Array(w * h);
  const hist = new Array(256).fill(0);
  for (let i = 0; i < w * h; i++) {
    const g = (px[i * 4] * 299 + px[i * 4 + 1] * 587 + px[i * 4 + 2] * 114) / 1000;
    gris[i] = g;
    hist[gris[i]]++;
  }
  // Otsu
  let suma = 0;
  for (let t = 0; t < 256; t++) suma += t * hist[t];
  let sB = 0, wB = 0, mejor = 0, umbral = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = w * h - wB;
    if (!wF) break;
    sB += t * hist[t];
    const mB = sB / wB, mF = (suma - sB) / wF;
    const entre = wB * wF * (mB - mF) ** 2;
    if (entre > mejor) { mejor = entre; umbral = t; }
  }

  // Mancha clara más grande (4-vecinos)
  const marca = new Int32Array(w * h).fill(-1);
  const pila = new Int32Array(w * h);
  let mayor = { n: 0, id: -1 };
  let id = 0;
  for (let i = 0; i < w * h; i++) {
    if (gris[i] <= umbral || marca[i] !== -1) continue;
    let tope = 0, n = 0;
    pila[tope++] = i;
    marca[i] = id;
    while (tope) {
      const p = pila[--tope];
      n++;
      const x = p % w, y = (p - x) / w;
      const vecinos = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of vecinos) if (q >= 0 && marca[q] === -1 && gris[q] > umbral) { marca[q] = id; pila[tope++] = q; }
    }
    if (n > mayor.n) mayor = { n, id };
    id++;
  }

  const porDefecto = margenCompleto(canvas.width, canvas.height);
  if (mayor.n < w * h * 0.15 || mayor.n > w * h * 0.98) return porDefecto;

  let tl = [0, 0, Infinity], br = [0, 0, -Infinity], tr = [0, 0, -Infinity], bl = [0, 0, Infinity];
  for (let i = 0; i < w * h; i++) {
    if (marca[i] !== mayor.id) continue;
    const x = i % w, y = (i - x) / w;
    if (x + y < tl[2]) tl = [x, y, x + y];
    if (x + y > br[2]) br = [x, y, x + y];
    if (x - y > tr[2]) tr = [x, y, x - y];
    if (x - y < bl[2]) bl = [x, y, x - y];
  }
  const esquinas = [tl, tr, br, bl].map(([x, y]) => ({ x: x / k, y: y / k }));
  return areaCuadrilatero(esquinas) > canvas.width * canvas.height * 0.15 ? esquinas : porDefecto;
}

export function margenCompleto(w, h, m = 0.02) {
  return [{ x: w * m, y: h * m }, { x: w * (1 - m), y: h * m }, { x: w * (1 - m), y: h * (1 - m) }, { x: w * m, y: h * (1 - m) }];
}

function areaCuadrilatero(p) {
  let a = 0;
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; a += p[i].x * p[j].y - p[j].x * p[i].y; }
  return Math.abs(a) / 2;
}

// ── Perspectiva ────────────────────────────────────────────────────────────
// Homografía que lleva el rectángulo de salida a las cuatro esquinas de la foto.
function homografia(origen, destino) {
  const A = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = origen[i], { x: u, y: v } = destino[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let piv = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  // Gauss-Jordan deja la matriz diagonal: cada incógnita es el término independiente sobre su pivote
  return A.map((fila, i) => fila[8] / fila[i]);
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function enderezar(canvas, esquinas) {
  const [tl, tr, br, bl] = esquinas;
  let W = Math.max(dist(tl, tr), dist(bl, br));
  let H = Math.max(dist(tl, bl), dist(tr, br));
  const k = Math.min(1, LADO_SALIDA / Math.max(W, H));
  W = Math.round(W * k); H = Math.round(H * k);
  const m = homografia([{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }], esquinas);

  const src = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
  const sw = src.width, sh = src.height, s = src.data;
  const salida = nuevoCanvas(W, H);
  const ctx = salida.getContext("2d");
  const out = ctx.createImageData(W, H);
  const o = out.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = m[6] * x + m[7] * y + 1;
      let u = (m[0] * x + m[1] * y + m[2]) / d;
      let v = (m[3] * x + m[4] * y + m[5]) / d;
      u = Math.min(Math.max(u, 0), sw - 1.001);
      v = Math.min(Math.max(v, 0), sh - 1.001);
      const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      const j = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        const a = s[i00 + c] + (s[i10 + c] - s[i00 + c]) * fx;
        const b = s[i01 + c] + (s[i11 + c] - s[i01 + c]) * fx;
        o[j + c] = a + (b - a) * fy;
      }
      o[j + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return salida;
}

// ── Filtros ────────────────────────────────────────────────────────────────
export const FILTROS = [
  { k: "mejorada", l: "Mejorada" },
  { k: "original", l: "Original" },
  { k: "grises", l: "Grises" },
  { k: "byn", l: "Blanco y negro" },
];

// Fondo (iluminación) estimado: la imagen muy achicada y borrosa, vuelta a su tamaño.
function fondo(canvas) {
  const w = Math.max(8, Math.round(canvas.width / 8)), h = Math.max(8, Math.round(canvas.height / 8));
  const chico = nuevoCanvas(w, h);
  const c = chico.getContext("2d");
  c.drawImage(canvas, 0, 0, w, h);
  // "Cierre": el texto oscuro no tiene que contar como fondo → se toma el más claro de cada zona
  const d = c.getImageData(0, 0, w, h);
  const copia = new Uint8ClampedArray(d.data);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const j = (y * w + x) * 4;
    for (let ch = 0; ch < 3; ch++) {
      let max = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy));
        max = Math.max(max, copia[(yy * w + xx) * 4 + ch]);
      }
      d.data[j + ch] = max;
    }
  }
  c.putImageData(d, 0, 0);
  const grande = nuevoCanvas(canvas.width, canvas.height);
  const g = grande.getContext("2d", { willReadFrequently: true });
  g.filter = "blur(4px)";
  g.drawImage(chico, 0, 0, canvas.width, canvas.height);
  return g.getImageData(0, 0, canvas.width, canvas.height).data;
}

export function aplicarFiltro(canvas, filtro) {
  const salida = nuevoCanvas(canvas.width, canvas.height);
  const ctx = salida.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0);
  if (filtro === "original") return salida;
  const img = ctx.getImageData(0, 0, salida.width, salida.height);
  const d = img.data;
  const bg = fondo(canvas);
  for (let i = 0; i < d.length; i += 4) {
    // Divide por la iluminación: sin sombras y con el papel en blanco
    const r = Math.min(255, (d[i] / Math.max(bg[i], 1)) * 255);
    const g = Math.min(255, (d[i + 1] / Math.max(bg[i + 1], 1)) * 255);
    const b = Math.min(255, (d[i + 2] / Math.max(bg[i + 2], 1)) * 255);
    if (filtro === "mejorada") {
      // Más contraste: los tonos medios bajan, el blanco queda blanco
      d[i] = 255 * (r / 255) ** 1.6; d[i + 1] = 255 * (g / 255) ** 1.6; d[i + 2] = 255 * (b / 255) ** 1.6;
    } else {
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const v = filtro === "byn" ? (y < 185 ? 0 : 255) : 255 * (y / 255) ** 1.5;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
  return salida;
}

export function rotarCanvas(canvas, grados) {
  if (!grados) return canvas;
  const gira = grados % 180 !== 0;
  const c = nuevoCanvas(gira ? canvas.height : canvas.width, gira ? canvas.width : canvas.height);
  const ctx = c.getContext("2d");
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((grados * Math.PI) / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return c;
}

// Página final (enderezada, filtrada y rotada) como JPG
export async function procesarPagina(original, { esquinas, filtro, rotacion }, calidad = 0.85) {
  const final = rotarCanvas(aplicarFiltro(enderezar(original, esquinas), filtro), rotacion);
  return canvasABlob(final, "image/jpeg", calidad);
}
