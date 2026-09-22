import { fmtMoney } from "../../utils/formatters.js";
import { COLORES, THEME, alpha } from "../../utils/theme.js";

export default function GraficoBarraMensual({ datos, darkMode, mesSeleccionado, onClickMes }) {
  const T = THEME(darkMode);
  const maxValor = Math.max(...datos.map(d => d.valor), 1);
  const mesActual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 120, padding: "0 4px" }}>
      {datos.map(d => {
        const pct = Math.max((d.valor / maxValor) * 100, 3);
        const isActual = d.key === mesActual;
        const isSelected = d.key === mesSeleccionado;
        return (
          <div key={d.key} onClick={() => onClickMes?.(isSelected ? null : d.key)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: d.valor > 0 ? "pointer" : "default" }}>
            {d.valor > 0 && <div style={{ fontSize: 11, color: isSelected ? T.text : isActual ? COLORES.info : T.muted, fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{(d.valor / 1000).toFixed(0)}k</div>}
            <div style={{
              width: "100%",
              height: `${pct}%`,
              background: d.valor > 0
                ? isSelected ? `linear-gradient(180deg, ${COLORES.brand}, ${alpha(COLORES.brand, 53)})` : isActual ? `linear-gradient(180deg, ${COLORES.info}, ${alpha(COLORES.info, 53)})` : `linear-gradient(180deg, ${alpha(COLORES.info, 40)}, ${alpha(COLORES.info, 20)})`
                : T.border,
              borderRadius: "4px 4px 0 0",
              transition: "all .3s ease",
              minHeight: 3,
            }} title={`${d.mes}: ${fmtMoney(d.valor)}`} />
            <div style={{ fontSize: 11, color: isSelected ? COLORES.brand : isActual ? COLORES.info : T.sub, textAlign: "center", fontWeight: isSelected || isActual ? 700 : 400 }}>{d.mes}</div>
          </div>
        );
      })}
    </div>
  );
}