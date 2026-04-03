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
      // 1. Contactos
      const { data: contactosData } = await supabase
        .from("pas_contactos")
        .select("*");

      if (contactosData?.length) {
        const lista = contactosData.map(p => ({
          ...p,
          id: p.id,
          // telefonos puede venir como string "123,456" o ya como array
          telefonos: Array.isArray(p.telefonos)
            ? p.telefonos
            : (p.telefonos ? p.telefonos.split(",").map(t => t.trim()).filter(Boolean) : []),
        }));
        setPas(lista);
      }

      // 2. Historial → { [pas_id]: [ {fecha, resultados, nota, ts} ] }
      const { data: historialData } = await supabase
        .from("pas_historial")
        .select("*")
        .order("fecha", { ascending: true });

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

      // 3. Casos → { [pas_id]: [ {...caso} ] }
      const { data: casosData } = await supabase
        .from("pas_casos")
        .select("*");

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

      // 4. Derivadores → { [pas_id]: true }
      const { data: derivadoresData } = await supabase
        .from("pas_derivadores")
        .select("*");

      if (derivadoresData?.length) {
        const d = {};
        derivadoresData.filter(r => r.activo).forEach(r => {
          d[String(r.pas_id)] = true;
        });
        setDerivadores(d);
      }

      // 5. Recordatorios → { [pas_id]: "fecha" }
      const { data: recordatoriosData } = await supabase
        .from("pas_recordatorios")
        .select("*");

      if (recordatoriosData?.length) {
        const r = {};
        recordatoriosData.forEach(row => {
          if (row.fecha_recordatorio) {
            r[String(row.pas_id)] = row.fecha_recordatorio;
          }
        });
        setRecordatorios(r);
      }

      // 6. Descartados → { [pas_id]: true }
      const { data: descartadosData } = await supabase
        .from("pas_descartados")
        .select("*");

      if (descartadosData?.length) {
        const d = {};
        descartadosData.filter(r => r.activo).forEach(r => {
          d[String(r.pas_id)] = true;
        });
        setDescartados(d);
      }

      // 7. Manuales
      const { data: manualesData } = await supabase
        .from("pas_manuales")
        .select("*");

      if (manualesData?.length) {
        const lista = manualesData.map(p => ({
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