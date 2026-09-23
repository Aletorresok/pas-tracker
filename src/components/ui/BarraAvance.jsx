import { estadoInfo } from "../../constants.js";
import EstadoPill from "./EstadoPill.jsx";

// 5 pasos simples para portales: Documentación → Reclamo → Negociación → Pago → Cobrado
export const PASOS_SIMPLES = ["Documentación", "Reclamo", "Negociación", "Pago", "Cobrado"];
const pasoSimple = etapa => (etapa <= 0 ? 0 : etapa <= 2 ? 1 : etapa === 3 ? 2 : etapa <= 5 ? 3 : etapa === 6 ? 4 : 5);

// Barra de avance del caso para portales. Un caso desistido no muestra avance.
export default function BarraAvance({ estado, grosor = 6, conPill = true, conEtiquetas = false }) {
  const e = estadoInfo(estado);
  const desistido = estado === "desistido";
  const paso = desistido ? 0 : pasoSimple(e.etapa);
  return (
    <div>
      <div style={{ display: "flex", gap: 3 }} role="img" aria-label={desistido ? "Caso desistido" : `Paso ${paso} de 5: ${PASOS_SIMPLES[paso - 1] || ""}`}>
        {PASOS_SIMPLES.map((p, i) => (
          <div key={p} style={{ flex: 1, height: grosor, borderRadius: 3, background: i < paso ? (paso === 5 ? "var(--ok)" : "var(--accent)") : "var(--border)" }} />
        ))}
      </div>
      {conEtiquetas && (
        <div style={{ display: "flex", gap: 3, marginTop: 4 }} aria-hidden="true">
          {PASOS_SIMPLES.map((p, i) => (
            <span key={p} style={{ flex: 1, fontSize: 10.5, textAlign: "center", color: i === paso - 1 ? "var(--text)" : "var(--muted)", fontWeight: i === paso - 1 ? 700 : 400 }}>{p}</span>
          ))}
        </div>
      )}
      {conPill && <div style={{ marginTop: 8 }}><EstadoPill estado={estado} size="sm" /></div>}
    </div>
  );
}
