// Pagos de comisiones a los PAS con su comprobante de transferencia (SQL 49).
// Un pago (tabla pas_pagos_comision) puede cubrir varias comisiones: cada caso apunta a su pago con pago_comision_id.
// El archivo va a la carpeta privada "comprobantes" en <pas_id>/<pago>/<archivo>; el PAS solo puede ver su carpeta.
import { supabase } from "../supabase.js";

const BUCKET = "comprobantes";
const MAX_MB = 10;

const nuevoId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

// "Comprobante Bip 12-11 (1).pdf" → "Comprobante_Bip_12-11_1.pdf" (Storage no acepta cualquier carácter)
const nombreSeguro = nombre => {
  const limpio = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return limpio || "comprobante";
};

export const ACEPTA = "application/pdf,image/*";

// Devuelve un texto de error o "" si el archivo sirve
export function validarArchivo(archivo) {
  if (!archivo) return "Elegí el comprobante (PDF o foto).";
  if (archivo.size > MAX_MB * 1024 * 1024) return `El archivo pesa más de ${MAX_MB} MB.`;
  if (!/^(application\/pdf|image\/)/.test(archivo.type || "") && !/\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(archivo.name)) return "Tiene que ser un PDF o una imagen.";
  return "";
}

// Registra un pago: sube el comprobante, crea el pago y marca las comisiones como pagadas.
// casos = filas de pas_casos que cubre. Devuelve { pago, casos: [{ id, fecha_pago_comision, pago_comision_id }] } o { error }.
export async function registrarPago({ pasId, fecha, monto, nota, archivo, casos }) {
  const err = validarArchivo(archivo);
  if (err) return { error: err };
  if (!casos.length) return { error: "Tildá al menos una comisión." };

  const id = nuevoId();
  const ruta = `${pasId}/${id}/${Date.now()}_${nombreSeguro(archivo.name)}`;
  const { error: errSubida } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: archivo.type || undefined });
  if (errSubida) {
    console.error("[comprobantes] subir:", errSubida);
    return { error: /bucket not found/i.test(errSubida.message || "") ? "Falta correr el SQL 49 en Supabase." : "No se pudo subir el comprobante: " + (errSubida.message || "error desconocido") };
  }

  const pago = { id, pas_id: parseInt(pasId, 10), fecha, monto: monto || null, nota: nota?.trim() || null, archivo: ruta, nombre_archivo: archivo.name };
  const { error: errPago } = await supabase.from("pas_pagos_comision").insert([pago]);
  if (errPago) {
    console.error("[comprobantes] pago:", errPago);
    await supabase.storage.from(BUCKET).remove([ruta]);
    return { error: "No se pudo guardar el pago: " + (errPago.message || "error desconocido") };
  }

  // La fecha de pago de cada comisión es la de la transferencia (si ya tenía otra, se corrige)
  const cambios = { fecha_pago_comision: fecha, pago_comision_id: id };
  const { error: errCasos } = await supabase.from("pas_casos").update(cambios).in("id", casos.map(c => c.id));
  if (errCasos) {
    console.error("[comprobantes] casos:", errCasos);
    return { pago, casos: [], error: "El comprobante quedó guardado, pero no se pudieron marcar las comisiones: " + (errCasos.message || "error desconocido") };
  }
  return { pago, casos: casos.map(c => ({ id: c.id, ...cambios })) };
}

// Pagos de un PAS (o de todos si pasId es null), del más nuevo al más viejo. null si no se pudo leer (p. ej. falta el SQL 49).
export async function cargarPagos(pasId = null) {
  let q = supabase.from("pas_pagos_comision").select("*").order("fecha", { ascending: false }).order("created_at", { ascending: false });
  if (pasId != null) q = q.eq("pas_id", parseInt(pasId, 10));
  const { data, error } = await q;
  if (error) { console.error("[comprobantes] cargar:", error); return null; }
  return data || [];
}

// Abre el comprobante en otra pestaña con un link que vence en 10 minutos.
// La pestaña se abre antes de pedir el link para que el navegador no la bloquee.
export async function abrirComprobante(pago) {
  if (!pago?.archivo) return false;
  const ventana = window.open("", "_blank");
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pago.archivo, 600);
  if (error || !data?.signedUrl) {
    console.error("[comprobantes] abrir:", error);
    ventana?.close();
    return false;
  }
  if (ventana) ventana.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
  return true;
}

// Igual, partiendo del id del pago (desde un caso: pas_casos.pago_comision_id)
export async function abrirComprobanteDePago(pagoId) {
  if (!pagoId) return false;
  const { data, error } = await supabase.from("pas_pagos_comision").select("archivo").eq("id", pagoId).maybeSingle();
  if (error) console.error("[comprobantes] pago:", error);
  return abrirComprobante(data);
}

// Borra un pago cargado por error: el archivo y el registro. Las comisiones quedan pagadas pero sin comprobante.
export async function borrarPago(pago) {
  if (pago.archivo) await supabase.storage.from(BUCKET).remove([pago.archivo]);
  const { error } = await supabase.from("pas_pagos_comision").delete().eq("id", pago.id);
  if (error) { console.error("[comprobantes] borrar:", error); return false; }
  return true;
}
