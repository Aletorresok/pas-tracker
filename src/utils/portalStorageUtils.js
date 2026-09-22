import { supabase } from "../supabase.js";
import emailjs from "@emailjs/browser";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/**
 * Sube múltiples archivos al bucket de Supabase y notifica por EmailJS.
 */
export async function subirArchivosYNotificar({ pasId, pasNombre, casoData, archivos }) {
  const linksAdjuntos = [];
  
  if (archivos && archivos.length > 0) {
    for (let file of archivos) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${pasId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("adjuntos").upload(filePath, file);
      if (!uploadError) {
        const { data: linkData } = supabase.storage.from("adjuntos").getPublicUrl(filePath);
        if (linkData?.publicUrl) {
          linksAdjuntos.push(linkData.publicUrl);
        }
      }
    }
  }

  const textoLinks = linksAdjuntos.length > 0
    ? linksAdjuntos.map((link, i) => `🔗 Archivo ${i + 1}: ${link}`).join('\n')
    : "No se adjuntaron archivos.";

  const templateParams = {
    pas_nombre: pasNombre || "Productor",
    asegurado: casoData.asegurado || "N/D",
    telefono: casoData.telefono || "N/D",
    fecha_siniestro: casoData.fecha_siniestro || "N/D",
    compania: casoData.compania || "N/D",
    links_archivos: textoLinks,
  };

  await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
  return linksAdjuntos;
}