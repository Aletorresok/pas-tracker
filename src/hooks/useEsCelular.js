import { useEffect, useState } from "react";

// true cuando la pantalla es angosta (mismo corte que el CSS: 900 px)
export function useEsCelular(ancho = 900) {
  const consulta = `(max-width: ${ancho}px)`;
  const [es, setEs] = useState(() => typeof window !== "undefined" && window.matchMedia(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const cambio = e => setEs(e.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, [consulta]);
  return es;
}
