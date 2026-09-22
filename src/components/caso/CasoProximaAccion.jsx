import { fechaEnDias, diasHasta, describirPlazo, fmtDate } from "../../utils/formatters.js";
import PlazoChip from "../ui/PlazoChip.jsx";

const PLAZOS = [
  { dias: 0, label: "Hoy" },
  { dias: 1, label: "1 d" },
  { dias: 3, label: "3 d" },
  { dias: 7, label: "7 d" },
  { dias: 15, label: "15 d" },
  { dias: 30, label: "30 d" },
];

export default function CasoProximaAccion({ formData, onChange, Th }) {
  const vence = formData.proxima_accion_vence || "";
  const faltan = diasHasta(vence);
  const plazo = describirPlazo(vence);

  const chip = (activo) => ({
    padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${activo ? "var(--text)" : Th.border}`,
    background: activo ? "var(--text)" : Th.card,
    color: activo ? "var(--bg)" : Th.sub,
  });

  return (
    <div style={{
      background: Th.card,
      border: `1px solid ${Th.border}`,
      borderLeft: "4px solid var(--warn)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 16
    }}>
      <label htmlFor="proxima-accion" style={{ display: "block", fontSize: 14, fontWeight: 700, color: Th.text, marginBottom: 8 }}>
        Próxima acción <span style={{ fontWeight: 500, color: Th.muted, fontSize: 12 }}>· solo la ves vos</span>
      </label>
      <textarea
        id="proxima-accion"
        value={formData.proxima_accion || ""}
        onChange={(e) => onChange("proxima_accion", e.target.value)}
        placeholder="Ej: Llamar a la compañía para apurar el pago..."
        style={{ ...Th.input, width: "100%", minHeight: "60px", resize: "vertical" }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10 }}>
        <span style={{ fontSize: 12, color: Th.sub, marginRight: 2 }}>Plazo:</span>
        {PLAZOS.map(p => (
          <button key={p.dias} type="button" onClick={() => onChange("proxima_accion_vence", fechaEnDias(p.dias))}
            aria-pressed={faltan === p.dias} style={chip(faltan === p.dias)}>
            {p.label}
          </button>
        ))}
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: Th.sub }}>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            aria-label="Días de plazo"
            value={faltan !== null && faltan >= 0 && !PLAZOS.some(p => p.dias === faltan) ? faltan : ""}
            onChange={e => {
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n) && n >= 0) onChange("proxima_accion_vence", fechaEnDias(n));
            }}
            placeholder="otro"
            style={{ ...Th.input, width: 64, padding: "5px 8px", fontSize: 12 }}
          />
          días
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 8, minHeight: 24 }}>
        {plazo ? (
          <>
            <PlazoChip vence={vence} />
            <span style={{ fontSize: 12, color: Th.muted }}>el {fmtDate(vence)}</span>
            <button type="button" onClick={() => onChange("proxima_accion_vence", "")}
              style={{ background: "none", border: "none", color: Th.sub, fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
              Quitar plazo
            </button>
          </>
        ) : (
          <span style={{ fontSize: 12, color: Th.muted }}>Sin plazo. Con un plazo, el Dashboard te lo ordena por urgencia.</span>
        )}
      </div>
    </div>
  );
}
