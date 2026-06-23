function formatoFecha(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${String(y).slice(-2)}`;
}

export async function generarEscrito({ caso, pasId, dni, onSuccess, onError }) {
  if (!dni?.trim()) {
    onError("DNI requerido");
    return;
  }

  try {
    const fechaSiniestro = formatoFecha(caso.fecha_siniestro || caso.fecha_derivacion);
    const nombreCompleto = (caso.asegurado || "NOMBRE NO DISPONIBLE").toUpperCase();
    const compania = (caso.compania || caso.compania_aseguradora || "RAZON SOCIAL ASEGURADORA").toUpperCase();

    const contenido = `RECLAMO EXTRAJUDICIAL
${compania}
Reclamo de Terceros:

Alexis Torres Gaveglio, abogado, inscripto al T°142 F°636 C.P.A.C.F y al L° IV F° 20 del C.A.M.G.R, en representación de ${nombreCompleto}, DNI ${dni.trim()} vengo a iniciar formal reclamo por el siniestro ocurrido el día ${fechaSiniestro}.

I. Acompaña:
1. Denuncia administrativa
2. Certificado de cobertura
3. Fotos de los daños
4. DNI (Frente y dorso)
5. Cedula /Titulo
6. Licencia de Conducir
7. Presupuesto`;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const margin = 20;
    const contentWidth = 170;
    let y = 25;

    const lineas = doc.splitTextToSize(contenido, contentWidth);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(lineas, margin, y);

    const pdfBytes = doc.output("arraybuffer");
    const nombreArchivo = `Reclamo_${nombreCompleto.replace(/\s+/g, "_")}.pdf`;

    doc.save(nombreArchivo);
    onSuccess({ nombreArchivo });
  } catch (e) {
    console.error(e);
    onError("Error al generar el PDF: " + e.message);
  }
}
