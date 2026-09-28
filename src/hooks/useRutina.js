import { useCallback, useEffect, useState } from "react";
import { cargarRutina, tildar as tildarItem, clavePeriodo } from "../utils/rutina.js";
import { cargarObjetivos } from "../utils/objetivos.js";
import { fechaLocalISO } from "../utils/formatters.js";

const CAMBIO = "atg-rutina-cambio";
export const avisarCambioRutina = () => window.dispatchEvent(new Event(CAMBIO));

// Rutina + objetivos, compartidos por la pestaña Rutina y por Hoy. `falta` = no están las tablas (SQL 25).
export function useRutina() {
  const [datos, setDatos] = useState(null); // { items, registro, escuela, objetivos }
  const [falta, setFalta] = useState(false);

  const recargar = useCallback(async () => {
    const [r, o] = await Promise.all([cargarRutina(), cargarObjetivos()]);
    if (!r || !o) { setFalta(true); setDatos({ items: [], registro: [], escuela: [], objetivos: [] }); return; }
    setFalta(false);
    setDatos({ ...r, objetivos: o });
  }, []);

  useEffect(() => {
    recargar();
    window.addEventListener(CAMBIO, recargar);
    return () => window.removeEventListener(CAMBIO, recargar);
  }, [recargar]);

  const hecho = useCallback((item, hoy = fechaLocalISO()) =>
    !!datos?.registro.some(r => r.item_id === item.id && r.fecha === clavePeriodo(item.frecuencia, hoy)), [datos]);

  // Tilda al instante y, si falla, vuelve atrás
  const tildar = useCallback(async (item, valor) => {
    const fecha = clavePeriodo(item.frecuencia);
    const cambiar = on => setDatos(d => d && ({ ...d, registro: on
      ? [...d.registro.filter(r => !(r.item_id === item.id && r.fecha === fecha)), { item_id: item.id, fecha }]
      : d.registro.filter(r => !(r.item_id === item.id && r.fecha === fecha)) }));
    cambiar(valor);
    const ok = await tildarItem(item, valor);
    if (!ok) { cambiar(!valor); return false; }
    return true;
  }, []);

  return { datos, falta, recargar, hecho, tildar, setDatos };
}
