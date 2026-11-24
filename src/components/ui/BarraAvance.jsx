import { estadoInfo } from "../../constants.js";
import EstadoPill from "./EstadoPill.jsx";
import Icono from "./Icono.jsx";

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
          // El paso actual va lleno; los ya hechos, un poco más suaves, para que se lea dónde está el caso
          <div key={p} style={{ flex: 1, height: grosor, borderRadius: "var(--r-xs)",
            background: i < paso ? (paso === 5 ? "var(--ok)" : i === paso - 1 ? "var(--accent)" : "color-mix(in srgb, var(--accent) 55%, var(--border))") : "var(--border)" }} />
        ))}
      </div>
      {conEtiquetas && (
        <div style={{ display: "flex", gap: 3, marginTop: 4 }} aria-hidden="true">
          {/* Pasos hechos con check; el actual, en el color de acento y en negrita */}
          {PASOS_SIMPLES.map((p, i) => {
            const hecho = i < paso - 1 || paso === 5;
            const actual = i === paso - 1 && paso < 5;
            return (
              <span key={p} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 2, fontSize: 10.5, textAlign: "center",
                color: actual ? "var(--accent-ink)" : hecho ? "var(--sub)" : "var(--muted)", fontWeight: actual ? 700 : 400 }}>
                {hecho && <Icono nombre="check" size={10} stroke={2.6} style={{ color: paso === 5 ? "var(--ok)" : "var(--accent)" }} />}{p}
              </span>
            );
          })}
        </div>
      )}
      {conPill && <div style={{ marginTop: 8 }}><EstadoPill estado={estado} size="sm" /></div>}
    </div>
  );
}
