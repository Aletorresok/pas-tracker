import { supabase } from "../supabase.js";
import emailjs from "@emailjs/browser";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/**
 * Sube múltiples archivos al bucket de Supabase y notifica por EmailJS.
 */
export async function subirArchivosYNotificar({ pasId, pasNombre, casoData, archivos }) {
  const subidos = []; // { nombre, link }
  const fallidos = [];

  if (archivos && archivos.length > 0) {
    for (let file of archivos) {
      // Se guarda con su nombre original (sin tildes ni símbolos, que Storage no acepta) para que el link se entienda
      const limpio = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").slice(-80);
      const filePath = `${pasId}/${Date.now()}_${limpio || "archivo"}`;

      const { error: uploadError } = await supabase.storage.from("adjuntos").upload(filePath, file);
      if (uploadError) { console.error("[adjuntos] no se pudo subir", file.name, uploadError); fallidos.push(file.name); continue; }
      const { data: linkData } = supabase.storage.from("adjuntos").getPublicUrl(filePath);
      if (linkData?.publicUrl) subidos.push({ nombre: file.name, link: linkData.publicUrl });
    }
  }
  const linksAdjuntos = subidos.map(s => s.link);

  const textoLinks = [
    ...subidos.map(s => `📎 ${s.nombre}\n${s.link}`),
    ...fallidos.map(n => `⚠️ No se pudo subir: ${n}`),
  ].join("\n\n") || "No se adjuntaron archivos.";

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
/**
 * Avisa por mail (mismo servicio y plantilla que las derivaciones) que un cliente subió documentación
 * desde su vista. No lleva links: los archivos están en una carpeta privada y se guardan desde PAS Tracker.
 */
export async function notificarSubidaCliente({ caso, archivos }) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY || !archivos?.length) return;
  const lista = archivos.map(a => `📎 ${a.tipo}: ${a.nombre}`).join("\n");
  const templateParams = {
    pas_nombre: "Cliente, desde su vista de seguimiento",
    asegurado: `${caso.asegurado || "Cliente"} (DOCUMENTACIÓN DEL CLIENTE)`,
    telefono: caso.patente ? `Patente ${caso.patente}` : "N/D",
    fecha_siniestro: "—",
    compania: caso.compania_aseguradora || "N/D",
    links_archivos: `${lista}\n\nEstán esperando en PAS Tracker → Hoy → "Documentación recibida" (Guardar en el caso).`,
  };
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
  } catch (e) {
    console.error("[notificarSubidaCliente] no se pudo mandar el mail:", e);
  }
}
