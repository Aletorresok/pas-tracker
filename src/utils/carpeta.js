import { verificarPermiso } from "./formatters.js"; // <-- Importamos la función centralizada de permisos

// ─────────────────────────────────────────────────────────────────────────────
// FILE SYSTEM ACCESS API — lectura + renombrado en disco
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abre el selector de carpeta del OS en modo readwrite.
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
 * Verifica o solicita permiso readwrite reutilizando la función centralizada.
 */
export async function verificarPermisoCarpeta(handle) {
  return await verificarPermiso(handle, "readwrite");
}

/**
 * Lee todos los archivos de un DirectoryHandle.
 */
export async function leerArchivosCarpeta(dirHandle, getExtension) {
  const archivos = [];

  for await (const [nombre, fileHandle] of dirHandle.entries()) {
    if (fileHandle.kind !== "file") continue;

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
      // Ignorar archivos inaccesibles
    }
  }

  return archivos.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Renombra un archivo en disco.
 */
export async function renombrarArchivoLocal(dirHandle, archivo, nuevoNombre) {
  if (archivo.nombre === nuevoNombre) return;

  const nuevoHandle = await dirHandle.getFileHandle(nuevoNombre, { create: true });
  const writable = await nuevoHandle.createWritable();
  await writable.write(archivo.blob);
  await writable.close();

  await dirHandle.removeEntry(archivo.nombre);
}

export async function crearCarpetaCaso({ asegurado, compania, fechaSiniestro }) {
  const fechaFormateada = fechaSiniestro
    ? fechaSiniestro.split("-").reverse().join("-")
    : "sin-fecha";

  const nombreCarpeta = [asegurado, compania, fechaFormateada]
    .map(s => (s || "").trim())
    .filter(Boolean)
    .join(" - ");

  const padreHandle = await window.showDirectoryPicker({ mode: "readwrite" });
  if (!padreHandle) return null;

  const nuevaHandle = await padreHandle.getDirectoryHandle(nombreCarpeta, { create: true });
  return { handle: nuevaHandle, nombre: nombreCarpeta };
}