// useRealtimeSync.js
import { useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

/**
 * Hook que sincroniza datos en tiempo real desde Supabase
 * Se suscribe a cambios en una tabla y ejecuta callback cuando hay actualizaciones
 * 
 * @param {string} tableName - Nombre de la tabla a escuchar
 * @param {string} filterColumn - Columna para filtrar (ej: "caso_id")
 * @param {string|number} filterValue - Valor del filtro
 * @param {function} onUpdate - Callback cuando hay cambios (recibe el dato actualizado)
 */
export function useRealtimeSync(tableName, filterColumn, filterValue, onUpdate) {
  useEffect(() => {
    if (!tableName || !filterColumn || !filterValue) {
      return;
    }

    // Crear el filtro dinámico
    const channel = supabase
      .channel(`${tableName}-${filterValue}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Escucha INSERT, UPDATE, DELETE
          schema: "public",
          table: tableName,
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        (payload) => {
          console.log(`[Realtime] ${tableName} actualizado:`, payload);
          // Llamar el callback con el nuevo dato
          if (onUpdate) {
            onUpdate(payload.new || payload.old);
          }
        }
      )
      .subscribe();

    // Cleanup: desuscribirse al desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, filterColumn, filterValue, onUpdate]);
}

/**
 * Hook para escuchar cambios en múltiples casos (para Portal/Listado)
 */
export function useRealtimeCasos(pasId, onUpdate) {
  useEffect(() => {
    if (!pasId) return;

    const channel = supabase
      .channel(`pas_casos-${pasId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pas_casos",
          filter: `pas_id=eq.${pasId}`,
        },
        (payload) => {
          console.log(`[Realtime] Caso actualizado:`, payload.new || payload.old);
          if (onUpdate) {
            onUpdate(payload.new || payload.old);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pasId, onUpdate]);
}

/**
 * Hook para escuchar cambios en acciones de un caso
 */
export function useRealtimeAcciones(casoId, onUpdate) {
  useEffect(() => {
    if (!casoId) return;

    const channel = supabase
      .channel(`acciones-${casoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "acciones",
          filter: `caso_id=eq.${casoId}`,
        },
        (payload) => {
          console.log(`[Realtime] Acción actualizada:`, payload);
          if (onUpdate) {
            onUpdate(payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [casoId, onUpdate]);
}
