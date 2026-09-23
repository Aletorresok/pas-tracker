// Documentación que sube el cliente desde su vista (patente + DNI).
// Supabase ("recepcion") es un buzón de paso: la app la baja a la carpeta del caso en la PC y la borra.
import { supabase } from "../supabase.js";

// Qué le pedimos al cliente, en sus palabras
export const DOCS_CLIENTE = [
  { tipo: "DNI", l: "DNI (frente y dorso)", requerido: true },
  { tipo: "CEDULA", l: "Cédula verde o azul" },
  { tipo: "LICENCIA", l: "Licencia de conducir" },
  { tipo: "DENUNCIA", l: "Denuncia del siniestro", requerido: true },
  { tipo: "CERTIFICADO", l: "Certificado de cobertura", requerido: true },
  { tipo: "FOTOS", l: "Fotos de los daños" },
  { tipo: "PRESUPUESTO", l: "Presupuesto del taller", requerido: true },
  { tipo: "OTRO", l: "Otro documento" },
];
export const etiquetaDoc = t => DOCS_CLIENTE.find(d => d.tipo === t)?.l || t;

const BUCKET = "recepcion";
const LADO_MAX = 2000;

// Achica fotos grandes (una foto de celular de 4-6 MB queda en ~0,5 MB). PDF y lo que no se pueda leer, van tal cual.
async function comprimir(file) {
  if (!file.type.startsWith("image/") || file.size < 900 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const escala = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(bmp.width * escala);
    lienzo.height = Math.round(bmp.height * escala);
    lienzo.getContext("2d").drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise(r => lienzo.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

const limpiarNombre = n => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").slice(-60);

// Sube un archivo del cliente. Devuelve { ok } o { error: "texto para el cliente" }
export async function subirDocumentoCliente({ patente, dni, casoId, tipo, file }) {
  const archivo = await comprimir(file);
  if (archivo.size > 15 * 1024 * 1024) return { error: "El archivo pesa más de 15 MB. Probá con una foto o un PDF más liviano." };
  const { data: ruta, error: errAut } = await supabase.rpc("autorizar_subida_cliente", { p_patente: patente, p_dni: dni, p_caso_id: casoId, p_tipo: tipo, p_nombre: limpiarNombre(archivo.name) });
  if (errAut || !ruta) {
    console.error("[subida cliente] autorizar:", errAut);
    return { error: String(errAut?.message || "").includes("demasiadas") ? "Subiste muchos archivos hoy. Mandanos el resto por WhatsApp." : "No pudimos preparar la subida. Probá de nuevo en un rato." };
  }
  const { error: errSub } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: archivo.type || "application/octet-stream", upsert: false });
  if (errSub) {
    console.error("[subida cliente] subir:", errSub);
    return { error: /mime|type/i.test(errSub.message || "") ? "Ese tipo de archivo no se acepta. Mandá una foto o un PDF." : "No se pudo subir el archivo. Revisá la conexión y probá de nuevo." };
  }
  await supabase.rpc("confirmar_subida_cliente", { p_ruta: ruta });
  return { ok: true };
}

// Lo que ve el cliente además de su caso: documentos enviados, lo que el estudio ya tildó y la próxima mediación/audiencia.
// Si la función nueva no existe todavía (falta el SQL 13), usa la anterior (solo enviados).
export async function extrasCliente({ patente, dni, casoId }) {
  const { data, error } = await supabase.rpc("extras_cliente", { p_patente: patente, p_dni: dni, p_caso_id: casoId });
  if (!error && data) return { enviados: data.enviados || [], tenemos: data.tenemos || {}, proximoEvento: data.proximo_evento || null };
  const enviados = await documentosEnviados({ patente, dni, casoId });
  return enviados === null ? null : { enviados, tenemos: {}, proximoEvento: null };
}

export async function documentosEnviados({ patente, dni, casoId }) {
  const { data, error } = await supabase.rpc("documentos_enviados_cliente", { p_patente: patente, p_dni: dni, p_caso_id: casoId });
  if (error) return null;
  return Array.isArray(data) ? data : [];
}

// ── Lado del estudio ────────────────────────────────────────────────────────
const CAMBIO = "pas-recepcion-cambio";
export const escucharRecepcion = fn => { window.addEventListener(CAMBIO, fn); return () => window.removeEventListener(CAMBIO, fn); };

// Archivos subidos por clientes que todavía no bajaste (todos los casos, o uno)
export async function pendientesRecepcion(casoId) {
  let q = supabase.from("pas_subidas_cliente").select("*").eq("estado", "subida").order("creado", { ascending: false });
  if (casoId) q = q.eq("caso_id", casoId);
  const { data, error } = await q;
  if (error) return null;
  return data || [];
}

export async function descargarRecepcion(s) {
  const { data, error } = await supabase.storage.from(BUCKET).download(s.ruta);
  if (error) { console.error("[recepción] descargar:", error); return null; }
  return data;
}

// Ya guardado en la PC: se borra de la nube y queda registrado como guardado
export async function marcarGuardado(s) {
  const { error: errBorrar } = await supabase.storage.from(BUCKET).remove([s.ruta]);
  if (errBorrar) console.error("[recepción] borrar de la nube:", errBorrar);
  const { error } = await supabase.from("pas_subidas_cliente").update({ estado: "guardada" }).eq("id", s.id);
  if (error) { console.error("[recepción] marcar guardado:", error); return false; }
  window.dispatchEvent(new Event(CAMBIO));
  return true;
}
