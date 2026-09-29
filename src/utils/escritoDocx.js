// Texto de un escrito (ya completado) → Word (.docx), editable. Mismos bloques que el PDF (plantillas.bloques).
// La librería `docx` se importa recién al generar.
import { bloques } from "./plantillas.js";

const LETRA = "Arial";
const T = 22; // tamaño en medios puntos (11 pt)

export async function armarEscritoDocx({ texto, firma = "estudio", estudio = {}, membrete = true }) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, TabStopType } = await import("docx");
  const run = (t, extra = {}) => new TextRun({ text: t, font: LETRA, size: T, ...extra });
  const runs = (tramos, extra = {}) => tramos.map(tr => run(tr.t, { bold: tr.negrita, ...extra }));

  const lista = bloques(texto);
  const parrafos = lista.map((b, i) => {
    const siguiente = lista[i + 1];
    const junto = siguiente && siguiente.tipo === b.tipo && (b.tipo === "linea" || b.tipo === "item");
    const despues = junto ? 0 : 200; // twips
    if (b.tipo === "titulo") return new Paragraph({ children: runs(b.tramos, { bold: true, size: 28 }), spacing: { after: 160 } });
    if (b.tipo === "item") return new Paragraph({ children: runs(b.tramos), indent: { left: 227 }, spacing: { after: despues } });
    return new Paragraph({
      children: runs(b.tramos),
      alignment: b.tipo === "parrafo" ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
      spacing: { after: despues, line: 300 },
    });
  });

  // Firmas: renglones con líneas para completar a mano
  const LARGO = "_______________________________";
  const firmas = [];
  if (firma !== "ninguna") {
    firmas.push(new Paragraph({ children: [], spacing: { before: 1400 } }));
    const tab = { tabStops: [{ type: TabStopType.CENTER, position: 1900 }, { type: TabStopType.CENTER, position: 7200 }] };
    const par = (izq, der) => new Paragraph({ ...tab, children: [run(`\t${izq}\t${der}`)] });
    if (firma === "cliente") {
      firmas.push(new Paragraph({ tabStops: [{ type: TabStopType.CENTER, position: 1500 }, { type: TabStopType.CENTER, position: 4700 }, { type: TabStopType.CENTER, position: 7900 }],
        children: [run("\t____________________\t____________________\t____________________")] }));
      firmas.push(new Paragraph({ tabStops: [{ type: TabStopType.CENTER, position: 1500 }, { type: TabStopType.CENTER, position: 4700 }, { type: TabStopType.CENTER, position: 7900 }],
        children: [run("\tFirma\tAclaración\tDNI", { size: 20 })] }));
    } else if (firma === "estudio") {
      firmas.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(LARGO)] }));
      firmas.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(estudio.abogado || "", { size: 20 })] }));
      firmas.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("Abogado", { size: 20 })] }));
    } else {
      firmas.push(par(LARGO, LARGO));
      firmas.push(par("Firma y aclaración del cliente", estudio.abogado || ""));
      firmas.push(par("", "Abogado"));
    }
  }

  const doc = new Document({
    creator: "ATG Lex",
    sections: [{
      properties: { page: { margin: { top: 1418, bottom: 1418, left: 1134, right: 1134 } } }, // 2,5 cm / 2 cm
      footers: membrete ? { default: new Footer({ children: [new Paragraph({ children: [run("ATG Lex Solutions", { bold: true, size: 18, color: "7E6214" })] })] }) } : undefined,
      children: [...parrafos, ...firmas],
    }],
  });
  const blob = await Packer.toBlob(doc);
  return blob.arrayBuffer();
}
