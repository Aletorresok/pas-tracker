// useRealtimeSync.js
import { useEffect, useRef } from "react";
import { supabase } from "../supabase.js";

// El callback se guarda en una ref: así el canal se abre una sola vez por fila y no en cada render
// (antes cada tecla en la ficha cerraba y reabría la suscripción).
function useUltimo(fn) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  return ref;
}

/**
 * Hook que sincroniza datos en tiempo real desde Supabase
 * Se suscribe a cambios en una tabla y ejecuta callback cuando hay actualizaciones
 *
 * @param {string} tableName - Nombre de la tabla a escuchar
 * @param {string} filterColumn - Columna para filtrar (ej: "caso_id")
 * @param {string|number} filterValue - Valor del filtro
 * @param {function} onUpdate - Callback (dato, evento): en DELETE recibe la fila vieja
 */
export function useRealtimeSync(tableName, filterColumn, filterValue, onUpdate) {
  const cb = useUltimo(onUpdate);
  useEffect(() => {
    if (!tableName || !filterColumn || !filterValue) return;
    const channel = supabase
      .channel(`${tableName}-${filterValue}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tableName, filter: `${filterColumn}=eq.${filterValue}` },
        (payload) => cb.current?.(payload.eventType === "DELETE" ? payload.old : payload.new, payload.eventType)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tableName, filterColumn, filterValue, cb]);
}

/**
 * Hook para escuchar cambios en múltiples casos (para Portal/Listado)
 */
export function useRealtimeCasos(pasId, onUpdate) {
  const cb = useUltimo(onUpdate);
  useEffect(() => {
    if (!pasId) return;
    const channel = supabase
      .channel(`pas_casos-${pasId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pas_casos", filter: `pas_id=eq.${pasId}` },
        (payload) => cb.current?.(payload.eventType === "DELETE" ? payload.old : payload.new, payload.eventType)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pasId, cb]);
}

/**
 * Hook para escuchar cambios en acciones de un caso
 */
export function useRealtimeAcciones(casoId, onUpdate) {
  const cb = useUltimo(onUpdate);
  useEffect(() => {
    if (!casoId) return;
    const channel = supabase
      .channel(`acciones-${casoId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "acciones", filter: `caso_id=eq.${casoId}` },
        (payload) => cb.current?.(payload)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [casoId, cb]);
}
