import { jsPDF } from "jspdf";
import { dibujarPie } from "./pdfMembrete.js";

function formatoFecha(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${String(y).slice(-2)}`;
}

const DOCUMENTAL_FIJA = [
  "Denuncia administrativa",
  "Certificado de cobertura",
  "Fotos de los daños",
  "DNI",
  "Cédula / Título"
];

// 38554155 → 38.554.155 · 5123456 → 5.123.456 (si no son 7 u 8 números, queda como se escribió)
export const formatearDni = (dni) => {
  const digitos = String(dni || "").replace(/\D/g, "");
  if (digitos.length !== 7 && digitos.length !== 8) return String(dni || "").trim();
  return digitos.replace(/\B(?=(\d{3})+$)/g, ".");
};

export async function generarEscrito({ 
  caso, 
  dni, 
  dirHandle, 
  opcionesDoc = {},
  conFirma = false, // portal PAS: agrega el lugar para que firme el asegurado
  onSuccess, 
  onError 
}) {
  if (!dni?.trim()) {
    onError("DNI requerido");
    return;
  }

  try {
    const fechaSiniestro = formatoFecha(caso.fecha_siniestro || caso.fecha_derivacion);
    const nombreCompleto = (caso.asegurado || "NOMBRE NO DISPONIBLE").toUpperCase();
    const compania = (caso.compania_aseguradora || "RAZON SOCIAL ASEGURADORA").toUpperCase();

    // Armado del listado limpio
    const listaDocumental = [...DOCUMENTAL_FIJA];
    if (opcionesDoc.licencia) listaDocumental.push("Licencia de conducir");
    if (opcionesDoc.presupuesto) listaDocumental.push("Presupuesto");
    if (opcionesDoc.estudiosMedicos) listaDocumental.push("Estudios médicos / Constancia de atención");
    if (opcionesDoc.cartaFranquicia) listaDocumental.push("Carta de franquicia");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 20;
    const contentWidth = 170; // 210mm - (20mm * 2)
    let y = 25;

    // Encabezado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RECLAMO EXTRAJUDICIAL", margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.text(compania, margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.text("Reclamo de Terceros:", margin, y);
    y += 12;

    // Cuerpo con alineación justificada
    const textoBase = `Alexis Torres Gaveglio, abogado, inscripto al T°142 F°636 C.P.A.C.F y al L° IV F° 20 del C.A.M.G.R, responsable monotributo CUIT 20-39340318-8 en representación de ${nombreCompleto}, DNI ${formatearDni(dni)}, constituyendo domicilio en Pte. Saenz Peña 943, Depto 76 piso 7, CABA, vengo a iniciar formal reclamo por el siniestro ocurrido el día ${fechaSiniestro}.`;

    const lineasCuerpo = doc.splitTextToSize(textoBase, contentWidth);
    doc.text(lineasCuerpo, margin, y, { align: "justify", maxWidth: contentWidth });

    y += lineasCuerpo.length * 6 + 8;

    // Documental Acompañada
    doc.setFont("helvetica", "bold");
    doc.text("I. Acompaña:", margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    listaDocumental.forEach((item, index) => {
      doc.text(`${index + 1}. ${item}`, margin + 4, y);
      y += 6;
    });

    // Firma del asegurado (el PAS lo imprime y lo firman en el momento)
    if (conFirma) {
      y = Math.max(y + 24, 215);
      const x2 = margin + contentWidth / 2 + 10;
      doc.setLineWidth(0.3);
      doc.setDrawColor("#000000");
      doc.line(margin, y, margin + 80, y);
      doc.setFontSize(10);
      doc.text("Firma del asegurado", margin, y + 5);
      doc.text("Aclaración: " + nombreCompleto, margin, y + 11, { maxWidth: 80 });
      doc.text("DNI: " + formatearDni(dni), margin, y + 17);
      doc.text("Fecha: ____ / ____ / ________", x2, y + 5);
    }

    dibujarPie(doc, { margen: margin, ancho: contentWidth });

    // Descarga / Guardado
    const nombreArchivo = `Reclamo_${nombreCompleto.replace(/\s+/g, "_")}.pdf`;

    if (dirHandle) {
      try {
        const pdfBytes = doc.output("arraybuffer");
        const fileHandle = await dirHandle.getFileHandle(nombreArchivo, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(pdfBytes);
        await writable.close();
        onSuccess({ nombreArchivo, guardadoEn: "carpeta" });
        return;
      } catch (e) {
        console.warn("[escrito] No se pudo guardar en carpeta, descargando:", e);
      }
    }

    doc.save(nombreArchivo);
    onSuccess({ nombreArchivo, guardadoEn: "descargas" });
  } catch (e) {
    console.error(e);
    onError("Error al generar el PDF: " + e.message);
  }
}