import { useEffect, useState } from "react";
import ListaPendientes from "../expediente/ListaPendientes.jsx";
import { cargarPlazosDeCaso } from "../../utils/expedientes.js";
import { useCalendarioJudicial } from "../../hooks/useCalendarioJudicial.js";

// Plazos de un caso PAS (tabla plazos con caso_id): sobre todo los de la compañía (pronunciarse, pagar,
// contestar una intimación). Salen en Hoy y en el aviso diario igual que los de los expedientes.
export default function PlazosCaso({ caso, setToast }) {
  const cal = useCalendarioJudicial();
  const [plazos, setPlazos] = useState(undefined); // undefined = cargando, null = sin tabla plazos

  useEffect(() => { cargarPlazosDeCaso(caso.id).then(setPlazos); }, [caso.id]);

  if (plazos === undefined || plazos === null) return null;
  const alCambiar = p => setPlazos(lista => p._borrado ? lista.filter(x => x.id !== p.id) : lista.some(x => x.id === p.id) ? lista.map(x => (x.id === p.id ? p : x)) : [...lista, p]);

  return (
    <div style={{ marginBottom: 16 }}>
      <ListaPendientes tipo="plazo" caso={caso} plazos={plazos} cal={cal} onCambio={alCambiar} setToast={setToast} />
    </div>
  );
}
