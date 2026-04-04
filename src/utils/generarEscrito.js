import { supabase } from "../supabase.js";

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
    const compania = (caso.compania || "RAZON SOCIAL ASEGURADORA").toUpperCase();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `Redactá un escrito de reclamo extrajudicial con el siguiente formato exacto, sin agregar texto adicional:

RECLAMO EXTRAJUDICIAL
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
7. Presupuesto

Devolvé únicamente el texto del escrito, sin comentarios ni aclaraciones.`
        }]
      })
    });

    const data = await response.json();
    const contenido = data.content?.[0]?.text || "";

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

    // Intentar guardar en Supabase Storage
    if (pasId && caso.id) {
      const path = `${pasId}/${caso.id}/${nombreArchivo}`;
      const { error } = await supabase.storage
        .from("casos")
        .upload(path, new Blob([pdfBytes], { type: "application/pdf" }), { upsert: true });

      if (!error) {
        onSuccess({ nombreArchivo, guardadoEn: "storage" });
        return;
      }
    }

    // Fallback: descarga directa
    doc.save(nombreArchivo);
    onSuccess({ nombreArchivo, guardadoEn: "descargas" });
  } catch (e) {
    console.error(e);
    onError("Error al generar el PDF: " + e.message);
  }
}