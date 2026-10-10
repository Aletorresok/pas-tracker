import { describirPlazo } from "../../utils/formatters.js";
import { alpha } from "../../utils/theme.js";

const COLOR = { vencido: "var(--bad)", hoy: "var(--warn)", pronto: "var(--warn)", tranquilo: "var(--info)" };

// Chip de vencimiento: "Vencido hace 2 d", "Vence hoy", "Vence en 5 d"
export default function PlazoChip({ vence }) {
  const p = describirPlazo(vence);
  if (!p) return null;
  const c = COLOR[p.nivel];
  return (
    <span className="num" style={{
      display: "inline-block", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
      // Vencido va lleno (texto del color del fondo) para distinguirse de "Vence hoy / pronto" de un vistazo
      padding: "2px 8px", borderRadius: "var(--r-xs)", ...(p.nivel === "vencido" ? { color: "var(--bg)", background: c } : { color: c, background: alpha(c, 14) }),
    }}>
      {p.texto}
    </span>
  );
}
