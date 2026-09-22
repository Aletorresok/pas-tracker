import { fmtMoney } from "../../utils/formatters.js";
import { COLORES, THEME, alpha } from "../../utils/theme.js";

export default function RankingPASCard({ ranking, darkMode }) {
  const T = THEME(darkMode);
  if (!ranking.length) return null;
  const maxCobrado = Math.max(...ranking.map(p => p.cobrado), 1);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px", marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 14 }}>Ranking PAS</div>
      {ranking.map((p, i) => (
        <div key={p.nombre} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < ranking.length - 1 ? `1px solid ${T.border}` : "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? "var(--accent-soft, color-mix(in srgb, var(--accent) 14%, transparent))" : T.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)", color: i === 0 ? "var(--accent-ink)" : T.sub }}>{i + 1}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "55%" }}>{p.nombre}</div>
              <div style={{ fontSize: 13, color: p.cobrado > 0 ? COLORES.success : T.sub, fontWeight: 700, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{p.cobrado > 0 ? fmtMoney(p.cobrado) : "en gestión"}</div>
            </div>
            <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max((p.cobrado / maxCobrado) * 100, p.total > 0 ? 4 : 0)}%`, background: i === 0 ? COLORES.brand : "var(--border2)", borderRadius: 2, transition: "width .5s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: T.text, marginTop: 4 }}>{p.total} caso{p.total !== 1 ? "s" : ""}{p.activos > 0 ? ` · ${p.activos} activo${p.activos !== 1 ? "s" : ""}` : ""}</div>
          </div>
        </div>
      ))}
    </div>
  );
}