import { supabase } from "../supabase.js";

export async function categorizarArchivo({ pasId, casoId, archivo, tipo, archivos, onSuccess, onError }) {
  try {
    let nuevoNombre;

    if (tipo === "FOTO") {
      const fotos = archivos.filter(a => /^FOTO_\d+\.(jpg|jpeg|png)$/i.test(a.nombre));
      const nums = fotos.map(a => parseInt(a.nombre.match(/\d+/)[0])).filter(n => !isNaN(n));
      const nextN = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      const ext = archivo.ext || ".jpg";
      nuevoNombre = `FOTO_${nextN}${ext}`;
    } else {
      const ext = archivo.ext || ".pdf";
      nuevoNombre = `${tipo}${ext}`;
    }

    const pathOrigen = `${pasId}/${casoId}/${archivo.nombre}`;
    const pathDestino = `${pasId}/${casoId}/${nuevoNombre}`;

    // Descargar el blob original
    const { data: blob, error: downloadError } = await supabase.storage
      .from("casos")
      .download(pathOrigen);
    if (downloadError) throw downloadError;

    // Subir con el nuevo nombre
    const { error: uploadError } = await supabase.storage
      .from("casos")
      .upload(pathDestino, blob, { upsert: true });
    if (uploadError) throw uploadError;

    // Eliminar el original si el nombre cambió
    if (archivo.nombre !== nuevoNombre) {
      await supabase.storage.from("casos").remove([pathOrigen]);
    }

    onSuccess({ nombreAnterior: archivo.nombre, nuevoNombre, tipo });
  } catch (e) {
    onError(`Error al categorizar: ${e.message}`);
  }
}