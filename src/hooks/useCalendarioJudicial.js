import { useEffect, useState } from "react";
import { cargarCalendarioJudicial } from "../utils/calendarioJudicial.js";
import { CALENDARIO_VACIO } from "../utils/plazos.js";

// Calendario judicial (feriados + días inhábiles). Mientras carga, solo cuenta fines de semana.
export function useCalendarioJudicial() {
  const [cal, setCal] = useState(CALENDARIO_VACIO);
  useEffect(() => {
    let vivo = true;
    cargarCalendarioJudicial().then(c => { if (vivo) setCal(c); });
    return () => { vivo = false; };
  }, []);
  return cal;
}
