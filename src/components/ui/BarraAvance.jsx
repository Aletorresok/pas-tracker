import { estadoInfo } from "../../constants.js";
import EstadoPill from "./EstadoPill.jsx";

const ETAPAS = 7; // doc → iniciado → reclamado → ofrecimiento → mediación/juicio → esperando pago → cobrado

// Barra de avance del caso para portales. Un caso desistido no muestra avance.
export default function BarraAvance({ estado, grosor = 5 }) {
  const e = estadoInfo(estado);
  const desistido = estado === "desistido";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 3, marginBottom: 8 }} aria-hidden="true">
        {Array.from({ length: ETAPAS }, (_, i) => (
          <div key={i} style={{
            flex: 1, height: grosor, borderRadius: 3,
            background: !desistido && i < e.etapa ? e.color : "var(--border)",
          }} />
        ))}
      </div>
      <EstadoPill estado={estado} />
    </div>
  );
}
