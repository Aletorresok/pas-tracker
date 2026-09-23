import { ESTADOS_CASO } from "../../constants.js";

const CORTO = {
  doc_pendiente: "Doc. pend.", iniciado: "Iniciado", reclamado: "Reclamado", con_ofrecimiento: "Ofrecim.",
  en_mediacion: "Mediación", en_juicio: "Juicio", esperando_pago: "Esp. pago", cobrado: "Cobrado",
};
const PASOS = ESTADOS_CASO.filter(e => e.key !== "desistido");

// Línea de etapas del caso: clic en una etapa cambia el estado. "Desistido" va aparte.
export default function EtapasCaso({ estado, onChange }) {
  const idx = PASOS.findIndex(p => p.key === estado);
  const desistido = estado === "desistido";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <ol role="radiogroup" aria-label="Estado del caso" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flex: 1, overflowX: "auto", minWidth: 0 }}>
        {PASOS.map((p, i) => {
          const hecho = !desistido && i < idx;
          const actual = i === idx;
          const color = actual ? p.color : hecho ? "var(--accent)" : "var(--border2)";
          return (
            <li key={p.key} style={{ flex: "1 0 64px", position: "relative" }}>
              {i > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 7, right: "50%", width: "100%", height: 2, background: hecho || actual ? "var(--accent)" : "var(--border)" }} />}
              <button type="button" role="radio" aria-checked={actual} onClick={() => onChange(p.key)}
                style={{ position: "relative", width: "100%", background: "none", border: "none", padding: "0 2px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, font: "inherit" }}>
                <span style={{
                  width: 16, height: 16, borderRadius: "50%", boxSizing: "border-box",
                  background: hecho ? "var(--accent)" : "var(--card)",
                  border: `2px solid ${color}`,
                  boxShadow: actual ? `0 0 0 4px color-mix(in srgb, ${p.color} 22%, transparent)` : "none",
                }} />
                <span style={{ fontSize: 11, lineHeight: 1.2, color: actual ? "var(--text)" : "var(--muted)", fontWeight: actual ? 700 : 500, whiteSpace: "nowrap" }}>{CORTO[p.key]}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={() => onChange(desistido ? "iniciado" : "desistido")} aria-pressed={desistido}
        style={{ flex: "none", fontSize: 12, padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontWeight: 600,
          border: `1px solid ${desistido ? "var(--muted)" : "var(--border)"}`, background: desistido ? "var(--card2)" : "var(--card)", color: desistido ? "var(--text)" : "var(--muted)" }}>
        {desistido ? "Desistido · reactivar" : "Desistir"}
      </button>
    </div>
  );
}
