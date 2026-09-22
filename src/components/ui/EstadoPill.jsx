import { estadoInfo } from "../../constants.js";
import { alpha } from "../../utils/theme.js";

// Etiqueta de estado del caso: punto de color + texto, fondo suave del mismo color.
export default function EstadoPill({ estado, label, size = "md" }) {
  const e = estadoInfo(estado);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      fontSize: size === "sm" ? 11 : 12, fontWeight: 600, lineHeight: 1.6,
      padding: size === "sm" ? "1px 8px 1px 6px" : "2px 10px 2px 8px", borderRadius: 999,
      color: e.color, background: alpha(e.color, 14),
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: e.color }} />
      {label || e.label}
    </span>
  );
}
