import { fmtMoney, fmtDate } from "../../utils/formatters.js";
import { COLORES, THEME } from "../../utils/theme.js";
import DashboardBadge from "./DashboardBadge.jsx"; // <-- Importamos el componente compartido

export default function CobrosPendientesCard({ cobrosPendientes, darkMode }) {
  const T = THEME(darkMode);
  if (!cobrosPendientes.length) return null;

  // Calculamos el total de tus honorarios NETOS (restando la comisión del PAS) para el encabezado
  const totalNetoYo = cobrosPendientes.reduce((s, c) => s + ((c.montoYo || 0) - (Number(c.monto_comision_pas) || 0)), 0);
  const totalAsegurados = cobrosPendientes.reduce((s, c) => s + c.montoAsegurado, 0);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px", marginBottom: 20, borderLeft: `3px solid ${COLORES.info}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Cobros pendientes</span>
        <DashboardBadge color={COLORES.info}>{cobrosPendientes.length}</DashboardBadge>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 12 }}>
        <span style={{ color: COLORES.success, fontWeight: 800, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>Mi Neto: {fmtMoney(totalNetoYo)}</span>
        <span style={{ color: T.sub, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>Asegurados: {fmtMoney(totalAsegurados)}</span>
      </div>
      <div style={{ maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
        {cobrosPendientes.map(c => {
          const vencido = c.diasRestantes !== null && c.diasRestantes < 0;
          const urgente = c.diasRestantes !== null && c.diasRestantes <= 3 && c.diasRestantes >= 0;
          const badgeColor = vencido ? COLORES.danger : urgente ? COLORES.warning : c.fechaEstimada ? COLORES.info : T.sub;
          const badgeText = c.fechaEstimada
            ? (vencido ? `Vencido (${Math.abs(c.diasRestantes)}d)` : c.diasRestantes === 0 ? "Hoy" : `${c.diasRestantes}d`)
            : "Sin fecha";

          // Cálculo de las 3 partes para este caso en particular
          const comisionPAS = Number(c.monto_comision_pas) || 0;
          const miGananciaNeta = (c.montoYo || 0) - comisionPAS;
          const cobraAsegurado = c.montoAsegurado || 0;

          return (
            <div key={c.id} style={{ padding: "10px 12px", marginBottom: 8, background: T.card2, borderRadius: 8, border: `1px solid ${T.border}` }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.asegurado}</div>
                  <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
                    {c.compania_aseguradora || "—"}
                    {c.fechaEstimada ? ` · Pago est. ${fmtDate(c.fechaEstimada)}` : ""}
                  </div>
                </div>
                <DashboardBadge color={badgeColor}>{badgeText}</DashboardBadge>
              </div>

              {/* Las 3 columnas de montos */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, borderTop: `1px solid ${T.border}`, paddingTop: 8, marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Asegurado</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORES.success }}>{fmtMoney(cobraAsegurado)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Mi Neto</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORES.info }}>{fmtMoney(miGananciaNeta)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Comisión PAS</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORES.warning }}>{fmtMoney(comisionPAS)}</div>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}