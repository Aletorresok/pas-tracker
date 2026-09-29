import { useState } from "react";
import { ESTADOS_CASO } from "../../constants.js";

const CORTO = {
  doc_pendiente: "Doc. pend.", iniciado: "Iniciado", reclamado: "Reclamado", con_ofrecimiento: "Ofrecim.",
  en_mediacion: "Mediación", en_juicio: "Juicio", esperando_pago: "Esp. pago", cobrado: "Cobrado",
};
const PASOS = ESTADOS_CASO.filter(e => e.key !== "desistido");

// Mediación y juicio son la minoría: solo se muestran si el caso está ahí (o si las pedís)
const OPCIONALES = { en_mediacion: ["en_mediacion", "en_juicio"], en_juicio: ["en_juicio"] };

// Línea de etapas del caso: clic en una etapa cambia el estado. "Desistido" va aparte.
export default function EtapasCaso({ estado, onChange }) {
  const [verTodas, setVerTodas] = useState(false);
  const pasos = PASOS.filter(p => !OPCIONALES[p.key] || verTodas || OPCIONALES[p.key].includes(estado));
  const ocultos = PASOS.length - pasos.length;
  const idx = pasos.findIndex(p => p.key === estado);
  const desistido = estado === "desistido";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px 12px", flexWrap: "wrap", justifyContent: "flex-end" }}>
      <ol role="radiogroup" aria-label="Estado del caso" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flex: "1 1 340px", overflowX: "auto", minWidth: 0 }}>
        {pasos.map((p, i) => {
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
      {ocultos > 0 && !desistido && (
        <button type="button" onClick={() => setVerTodas(true)} title="Mostrar las etapas de mediación y juicio"
          style={{ flex: "none", fontSize: 12, padding: "4px 10px", borderRadius: "var(--r-xl)", cursor: "pointer", fontWeight: 600, border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted)", whiteSpace: "nowrap" }}>
          + Mediación o juicio
        </button>
      )}
      <button type="button" onClick={() => onChange(desistido ? "iniciado" : "desistido")} aria-pressed={desistido}
        style={{ flex: "none", fontSize: 12, padding: "4px 10px", borderRadius: "var(--r-xl)", cursor: "pointer", fontWeight: 600,
          border: `1px solid ${desistido ? "var(--muted)" : "var(--border)"}`, background: desistido ? "var(--card2)" : "var(--card)", color: desistido ? "var(--text)" : "var(--muted)" }}>
        {desistido ? "Desistido · reactivar" : "Desistir"}
      </button>
    </div>
  );
}
