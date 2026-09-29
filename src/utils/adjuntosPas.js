// Archivos que adjunta el PAS desde el portal (bucket "adjuntos"). Son los mismos que van linkeados en el mail.
// Desde ahora se guardan en <pas_id>/<caso>/; los de antes quedaron sueltos en <pas_id>/, sin caso asignado.
import { supabase } from "../supabase.js";

const BUCKET = "adjuntos";

// "1727539200000_DNI_frente.jpg" → "DNI_frente.jpg"
export const nombreAdjunto = ruta => ruta.split("/").pop().replace(/^\d{10,}_/, "");

async function listar(carpeta) {
  const { data, error } = await supabase.storage.from(BUCKET).list(carpeta, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
  if (error) { console.error("[adjuntos] listar:", error); return null; }
  // Las subcarpetas vienen sin id
  return (data || []).filter(a => a.id).map(a => ({
    ruta: `${carpeta}/${a.name}`,
    nombre: nombreAdjunto(a.name),
    creado: a.created_at,
    peso: a.metadata?.size || 0,
  }));
}

// { delCaso, sueltos } o null si no se pudo leer
export async function adjuntosDelCaso(pasId, casoId) {
  if (!pasId) return { delCaso: [], sueltos: [] };
  const [delCaso, sueltos] = await Promise.all([casoId ? listar(`${pasId}/${casoId}`) : [], listar(String(pasId))]);
  if (delCaso === null && sueltos === null) return null;
  return { delCaso: delCaso || [], sueltos: sueltos || [] };
}

export async function descargarAdjunto(ruta) {
  const { data, error } = await supabase.storage.from(BUCKET).download(ruta);
  if (error) { console.error("[adjuntos] descargar:", error); return null; }
  return data;
}
