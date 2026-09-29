// Copia de seguridad completa: todas las tablas de trabajo en un solo archivo JSON que se descarga a la PC.
// Se hace sola una vez por semana (la primera vez que abrís la app) y también a mano desde "Apariencia y backup".
// No incluye configuración con claves (pas_config), administradores, suscripciones de notificaciones ni intentos de ingreso.
import { supabase } from "../supabase.js";
import { fechaLocalISO } from "./formatters.js";

export const TABLAS_COPIA = [
  "pas_casos", "acciones", "pas_eventos", "pas_subidas_cliente", "pas_margen_companias",
  "pas_historial", "pas_derivadores", "pas_descartados", "pas_manuales", "pas_lista", "pas_portal_users",
  "pas_ofertas", "pas_caso_contactos", "pas_companias",
  "pas_contactos",
  // ATG Lex (SQL 25 a 28): si alguna tabla todavía no existe, se saltea y la copia sale igual
  "expedientes", "plazos", "dias_inhabiles", "rutina_items", "rutina_registro", "dias_escuela", "objetivos",
  "pas_papelera", "indices", "modelos_carta", "pas_ajustes", "gastos",
];
// Tabla que no existe (falta correr su SQL): no se copia, pero no corta la copia
const noExiste = error => ["42P01", "PGRST205"].includes(error?.code) || /does not exist|Could not find the table/i.test(error?.message || "");
const TANDA = 1000;
const CLAVE_ULTIMA = "pastracker_copia_completa_fecha";
export const DIAS_ENTRE_COPIAS = 7;

async function leerTabla(tabla) {
  const filas = [];
  let ordenar = true;
  for (let desde = 0; ; desde += TANDA) {
    let q = supabase.from(tabla).select("*").range(desde, desde + TANDA - 1);
    if (ordenar) q = q.order("id");
    let { data, error } = await q;
    // Tablas sin columna "id": se leen sin ordenar
    if (error && ordenar && desde === 0) { ordenar = false; ({ data, error } = await supabase.from(tabla).select("*").range(0, TANDA - 1)); }
    if (error && desde === 0 && noExiste(error)) return null;
    if (error) throw new Error(`${tabla}: ${error.message}`);
    filas.push(...(data || []));
    if (!data || data.length < TANDA) return filas;
  }
}

export function ultimaCopia() {
  try { return localStorage.getItem(CLAVE_ULTIMA); } catch { return null; }
}

export function copiaPendiente(hoy = fechaLocalISO()) {
  const ultima = ultimaCopia();
  if (!ultima) return true;
  const dias = Math.round((new Date(hoy + "T12:00:00") - new Date(ultima.slice(0, 10) + "T12:00:00")) / 86400000);
  return dias >= DIAS_ENTRE_COPIAS;
}

// Descarga la copia. Devuelve { ok, filas, error }.
export async function descargarCopiaCompleta() {
  try {
    const tablas = {};
    let filas = 0;
    const faltan = [];
    for (const t of TABLAS_COPIA) {
      const datos = await leerTabla(t);
      if (datos === null) { faltan.push(t); continue; }
      tablas[t] = datos;
      filas += datos.length;
    }
    const hoy = fechaLocalISO();
    const copia = { version: 2, tipo: "copia_completa", fecha: new Date().toISOString(), tablas, ...(faltan.length ? { tablas_sin_crear: faltan } : {}) };
    const blob = new Blob([JSON.stringify(copia)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pastracker_copia_completa_${hoy}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    try { localStorage.setItem(CLAVE_ULTIMA, hoy); } catch { /* sin almacenamiento: se volverá a intentar */ }
    return { ok: true, filas };
  } catch (e) {
    console.error("[copia completa]", e);
    return { ok: false, error: e.message || "error desconocido" };
  }
}
