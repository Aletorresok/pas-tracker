import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase.js";

// ── HOOK: CARGAR Y GUARDAR DATOS PAS ──────────────────────────────────────────────
export function usePASData() {
  const [historial, setHistorial] = useState({});
  const [casos, setCasos] = useState({});
  const [derivadores, setDerivadores] = useState({});
  const [recordatorios, setRecordatorios] = useState({});
  const [descartados, setDescartados] = useState({});
  const [pasManuales, setPasManuales] = useState({});
  const [loading, setLoading] = useState(true);

  // ── CARGAR TODOS LOS DATOS ────────────────────────────────────────────────────
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Historial
      const historialData = await loadStorage("pas_historial");
      if (historialData) setHistorial(historialData);

      // Casos
      const casosData = await loadStorage("pas_casos");
      if (casosData) setCasos(casosData);

      // Derivadores
      const derivadoresData = await loadStorage("pas_derivadores");
      if (derivadoresData) setDerivadores(derivadoresData);

      // Recordatorios
      const recordatoriosData = await loadStorage("pas_recordatorios");
      if (recordatoriosData) setRecordatorios(recordatoriosData);

      // Descartados
      const descartadosData = await loadStorage("pas_descartados");
      if (descartadosData) setDescartados(descartadosData);

      // Manuales
      const manualesData = await loadStorage("pas_manuales");
      if (manualesData) setPasManuales(manualesData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    historial,
    setHistorial,
    casos,
    setCasos,
    derivadores,
    setDerivadores,
    recordatorios,
    setRecordatorios,
    descartados,
    setDescartados,
    pasManuales,
    setPasManuales,
    loading,
    reloadAllData: loadAllData,
  };
}

// ── CARGAR DATOS DESDE SUPABASE ───────────────────────────────────────────────────
async function loadStorage(key) {
  try {
    if (key === "pas_historial") {
      const { data } = await supabase.from("pas_historial").select("*");
      if (!data) return null;
      const result = {};
      data.forEach(row => {
        if (!result[row.pas_id]) result[row.pas_id] = [];
        result[row.pas_id].push({
          fecha: row.fecha,
          resultados: row.resultados,
          nota: row.nota,
          ts: row.ts,
        });
      });
      return result;
    }

    if (key === "pas_casos") {
      const { data } = await supabase.from("pas_casos").select("*");
      if (!data || data.length === 0) return null;
      const result = {};
      data.forEach(row => {
        if (!result[row.pas_id]) result[row.pas_id] = [];
        result[row.pas_id].push({
          id: row.caso_id,
          asegurado: row.asegurado,
          estado: row.estado,
          nota: row.nota,
          fecha_derivacion: row.fecha_derivacion || null,
          fecha_contacto_asegurado: row.fecha_contacto_asegurado || null,
          fecha_inicio_reclamo: row.fecha_inicio_reclamo || null,
          fecha_ultimo_movimiento: row.fecha_ultimo_movimiento || null,
          monto_ofrecimiento: row.monto_ofrecimiento,
          monto_cobro_asegurado: row.monto_cobro_asegurado,
          monto_cobro_yo: row.monto_cobro_yo,
          monto_comision_pas: row.monto_comision_pas,
          recordatorio: row.recordatorio || null,
          notas_log: row.notas_log || [],
          carpeta_path: row.carpeta_path || null,
          compania: row.compania || null,
          fecha_siniestro: row.fecha_siniestro || null,
          presupuesto: row.presupuesto || null,
          primer_ofrecimiento: row.primer_ofrecimiento || null,
          segundo_ofrecimiento: row.segundo_ofrecimiento || null,
          fecha_carga: row.fecha_carga || null,
          fecha_reclamo: row.fecha_reclamo || null,
          fecha_ultimo_reclamo: row.fecha_ultimo_reclamo || null,
          fecha_ofrecimiento: row.fecha_ofrecimiento || null,
          fecha_reconsideracion: row.fecha_reconsideracion || null,
          fecha_aceptacion: row.fecha_aceptacion || null,
          fecha_firma: row.fecha_firma || null,
          fecha_pago: row.fecha_pago || null,
          fecha_cobro: row.fecha_cobro || null,
          fecha_mediacion: row.fecha_mediacion || null,
          fecha_inicio_juicio: row.fecha_inicio_juicio || null,
          monto_acordado: row.monto_acordado || null,
          plazo_pago: row.plazo_pago || null,
          porcentaje_honorarios: row.porcentaje_honorarios || null,
          monto_honorarios: row.monto_honorarios || null,
          estado_honorarios: row.estado_honorarios || "NO_FACTURADO",
          fecha_factura: row.fecha_factura || null,
          fecha_cobro_honorarios: row.fecha_cobro_honorarios || null,
        });
      });
      return result;
    }

    if (key === "pas_derivadores") {
      const { data } = await supabase.from("pas_derivadores").select("*");
      if (!data) return null;
      const result = {};
      data.forEach(row => {
        result[row.pas_id] = row.activo;
      });
      return result;
    }

    if (key === "pas_recordatorios") {
      const { data } = await supabase.from("pas_recordatorios").select("*");
      if (!data) return null;
      const result = {};
      data.forEach(row => {
        result[row.pas_id] = row.fecha_recordatorio;
      });
      return result;
    }

    if (key === "pas_descartados") {
      const { data } = await supabase.from("pas_descartados").select("*");
      if (!data) return null;
      const result = {};
      data.forEach(row => {
        result[row.pas_id] = row.activo;
      });
      return result;
    }

    if (key === "pas_manuales") {
      const { data } = await supabase.from("pas_manuales").select("*");
      if (!data) return null;
      const result = {};
      data.forEach(row => {
        result[row.id] = {
          id: row.id,
          nombre: row.nombre,
          mail: row.mail,
          telefonos: row.telefonos || [],
          contacto: row.contacto || "",
          respuesta: row.respuesta || "",
          seguimiento: row.seguimiento || "",
        };
      });
      return result;
    }

    return null;
  } catch (err) {
    console.error(`[loadStorage] Error loading ${key}:`, err);
    return null;
  }
}