// Margen de "reclamo quieto": días sin respuesta de la compañía antes de avisarte para reiterar.
// Uno general (fila "*") y, si querés, uno propio por compañía. Tabla pas_margen_companias (SQL 14).
import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";

export const MARGEN_DEFECTO = 14;
export const GENERAL = "*";
const CAMBIO = "pas-margenes-cambio";

// Días para una compañía: el suyo, si no el general, si no 14
export const margenPara = (margenes, cia) => margenes?.[cia] ?? margenes?.[GENERAL] ?? MARGEN_DEFECTO;

// { compania: dias } o null si la tabla no existe todavía
export async function cargarMargenes() {
  const { data, error } = await supabase.from("pas_margen_companias").select("compania, dias");
  if (error) return null;
  return Object.fromEntries((data || []).map(r => [r.compania, r.dias]));
}

// dias vacío = volver al general (o a 14, si es el general)
export async function guardarMargen(compania, dias) {
  const { error } = dias
    ? await supabase.from("pas_margen_companias").upsert({ compania, dias }, { onConflict: "compania" })
    : await supabase.from("pas_margen_companias").delete().eq("compania", compania);
  if (error) { console.error("[margen] no se pudo guardar:", error); return false; }
  window.dispatchEvent(new Event(CAMBIO));
  return true;
}

// Márgenes cargados y al día. `null` mientras carga o si falta el SQL.
export function useMargenes() {
  const [margenes, setMargenes] = useState(null);
  useEffect(() => {
    const cargar = () => cargarMargenes().then(setMargenes);
    cargar();
    window.addEventListener(CAMBIO, cargar);
    return () => window.removeEventListener(CAMBIO, cargar);
  }, []);
  return margenes;
}
