// Texto de un PDF ordenado en renglones (para leer formularios de las compañías).
import { abrirPdf } from "../pdfjs.js";

// Devuelve [{ pagina, y, items: [{ x, s }], texto }] de arriba hacia abajo. y y x en puntos del PDF.
export async function renglonesPdf(bytes) {
  const doc = await abrirPdf(bytes);
  const renglones = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const pagina = await doc.getPage(p);
      const { items } = await pagina.getTextContent();
      const filas = [];
      for (const it of items) {
        const s = it.str.trim();
        if (!s) continue;
        const y = it.transform[5];
        let fila = filas.find(f => Math.abs(f.y - y) <= 2);
        if (!fila) filas.push(fila = { pagina: p, y, items: [] });
        fila.items.push({ x: it.transform[4], s });
      }
      filas.sort((a, b) => b.y - a.y);
      for (const f of filas) {
        f.items.sort((a, b) => a.x - b.x);
        f.texto = f.items.map(i => i.s).join(" ").replace(/\s+/g, " ");
        renglones.push(f);
      }
      pagina.cleanup();
    }
  } finally { doc.destroy(); }
  return renglones;
}

// Primer renglón cuyo texto cumple la expresión; devuelve los grupos capturados (o null)
export function buscar(renglones, re, desde = 0) {
  for (let i = desde; i < renglones.length; i++) {
    const m = renglones[i].texto.match(re);
    if (m) return Object.assign(m, { indice: i });
  }
  return null;
}

// "18-06-2026" o "18/06/2026" → "2026-06-18"
export const fechaISO = t => {
  const m = String(t || "").match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

export const limpiar = t => String(t || "").replace(/\s+/g, " ").trim();
