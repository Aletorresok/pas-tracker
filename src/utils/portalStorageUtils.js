import { supabase } from "../supabase.js";
import emailjs from "@emailjs/browser";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
// Plantilla propia para lo que sube el cliente (asunto y texto propios). El ID no es secreto: viaja igual en la página.
const TEMPLATE_CLIENTE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_CLIENTE_ID || "template_beake0i";
const LINK_APP = "https://pas-tracker20.vercel.app";

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
 * Avisa por mail lo que subió un cliente en una sesión (plantilla propia si está cargada; si no, la de derivaciones),
 * todo junto en un solo mail. Sin links: los archivos están en una carpeta privada y se guardan desde PAS Tracker.
 * Usa la API de EmailJS con `keepalive`, así el envío sale aunque la página se esté cerrando.
 * @param items [{ caso, tipo, nombre }]
 */
export function notificarSubidaCliente(items) {
  if (!SERVICE_ID || !TEMPLATE_CLIENTE_ID || !PUBLIC_KEY || !items?.length) return;
  const porCaso = new Map();
  items.forEach(it => {
    if (!porCaso.has(it.caso.id)) porCaso.set(it.caso.id, { caso: it.caso, archivos: [] });
    porCaso.get(it.caso.id).archivos.push(it);
  });
  const grupos = [...porCaso.values()];
  const primero = grupos[0].caso;
  const lista = grupos.map(g =>
    (grupos.length > 1 ? `${g.caso.asegurado || "Caso"} (${g.caso.patente || "sin patente"}):\n` : "") +
    g.archivos.map(a => `📎 ${a.tipo}: ${a.nombre}`).join("\n")
  ).join("\n\n");
  const cantidad = `${items.length} ${items.length === 1 ? "archivo" : "archivos"}`;
  const templateParams = {
    // Plantilla propia del cliente
    asegurados: grupos.map(g => g.caso.asegurado || "Cliente").join(" / "),
    patentes: grupos.map(g => g.caso.patente).filter(Boolean).join(" / ") || "sin patente",
    cantidad,
    documentos: lista,
    link_app: LINK_APP,
    // Plantilla de derivaciones (mientras no exista la propia)
    pas_nombre: "Cliente, desde su vista de seguimiento",
    asegurado: `${grupos.map(g => g.caso.asegurado || "Cliente").join(" / ")} (DOCUMENTACIÓN DEL CLIENTE · ${cantidad})`,
    telefono: primero.patente ? `Patente ${primero.patente}` : "N/D",
    fecha_siniestro: "—",
    compania: [...new Set(grupos.map(g => g.caso.compania_aseguradora).filter(Boolean))].join(" / ") || "N/D",
    links_archivos: `${lista}\n\nEstán esperando en PAS Tracker → Hoy → "Documentación recibida" (Guardar en el caso).`,
  };
  try {
    fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: SERVICE_ID, template_id: TEMPLATE_CLIENTE_ID, user_id: PUBLIC_KEY, template_params: templateParams }),
      keepalive: true,
    }).catch(e => console.error("[notificarSubidaCliente] no se pudo mandar el mail:", e));
  } catch (e) {
    console.error("[notificarSubidaCliente] no se pudo mandar el mail:", e);
  }
}
