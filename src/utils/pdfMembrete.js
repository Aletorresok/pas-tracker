// Membrete de ATG Lex Solutions para los PDF (jsPDF, unidades en mm).
// El monograma se dibuja en vector con los mismos polígonos que ui/Logo.jsx (viewBox 594×400), así sale nítido al imprimir.
import { FIRMA } from "./mensajes.js";

const MONOGRAMA = [
  [[149.4, 0], [458.3, 0], [499, 55], [128.8, 55]],
  [[275, 55], [334, 55], [334, 355.6], [275, 244.3]],
  [[114.3, 94], [170.4, 94], [332.5, 400], [268.5, 400], [146.1, 169], [106.3, 276], [174.8, 276], [203.4, 330], [86.2, 330], [60, 400], [0, 400]],
  [[373, 94], [527.8, 94], [594.4, 184], [528.4, 184], [504, 151], [431, 151], [431, 344], [536, 344], [536, 277], [470, 277], [470, 222], [594, 222], [594, 400], [373, 400]],
];

export const DORADO = "#A6821F";
export const AZUL = "#10151F";

// Monograma de `alto` mm con la esquina superior izquierda en (x, y). Devuelve el ancho dibujado.
export function dibujarMonograma(doc, x, y, alto, color = DORADO) {
  const k = alto / 400;
  doc.setFillColor(color);
  MONOGRAMA.forEach(pts => {
    const tramos = pts.slice(1).map((p, i) => [(p[0] - pts[i][0]) * k, (p[1] - pts[i][1]) * k]);
    doc.lines(tramos, x + pts[0][0] * k, y + pts[0][1] * k, [1, 1], "F", true);
  });
  return 594 * k;
}

export const MATRICULA = "T°142 F°636 CPACF · L°IV F°20 CAMGR";
export const TELEFONO = "+54 9 11 3313-3259";

// Pie de página en todas las hojas: línea dorada, monograma, estudio, abogado, matrícula y teléfono.
// `extra` (opcional) va a la derecha, por ejemplo "Pág. 1/2".
export function dibujarPie(doc, { margen = 20, ancho = 170, extra } = {}) {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const y = 272;
    doc.setDrawColor(DORADO);
    doc.setLineWidth(0.3);
    doc.line(margen, y, margen + ancho, y);
    const w = dibujarMonograma(doc, margen, y + 4, 8);
    const x = margen + w + 3.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(AZUL);
    doc.text("ATG Lex Solutions", x, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor("#5B6272");
    doc.text(`${FIRMA} · ${MATRICULA} · ${TELEFONO}`, x, y + 11.2);
    const derecha = typeof extra === "function" ? extra(i, total) : extra;
    if (derecha) doc.text(derecha, margen + ancho, y + 7, { align: "right" });
  }
  doc.setTextColor("#000000");
  doc.setDrawColor("#000000");
  doc.setLineWidth(0.2);
}
