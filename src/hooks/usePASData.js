import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase.js";

export function usePASData() {
  const [pas, setPas] = useState([]);
  const [historial, setHistorial] = useState({});
  const [casos, setCasos] = useState({});
  const [derivadores, setDerivadores] = useState({});
  const [recordatorios, setRecordatorios] = useState({});
  const [descartados, setDescartados] = useState({});
  const [pasManuales, setPasManuales] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Paginación de contactos (mantiene la lógica segura por chunks de 1000)
      let contactosTodos = [];
      let from = 0;
      const CHUNK = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("pas_contactos")
          .select("*")
          .range(from, from + CHUNK - 1);
        if (error) { console.error("[usePASData] contactos error:", error); break; }
        if (!data?.length) break;
        contactosTodos = [...contactosTodos, ...data];
        if (data.length < CHUNK) break;
        from += CHUNK;
      }

      // 2. Consultas secundarias ejecutadas en paralelo con Promise.all
      const [
        { data: descartadosData },
        { data: historialData },
        { data: casosData },
        { data: derivadoresData },
        { data: recordatoriosData },
        { data: manualesData }
      ] = await Promise.all([
        supabase.from("pas_descartados").select("*"),
        supabase.from("pas_historial").select("*").order("fecha", { ascending: true }),
        supabase.from("pas_casos").select("*"),
        supabase.from("pas_derivadores").select("*"),
        supabase.from("pas_recordatorios").select("*"),
        supabase.from("pas_manuales").select("*"),
      ]);

      // Procesamiento de Descartados
      const diccDescartados = {};
      if (descartadosData?.length) {
        descartadosData.filter(r => r.activo).forEach(r => {
          diccDescartados[String(r.pas_id)] = true;
        });
        setDescartados(diccDescartados);
      }

      // Procesamiento de Contactos (PAS)
      if (contactosTodos.length) {
        const lista = contactosTodos
          .filter(p => !diccDescartados[String(p.id)])
          .map(p => ({
            ...p,
            id: p.id,
            telefonos: Array.isArray(p.telefonos)
              ? p.telefonos
              : (p.telefonos ? p.telefonos.split(",").map(t => t.trim()).filter(Boolean) : []),
          }));
        setPas(lista);
      }

      // Procesamiento de Historial
      if (historialData?.length) {
        const h = {};
        historialData.forEach(row => {
          const pid = String(row.pas_id);
          if (!h[pid]) h[pid] = [];
          h[pid].push({
            fecha: row.fecha,
            resultados: Array.isArray(row.resultados) ? row.resultados : [],
            nota: row.nota || "",
            ts: row.ts || Date.now(),
          });
        });
        setHistorial(h);
      }

      // Procesamiento de Casos
      if (casosData?.length) {
        const c = {};
        casosData.forEach(row => {
          const pid = String(row.pas_id);
          if (!c[pid]) c[pid] = [];
          const { pas_id, ...resto } = row;
          c[pid].push(resto);
        });
        setCasos(c);
      }

      // Procesamiento de Derivadores
      if (derivadoresData?.length) {
        const d = {};
        derivadoresData.filter(r => r.activo).forEach(r => {
          d[String(r.pas_id)] = true;
        });
        setDerivadores(d);
      }

      // Procesamiento de Recordatorios
      if (recordatoriosData?.length) {
        const r = {};
        recordatoriosData.forEach(row => {
          if (row.fecha_recordatorio) {
            r[String(row.pas_id)] = row.fecha_recordatorio;
          }
        });
        setRecordatorios(r);
      }

      // Procesamiento de Manuales
      if (manualesData?.length) {
        const lista = manualesData
          .filter(p => !diccDescartados[String(p.id)])
          .map(p => ({
            ...p,
            telefonos: Array.isArray(p.telefonos)
              ? p.telefonos
              : (p.telefonos ? p.telefonos.split(",").map(t => t.trim()).filter(Boolean) : []),
          }));
        setPasManuales(lista);
      }

    } catch (err) {
      console.error("[usePASData] Error cargando datos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    pas, setPas,
    historial, setHistorial,
    casos, setCasos,
    derivadores, setDerivadores,
    recordatorios, setRecordatorios,
    descartados, setDescartados,
    pasManuales, setPasManuales,
    loading,
    reloadAllData: loadAllData,
  };
}