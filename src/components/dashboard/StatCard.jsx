import { COLORES, THEME } from "../../utils/theme.js";

export default function StatCard({ label, value, color, sub, dark, iconComponent, onClick, isHero = false }) {
  const Wrapper = onClick ? "button" : "div";
  const T = THEME(dark);

  if (isHero) {
    return (
      <Wrapper onClick={onClick} style={{
        all: onClick ? "unset" : undefined,
        display: "block",
        cursor: onClick ? "pointer" : "default",
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 10,
        transition: "all .2s",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 13, color: T.sub, marginBottom: 8, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: COLORES.brand, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
            {sub && <div style={{ fontSize: 13, color: T.sub, marginTop: 8 }}>{sub}</div>}
          </div>
          {iconComponent && <div style={{ opacity: 0.8 }}>{iconComponent}</div>}
        </div>
        {onClick && <div style={{ fontSize: 12, color: COLORES.brand, marginTop: 10 }}>Ver detalle →</div>}
      </Wrapper>
    );
  }

  return (
    <Wrapper onClick={onClick} style={{
      all: onClick ? "unset" : undefined,
      display: "block",
      cursor: onClick ? "pointer" : "default",
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: "14px 16px",
      transition: "all .2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: T.sub, marginBottom: 6, fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: color || T.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: T.sub, marginTop: 5 }}>{sub}</div>}
        </div>
        {iconComponent && <div style={{ opacity: 0.6 }}>{iconComponent}</div>}
      </div>
      {onClick && <div style={{ fontSize: 11, color: T.sub, marginTop: 6 }}>Ver detalle →</div>}
    </Wrapper>
  );
}