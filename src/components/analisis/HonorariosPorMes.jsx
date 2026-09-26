import { useMemo, useState } from "react";
import { fmtMoney, fmtDate } from "../../utils/formatters.js";
import { honorariosPorMes, netoYo } from "../../utils/metricas.js";
import GraficoBarraMensual from "../dashboard/GraficoBarraMensual.jsx";

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 };

// Honorarios netos cobrados por mes, últimos 12 (Análisis → Flujo de caja). Tocando un mes se ven sus casos.
export default function HonorariosPorMes({ allCasos, onAbrirCaso }) {
  const porMes = useMemo(() => honorariosPorMes(allCasos), [allCasos]);
  const [mes, setMes] = useState(null);
  const casosDelMes = useMemo(() => !mes ? [] : allCasos.filter(c =>
    c.monto_cobro_yo && String(c.fecha_cobro_honorarios || "").startsWith(mes)
  ), [allCasos, mes]);

  return (
    <section style={{ ...card, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Honorarios cobrados por mes</h2>
        {mes
          ? <button type="button" onClick={() => setMes(null)} style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}>Cerrar detalle</button>
          : <span style={{ fontSize: 12, color: "var(--muted)" }}>últimos 12 · neto de comisión</span>}
      </div>
      <GraficoBarraMensual datos={porMes} mesSeleccionado={mes} onClickMes={setMes} />
      {mes && casosDelMes.length > 0 && (
        <div style={{ marginTop: 8, borderTop: "1px solid var(--border)" }}>
          {casosDelMes.map(c => (
            <button key={c.id} type="button" onClick={() => onAbrirCaso(c)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", background: "none", border: "none", borderBottom: "1px solid var(--border)", textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit" }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.asegurado}</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--sub)" }}>{c.compania_aseguradora || "—"} · {fmtDate(c.fecha_cobro_honorarios)}</span>
              </span>
              <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>{fmtMoney(netoYo(c))}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
