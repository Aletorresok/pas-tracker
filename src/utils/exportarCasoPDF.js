import { jsPDF } from "jspdf";

function fmt(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function money(n) {
  if (n === null || n === undefined || n === "") return "—";
  return "$" + Number(n).toLocaleString("es-AR");
}

const ESTADO_LABEL = {
  doc_pendiente: "Documentación pendiente",
  iniciado: "Iniciado",
  reclamado: "Reclamado",
  con_ofrecimiento: "Con ofrecimiento",
  en_mediacion: "En mediación",
  en_juicio: "En juicio",
  esperando_pago: "Esperando pago",
  cobrado: "Cobrado",
  desistido: "Desistido",
};

export async function exportarCasoPDF({ caso, pasNombre, acciones = [], onSuccess, onError }) {
  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 20;
    const pageW = 170;
    let y = 20;

    const addLine = (size, weight, text, color = "#000000") => {
      doc.setFontSize(size);
      doc.setFont("helvetica", weight);
      doc.setTextColor(color);
      const lines = doc.splitTextToSize(text, pageW);
      if (y + lines.length * (size * 0.4) > 275) { doc.addPage(); y = 20; }
      doc.text(lines, margin, y);
      y += lines.length * (size * 0.45) + 1;
    };

    const addRow = (label, value) => {
      if (!value || value === "—") return;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor("#333333");
      doc.text(label + ":", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), margin + 50, y);
      y += 5;
    };

    const addSeparator = () => {
      y += 2;
      doc.setDrawColor("#cccccc");
      doc.line(margin, y, margin + pageW, y);
      y += 5;
    };

    // Header
    addLine(18, "bold", "Resumen del caso");
    addLine(10, "normal", `Generado el ${fmt(new Date().toISOString())}`, "#888888");
    y += 3;

    // Datos principales
    addLine(13, "bold", "Datos del caso");
    y += 2;
    addRow("Asegurado", caso.asegurado);
    addRow("Compañía", caso.compania || caso.compania_aseguradora);
    addRow("Estado", ESTADO_LABEL[caso.estado] || caso.estado);
    addRow("N° Siniestro", caso.nro_siniestro);
    addRow("PAS / Productor", pasNombre);
    addRow("DNI Asegurado", caso.dni_asegurado);
    addRow("Ubicación", caso.ubicacion);
    addRow("Vehículo", caso.vehiculo);
    addRow("Dominio", caso.dominio);
    if (caso.tercero_nombre) {
      addRow("Tercero", caso.tercero_nombre);
      addRow("DNI Tercero", caso.tercero_dni);
    }

    addSeparator();

    // Fechas
    addLine(13, "bold", "Fechas");
    y += 2;
    addRow("Siniestro", fmt(caso.fecha_siniestro));
    addRow("Derivación", fmt(caso.fecha_derivacion));
    addRow("Contacto asegurado", fmt(caso.fecha_contacto_asegurado));
    addRow("Inicio reclamo", fmt(caso.fecha_inicio_reclamo));
    addRow("Reclamo", fmt(caso.fecha_reclamo));
    addRow("Último reclamo", fmt(caso.fecha_ultimo_reclamo));
    addRow("Ofrecimiento", fmt(caso.fecha_ofrecimiento));
    addRow("Reconsideración", fmt(caso.fecha_reconsideracion));
    addRow("Aceptación", fmt(caso.fecha_aceptacion));
    addRow("Firma", fmt(caso.fecha_firma));
    addRow("Mediación", fmt(caso.fecha_mediacion));
    addRow("Inicio juicio", fmt(caso.fecha_inicio_juicio));
    addRow("Pago", fmt(caso.fecha_pago));
    addRow("Cobro", fmt(caso.fecha_cobro));

    addSeparator();

    // Montos
    addLine(13, "bold", "Montos");
    y += 2;
    addRow("Monto reclamado", money(caso.monto_reclamado));
    addRow("Ofrecimiento", money(caso.monto_ofrecimiento));
    addRow("Monto acordado", money(caso.monto_acordado));
    addRow("Cobro abogado", money(caso.monto_cobro_yo));
    addRow("Cobro asegurado", money(caso.monto_cobro_asegurado));
    addRow("Comisión PAS", money(caso.monto_comision_pas));
    if (caso.plazo_pago) addRow("Plazo de pago", caso.plazo_pago + " días");

    addSeparator();

    // Honorarios
    addLine(13, "bold", "Honorarios");
    y += 2;
    addRow("Monto honorarios", money(caso.monto_honorarios));
    addRow("Estado", caso.estado_honorarios || "—");
    addRow("Fecha factura", fmt(caso.fecha_factura));
    addRow("Fecha cobro", fmt(caso.fecha_cobro_honorarios));

    // Timeline
    if (acciones.length > 0) {
      addSeparator();
      addLine(13, "bold", "Historial de acciones");
      y += 2;
      acciones
        .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))
        .forEach(a => {
          if (y > 265) { doc.addPage(); y = 20; }
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor("#6366f1");
          doc.text(fmt(a.fecha), margin, y);
          doc.setFont("helvetica", "normal");
          doc.setTextColor("#333333");
          const descLines = doc.splitTextToSize(a.descripcion || "", pageW - 30);
          doc.text(descLines, margin + 30, y);
          y += descLines.length * 4 + 3;
        });
    }

    // Notas
    if (caso.nota) {
      addSeparator();
      addLine(13, "bold", "Notas");
      y += 2;
      addLine(10, "normal", caso.nota);
    }

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor("#aaaaaa");
      doc.text(`PAS Tracker — ${caso.asegurado || "Caso"} — Pág. ${i}/${totalPages}`, margin, 290);
    }

    const nombreArchivo = `Caso_${(caso.asegurado || "sin_nombre").replace(/\s+/g, "_")}.pdf`;
    doc.save(nombreArchivo);
    onSuccess?.({ nombreArchivo });
  } catch (e) {
    console.error(e);
    onError?.("Error al generar el PDF: " + e.message);
  }
}
