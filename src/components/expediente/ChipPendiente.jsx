import { alpha } from "../../utils/theme.js";
import { fechaLocalISO, diasHasta } from "../../utils/formatters.js";
import { describirPlazoHabil } from "../../utils/plazos.js";

const COLOR = { vencido: "var(--bad)", hoy: "var(--warn)", pronto: "var(--warn)", tranquilo: "var(--info)" };

// Estado de un escrito según su fecha objetivo (días corridos: es una meta tuya, no un plazo procesal)
function describirEscrito(objetivo) {
  const d = diasHasta(objetivo);
  if (d === null) return null;
  if (d < 0) return { texto: `Colgado ${-d} d`, nivel: "vencido" };
  if (d === 0) return { texto: "Hoy", nivel: "hoy" };
  if (d <= 3) return { texto: `En ${d} d`, nivel: "pronto" };
  return { texto: `En ${d} d`, nivel: "tranquilo" };
}

export function describirPendiente(p, cal, jurisdiccion) {
  if (p.estado === "cumplido") return null;
  return p.tipo === "escrito" ? describirEscrito(p.fecha_objetivo) : describirPlazoHabil(p.vence, fechaLocalISO(), cal, jurisdiccion);
}

// Chip de un plazo procesal ("3 días háb.", "Vencido hace 1 d háb.") o de un escrito ("Colgado 2 d")
export default function ChipPendiente({ pendiente, cal, jurisdiccion }) {
  const d = describirPendiente(pendiente, cal, jurisdiccion);
  if (!d) return null;
  const c = COLOR[d.nivel];
  return (
    <span className="num" style={{ display: "inline-block", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", padding: "2px 8px", borderRadius: 6, color: c, background: alpha(c, 14) }}>
      {d.texto}
    </span>
  );
}
