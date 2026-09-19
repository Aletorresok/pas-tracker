import { fmtMoney, fmtDate } from "../../utils/formatters.js";
import { COLORES, THEME } from "../../utils/theme.js";

function Badge({ color, children }) {
  return (
    <div style={{ background: color + "18", border: `1px solid ${color}33`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}

export default function CobrosPendientesCard({ cobrosPendientes, darkMode }) {
  const T = THEME(darkMode);
  if (!cobrosPendientes.length) return null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px", marginBottom: 20, borderLeft: `3px solid ${COLORES.info}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Cobros pendientes</span>
        <Badge color={COLORES.info}>{cobrosPendientes.length}</Badge>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 12 }}>
        <span style={{ color: COLORES.success, fontWeight: 800, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>Mis honorarios: {fmtMoney(cobrosPendientes.reduce((s, c) => s + c.montoYo, 0))}</span>
        <span style={{ color: T.sub, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>Asegurados: {fmtMoney(cobrosPendientes.reduce((s, c) => s + c.montoAsegurado, 0))}</span>
      </div>
      <div style={{ maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
        {cobrosPendientes.map(c => {
          const vencido = c.diasRestantes !== null && c.diasRestantes < 0;
          const urgente = c.diasRestantes !== null && c.diasRestantes <= 3 && c.diasRestantes >= 0;
          const badgeColor = vencido ? COLORES.danger : urgente ? COLORES.warning : c.fechaEstimada ? COLORES.info : T.sub;
          const badgeText = c.fechaEstimada
            ? (vencido ? `Vencido (${Math.abs(c.diasRestantes)}d)` : c.diasRestantes === 0 ? "Hoy" : `${c.diasRestantes}d`)
            : "Sin fecha";
          return (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", marginBottom: 4, background: T.card2, borderRadius: 8, border: `1px solid ${T.border}` }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.asegurado}</div>
                <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
                  {c.compania || "—"}
                  {c.fechaEstimada ? ` · Pago est. ${fmtDate(c.fechaEstimada)}` : ""}
                </div>
              </div>
              <Badge color={badgeColor}>{badgeText}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}