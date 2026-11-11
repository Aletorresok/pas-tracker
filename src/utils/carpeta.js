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

// Nombre válido en Windows, macOS y Linux: sin caracteres prohibidos, sin espacios ni puntos al final y de largo razonable
export function nombreCarpetaSeguro(texto) {
  return String(texto || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
    .replace(/[. ]+$/, "") || "Caso";
}

// Traduce los errores del navegador a algo que se entienda (y deja el original entre paréntesis para poder rastrearlo)
export function mensajeErrorCarpeta(e) {
  const original = e?.message ? ` (${e.message})` : "";
  switch (e?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return `Chrome no dio permiso para escribir en esa carpeta. Probá de nuevo y elegí una carpeta tuya, por ejemplo la de Expedientes${original}`;
    case "TypeError":
    case "InvalidModificationError":
      return `El nombre de la carpeta no es válido para la PC${original}`;
    case "NotFoundError":
      return `La carpeta elegida ya no existe o se movió${original}`;
    case "NoModificationAllowedError":
    case "InvalidStateError":
      return `La carpeta está bloqueada o es de solo lectura (puede pasar con carpetas de Drive u OneDrive sin sincronizar)${original}`;
    default:
      return `No se pudo crear la carpeta${original}`;
  }
}

// Crea la carpeta del caso dentro de la que elija el usuario. null si cancela el selector.
export async function crearCarpetaCaso({ asegurado, compania, fechaSiniestro }) {
  const fecha = String(fechaSiniestro || "").slice(0, 10);
  const fechaFormateada = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha.split("-").reverse().join("-") : "sin-fecha";

  const nombreCarpeta = nombreCarpetaSeguro([asegurado, compania, fechaFormateada]
    .map(s => (s || "").trim())
    .filter(Boolean)
    .join(" - "));

  const padreHandle = await elegirCarpeta(); // cancelar no es un error
  if (!padreHandle) return null;
  if (!(await verificarPermisoCarpeta(padreHandle))) {
    const e = new Error("sin permiso de escritura"); e.name = "NotAllowedError"; throw e;
  }

  const nuevaHandle = await padreHandle.getDirectoryHandle(nombreCarpeta, { create: true });
  return { handle: nuevaHandle, nombre: nombreCarpeta };
}
