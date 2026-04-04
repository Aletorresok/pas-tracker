import { supabase } from "../supabase.js";

export async function subirArchivo({ pasId, casoId, file, onSuccess, onError }) {
  try {
    const path = `${pasId}/${casoId}/${file.name}`;
    const { error } = await supabase.storage.from("casos").upload(path, file, { upsert: true });
    if (error) throw error;
    onSuccess({ nombre: file.name });
  } catch (e) {
    onError(`Error al subir archivo: ${e.message}`);
  }
}

export async function cargarArchivos({ pasId, casoId, getExtension, onSuccess, onError }) {
  try {
    const { data, error } = await supabase.storage.from("casos").list(`${pasId}/${casoId}`);
    if (error) throw error;

    const archivos = await Promise.all(
      (data || []).map(async (f) => {
        try {
          const { data: blob } = await supabase.storage
            .from("casos")
            .download(`${pasId}/${casoId}/${f.name}`);
          return {
            nombre: f.name,
            ext: getExtension(f.name),
            tipo: f.metadata?.tipo || "",
            tamaño: f.metadata?.size || blob?.size || 0,
            blob,
          };
        } catch {
          return null;
        }
      })
    );

    onSuccess(archivos.filter(Boolean));
  } catch (e) {
    onError(`Error al cargar archivos: ${e.message}`);
  }
}