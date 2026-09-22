import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase.js";

// Normaliza un contacto tal como viene de Supabase (teléfonos como array)
export const normalizarContacto = p => ({
  ...p,
  id: p.id,
  telefonos: Array.isArray(p.telefonos)
    ? p.telefonos
    : (p.telefonos ? p.telefonos.split(",").map(t => t.trim()).filter(Boolean) : []),
});

// Trae todas las filas de una consulta, de a 1000 (el máximo que devuelve Supabase por pedido)
export async function traerTodo(construirConsulta) {
  const CHUNK = 1000;
  let filas = [];
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await construirConsulta().range(from, from + CHUNK - 1);
    if (error) throw error;
    filas = filas.concat(data || []);
    if (!data || data.length < CHUNK) break;
  }
  return filas;
}

// Trae contactos por id, en tandas para no pasarse del largo máximo de URL
async function traerContactosPorId(ids) {
  const TANDA = 150;
  const tandas = [];
  for (let i = 0; i < ids.length; i += TANDA) tandas.push(ids.slice(i, i + TANDA));
  const resultados = await Promise.all(tandas.map(t => supabase.from("pas_contactos").select("*").in("id", t)));
  return resultados.flatMap(r => {
    if (r.error) console.error("[usePASData] contactos error:", r.error);
    return r.data || [];
  });
}

export function usePASData() {
  // `pas` guarda solo los contactos que la app usa siempre: los que tienen historial,
  // casos, recordatorio o son derivadores. El resto (miles, sin contactar) se pide
  // paginado desde la pestaña Contactos.
  const [pas, setPas] = useState([]);
  const [totalContactos, setTotalContactos] = useState(0);
  const [historial, setHistorial] = useState({});
  const [casos, setCasos] = useState({});
  const [derivadores, setDerivadores] = useState({});
  const [recordatorios, setRecordatorios] = useState({});
  const [descartados, setDescartados] = useState({});
  const [pasManuales, setPasManuales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Agrega un contacto a `pas` si todavía no está (ej.: al contactarlo desde la lista paginada)
  const agregarPas = useCallback((p) => {
    setPas(prev => prev.some(x => String(x.id) === String(p.id)) ? prev : [...prev, normalizarContacto(p)]);
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { count: total },
        { data: descartadosData },
        historialData,
        casosData,
        { data: derivadoresData },
        { data: recordatoriosData },
        { data: manualesData }
      ] = await Promise.all([
        supabase.from("pas_contactos").select("id", { count: "exact", head: true }),
        supabase.from("pas_descartados").select("*"),
        traerTodo(() => supabase.from("pas_historial").select("*").order("fecha", { ascending: true })),
        traerTodo(() => supabase.from("pas_casos").select("*").order("id")),
        supabase.from("pas_derivadores").select("*"),
        supabase.from("pas_recordatorios").select("*"),
        supabase.from("pas_manuales").select("*"),
      ]);
      setTotalContactos(total || 0);

      // Procesamiento de Descartados
      const diccDescartados = {};
      if (descartadosData?.length) {
        descartadosData.filter(r => r.activo).forEach(r => {
          diccDescartados[String(r.pas_id)] = true;
        });
        setDescartados(diccDescartados);
      }

      // Contactos que la app necesita tener siempre a mano
      const ids = new Set();
      historialData.forEach(r => ids.add(String(r.pas_id)));
      casosData.forEach(r => ids.add(String(r.pas_id)));
      (derivadoresData || []).forEach(r => r.activo && ids.add(String(r.pas_id)));
      (recordatoriosData || []).forEach(r => ids.add(String(r.pas_id)));
      const contactos = await traerContactosPorId([...ids].filter(id => !diccDescartados[id]));
      setPas(contactos.map(normalizarContacto));

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
    pas, setPas, agregarPas,
    totalContactos,
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