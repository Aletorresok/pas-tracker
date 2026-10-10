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

// Borra de la nube (solo el administrador puede: policy admin_archivos). Devuelve true si salió bien.
export async function borrarAdjuntos(rutas) {
  if (!rutas.length) return true;
  const { error } = await supabase.storage.from(BUCKET).remove(rutas);
  if (error) { console.error("[adjuntos] borrar:", error); return false; }
  return true;
}

// Qué archivos ya bajaste: queda anotado en este navegador (localStorage), para avisar antes de borrar uno que no bajaste.
const CLAVE_BAJADOS = "adjuntos:bajados";
const leerBajados = () => { try { return new Set(JSON.parse(localStorage.getItem(CLAVE_BAJADOS)) || []); } catch { return new Set(); } };
export const yaBajado = ruta => leerBajados().has(ruta);
export const marcarBajado = ruta => { try { const s = leerBajados(); s.add(ruta); localStorage.setItem(CLAVE_BAJADOS, JSON.stringify([...s].slice(-3000))); } catch { /* sin storage */ } };

export const esImagen = nombre => /\.(jpe?g|png|heic|webp)$/i.test(nombre);

// Tipo de documento que sugiere el nombre del archivo (para guardarlo ya categorizado en la carpeta del caso)
export function tipoSugerido(nombre) {
  if (!/\.pdf$/i.test(nombre) && esImagen(nombre) === false) return null;
  if (/denuncia/i.test(nombre)) return "DENUNCIA";
  if (/cobertura|certificad/i.test(nombre)) return "CERTIFICADO";
  if (/presupuesto/i.test(nombre)) return "PRESUPUESTO";
  if (/\bdni\b/i.test(nombre)) return "DNI";
  if (/c[eé]dula/i.test(nombre)) return "CEDULA";
  if (/licencia|registro/i.test(nombre)) return "LICENCIA";
  return null;
}

// Próximo nombre libre en la carpeta: DNI_1.jpg, DNI_2.jpg… (mismo criterio que el checklist y la recepción del cliente)
export async function siguienteNombre(dirHandle, tipo, ext) {
  let max = 0;
  const patron = new RegExp(`^${tipo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}_(\\d+)\\.[a-z0-9]+$`, "i");
  for await (const [nombre] of dirHandle.entries()) {
    const m = nombre.match(patron);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${tipo}_${max + 1}${ext}`;
}

export async function descargarAdjunto(ruta) {
  const { data, error } = await supabase.storage.from(BUCKET).download(ruta);
  if (error) { console.error("[adjuntos] descargar:", error); return null; }
  return data;
}
