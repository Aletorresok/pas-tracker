import { COLORES, THEME, alpha } from "../../utils/theme.js";
import PlazoChip from "../ui/PlazoChip.jsx";

const Iconos = {
  pointer: (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="m13 13 6 6"></path></svg>
  ),
};

function Badge({ color, children }) {
  return (
    <div style={{ background: alpha(color, 9), border: `1px solid ${alpha(color, 20)}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}

export default function MisPendientesCard({ pendientes, darkMode }) {
  const T = THEME(darkMode);
  if (!pendientes.length) return null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px", marginBottom: 20, borderLeft: `3px solid ${COLORES.warning}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Mis pendientes · por vencimiento</span>
        <Badge color={COLORES.warning}>{pendientes.length}</Badge>
      </div>
      <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
        {pendientes.map(c => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "118px minmax(0, 1fr)", gap: 12, alignItems: "center", padding: "10px 12px", marginBottom: 6, background: T.card2, borderRadius: 8, border: `1px solid ${T.border}` }}>
            <div>{c.proxima_accion_vence ? <PlazoChip vence={c.proxima_accion_vence} /> : <span style={{ fontSize: 11, color: T.muted }}>Sin plazo</span>}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.asegurado} <span style={{ fontWeight: 400, color: T.sub, fontSize: 12 }}>· {c.compania_aseguradora || "Sin compañía"}</span>
              </div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{c.proxima_accion}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}