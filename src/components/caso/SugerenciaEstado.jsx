import { fmtDate } from "../../utils/formatters.js";
import { estadoInfo } from "../../constants.js";

// Aparece después de cambiar el estado: la próxima acción sugerida (se acepta o se descarta)
// y, si pasó a "Con ofrecimiento" o "Esperando pago", el aviso al cliente por WhatsApp.
export default function SugerenciaEstado({ sugerencia, onUsarAccion, onCerrar, avisoWhatsApp }) {
  if (!sugerencia) return null;
  const { estado, accion, avisar } = sugerencia;
  const boton = primario => ({
    font: "inherit", fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap",
    border: `1px solid ${primario ? "var(--accent)" : "var(--border2)"}`, background: primario ? "var(--accent)" : "var(--card)", color: primario ? "var(--on-accent)" : "var(--text)",
  });
  return (
    <div role="status" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))", background: "color-mix(in srgb, var(--accent) 6%, var(--card))", fontSize: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <span style={{ color: "var(--sub)" }}>Pasó a <b style={{ color: "var(--text)" }}>{estadoInfo(estado).label}</b> · quedó anotado en la bitácora</span>
        <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
      </div>
      {accion && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ flex: "1 1 220px" }}>
            Próxima acción sugerida: <b>{accion.texto}</b> <span className="num" style={{ color: "var(--muted)" }}>· vence {fmtDate(accion.vence)}</span>
          </span>
          <span style={{ display: "inline-flex", gap: 6 }}>
            <button type="button" onClick={() => onUsarAccion(accion)} style={boton(true)}>Usar</button>
            {!avisar && <button type="button" onClick={onCerrar} style={boton(false)}>No</button>}
          </span>
        </div>
      )}
      {avisar && avisoWhatsApp && (
        <div>
          <div style={{ color: "var(--sub)", marginBottom: 6 }}>{estado === "con_ofrecimiento" ? "¿Le avisás al cliente del ofrecimiento?" : "¿Le avisás al cliente que hay acuerdo y la fecha de pago?"}</div>
          {avisoWhatsApp}
        </div>
      )}
    </div>
  );
}
