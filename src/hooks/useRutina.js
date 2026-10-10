import { useCallback, useEffect, useRef, useState } from "react";
import { cargarRutina, tildar as tildarItem, clavePeriodo } from "../utils/rutina.js";
import { cargarObjetivos } from "../utils/objetivos.js";
import { fechaLocalISO } from "../utils/formatters.js";

const CAMBIO = "atg-rutina-cambio";
// Avisa a las otras vistas abiertas (Hoy, Rutina, Análisis) que recarguen; la que avisa (`origen`) no se recarga.
const avisarCambioRutina = origen => window.dispatchEvent(new CustomEvent(CAMBIO, { detail: origen }));

// Rutina + objetivos, compartidos por la pestaña Rutina y por Hoy. `falta` = no están las tablas (SQL 25).
export function useRutina() {
  const [datos, setDatos] = useState(null); // { items, registro, escuela, objetivos }
  const [falta, setFalta] = useState(false);
  const yo = useRef({}).current;

  const recargar = useCallback(async () => {
    const [r, o] = await Promise.all([cargarRutina(), cargarObjetivos()]);
    if (!r || !o) { setFalta(true); setDatos({ items: [], registro: [], escuela: [], objetivos: [] }); return; }
    setFalta(false);
    setDatos({ ...r, objetivos: o });
  }, []);

  useEffect(() => {
    recargar();
    const alCambiar = e => e.detail !== yo && recargar();
    window.addEventListener(CAMBIO, alCambiar);
    return () => window.removeEventListener(CAMBIO, alCambiar);
  }, [recargar, yo]);

  // `hoy` solo si es una fecha: con items.filter(hecho) / every(hecho) llega la posición en la lista
  const hecho = useCallback((item, hoy) => {
    const fecha = clavePeriodo(item.frecuencia, typeof hoy === "string" ? hoy : fechaLocalISO());
    return !!datos?.registro.some(r => r.item_id === item.id && r.fecha === fecha);
  }, [datos]);

  // Tilda al instante y, si falla, vuelve atrás
  const tildar = useCallback(async (item, valor) => {
    const fecha = clavePeriodo(item.frecuencia);
    const cambiar = on => setDatos(d => d && ({ ...d, registro: on
      ? [...d.registro.filter(r => !(r.item_id === item.id && r.fecha === fecha)), { item_id: item.id, fecha }]
      : d.registro.filter(r => !(r.item_id === item.id && r.fecha === fecha)) }));
    cambiar(valor);
    const ok = await tildarItem(item, valor);
    if (!ok) { cambiar(!valor); return false; }
    avisarCambioRutina(yo);
    return true;
  }, [yo]);

  // Después de editar items, escuela u objetivos: recarga esta vista y avisa a las demás
  const cambio = useCallback(() => { recargar(); avisarCambioRutina(yo); }, [recargar, yo]);

  return { datos, falta, recargar, cambio, hecho, tildar, setDatos };
}
