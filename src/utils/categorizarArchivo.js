import { supabase } from "../supabase.js";

// Tipos de documento disponibles para categorizar
// El orden importa: es el que se muestra en el checklist y el menú
export const TIPOS_DOC = [
  "DNI",
  "LICENCIA",
  "CEDULA",
  "FOTOS",
  "ESCRITO",
  "DENUNCIA",
  "CERTIFICADO",
  "PRESUPUESTO",
  "INFO TERCERO",
];

// Docs mínimos para considerar el caso listo para iniciar reclamo
export const DOCS_REQUERIDOS_RECLAMO = [
  "DNI",
  "DENUNCIA",
  "CERTIFICADO",
  "PRESUPUESTO",
];

// Tipos que admiten múltiples archivos numerados
const TIPOS_NUMERABLES = ["FOTOS", "PRESUPUESTO", "ESCRITO"];

/**
 * Genera el próximo nombre de archivo para un tipo dado,
 * teniendo en cuenta los archivos ya existentes en el caso.
 *
 * Ejemplos:
 *   DNI        → DNI_1.pdf, DNI_2.pdf
 *   FOTOS      → FOTOS_1.jpg, FOTOS_2.jpg
 *   DENUNCIA   → DENUNCIA_1.pdf
 *
 * @param {string} tipo       - Uno de TIPOS_DOC
 * @param {string} ext        - Extensión con punto, ej: ".pdf"
 * @param {Array}  archivos   - Lista actual de archivos del caso
 * @returns {string}          - Nombre final, ej: "FOTOS_2.jpg"
 */
function generarNombre(tipo, ext, archivos) {
  // Escapamos el tipo para usarlo en regex (ej: "INFO TERCERO" → "INFO\ TERCERO")
  const tipoEscapado = tipo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(" ", "\\ ");
  const pattern = new RegExp(`^${tipoEscapado}_(\\d+)\\.[a-z0-9]+$`, "i");

  const nums = archivos
    .map(a => {
      const m = a.nombre.match(pattern);
      return m ? parseInt(m[1], 10) : null;
    })
    .filter(n => n !== null);

  const nextN = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${tipo}_${nextN}${ext}`;
}

/**
 * Categoriza (renombra) un archivo en Supabase Storage según el tipo elegido.
 * Siempre usa numeración: DNI_1, DNI_2, FOTOS_1, FOTOS_2, etc.
 * Si el archivo ya tiene ese nombre exacto, no hace nada.
 */
export async function categorizarArchivo({
  pasId,
  casoId,
  archivo,
  tipo,
  archivos,
  onSuccess,
  onError,
}) {
  try {
    const ext = archivo.ext || ".pdf";
    const nuevoNombre = generarNombre(tipo, ext, archivos);

    const pathOrigen  = `${pasId}/${casoId}/${archivo.nombre}`;
    const pathDestino = `${pasId}/${casoId}/${nuevoNombre}`;

    // Descargar blob original
    const { data: blob, error: downloadError } = await supabase.storage
      .from("casos")
      .download(pathOrigen);
    if (downloadError) throw downloadError;

    // Subir con nuevo nombre
    const { error: uploadError } = await supabase.storage
      .from("casos")
      .upload(pathDestino, blob, { upsert: true });
    if (uploadError) throw uploadError;

    // Eliminar original si el nombre cambió
    if (archivo.nombre !== nuevoNombre) {
      await supabase.storage.from("casos").remove([pathOrigen]);
    }

    onSuccess({ nombreAnterior: archivo.nombre, nuevoNombre, tipo });
  } catch (e) {
    onError(`Error al categorizar: ${e.message}`);
  }
}

/**
 * Renombra un archivo con un nombre libre (sin pasar por TIPOS_DOC).
 * Mantiene la extensión original si el nombre nuevo no tiene extensión.
 */
export async function renombrarArchivo({
  pasId,
  casoId,
  archivo,
  nuevoNombre,
  onSuccess,
  onError,
}) {
  try {
    // Si el nombre nuevo no tiene extensión, le ponemos la del original
    const tieneExt = nuevoNombre.includes(".");
    const nombreFinal = tieneExt ? nuevoNombre : `${nuevoNombre}${archivo.ext}`;

    const pathOrigen  = `${pasId}/${casoId}/${archivo.nombre}`;
    const pathDestino = `${pasId}/${casoId}/${nombreFinal}`;

    if (pathOrigen === pathDestino) {
      onSuccess({ nombreAnterior: archivo.nombre, nuevoNombre: nombreFinal });
      return;
    }

    // Descargar blob original
    const { data: blob, error: downloadError } = await supabase.storage
      .from("casos")
      .download(pathOrigen);
    if (downloadError) throw downloadError;

    // Subir con nuevo nombre
    const { error: uploadError } = await supabase.storage
      .from("casos")
      .upload(pathDestino, blob, { upsert: true });
    if (uploadError) throw uploadError;

    // Eliminar original
    await supabase.storage.from("casos").remove([pathOrigen]);

    onSuccess({ nombreAnterior: archivo.nombre, nuevoNombre: nombreFinal });
  } catch (e) {
    onError(`Error al renombrar: ${e.message}`);
  }
}