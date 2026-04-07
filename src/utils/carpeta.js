import { supabase } from "../supabase.js";

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE STORAGE — sin cambios respecto al original
// ─────────────────────────────────────────────────────────────────────────────

export async function subirArchivo({ pasId, casoId, file, onSuccess, onError }) {
  try {
    const path = `${pasId}/${casoId}/${file.name}`;
    const { error } = await supabase.storage
      .from("casos")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    onSuccess({ nombre: file.name });
  } catch (e) {
    onError(`Error al subir archivo: ${e.message}`);
  }
}

export async function cargarArchivos({ pasId, casoId, getExtension, onSuccess, onError }) {
  try {
    const { data, error } = await supabase.storage
      .from("casos")
      .list(`${pasId}/${casoId}`);
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
            origen: "supabase",
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

// ─────────────────────────────────────────────────────────────────────────────
// FILE SYSTEM ACCESS API — lectura + renombrado en disco
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abre el selector de carpeta del OS en modo readwrite (necesario para renombrar).
 * Devuelve el DirectoryHandle o null si el usuario cancela.
 */
export async function elegirCarpeta() {
  if (!window.showDirectoryPicker) return null;
  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    return handle;
  } catch (e) {
    if (e.name === "AbortError") return null;
    throw e;
  }
}

/**
 * Verifica o solicita permiso readwrite sobre un DirectoryHandle.
 * Devuelve true si tiene permiso, false si no.
 */
export async function verificarPermisoCarpeta(handle) {
  try {
    const perm = await handle.queryPermission({ mode: "readwrite" });
    if (perm === "granted") return true;
    const req = await handle.requestPermission({ mode: "readwrite" });
    return req === "granted";
  } catch {
    return false;
  }
}

/**
 * Lee todos los archivos de un DirectoryHandle.
 * Devuelve objetos con la misma forma que cargarArchivos,
 * más fileHandle (necesario para renombrar en disco después).
 */
export async function leerArchivosCarpeta(dirHandle, getExtension) {
  const archivos = [];

  for await (const [nombre, fileHandle] of dirHandle.entries()) {
    if (fileHandle.kind !== "file") continue;

    // Ignorar archivos del sistema
    if (
      nombre.startsWith(".") ||
      nombre === "Thumbs.db" ||
      nombre === "desktop.ini"
    ) continue;

    try {
      const file = await fileHandle.getFile();
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      archivos.push({
        nombre,
        ext: getExtension(nombre),
        tipo: "",
        tamaño: file.size,
        blob,
        origen: "local",
        fileHandle,
      });
    } catch {
      // Archivo inaccesible, lo ignoramos
    }
  }

  return archivos.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Renombra un archivo en disco.
 * La File System Access API no tiene rename nativo:
 * crea el archivo nuevo → copia el contenido → elimina el original.
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {object}  archivo      - objeto con nombre y blob
 * @param {string}  nuevoNombre  - nombre final con extensión
 */
export async function renombrarArchivoLocal(dirHandle, archivo, nuevoNombre) {
  if (archivo.nombre === nuevoNombre) return;

  const nuevoHandle = await dirHandle.getFileHandle(nuevoNombre, { create: true });
  const writable = await nuevoHandle.createWritable();
  await writable.write(archivo.blob);
  await writable.close();

  await dirHandle.removeEntry(archivo.nombre);
}