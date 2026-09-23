import { fmtMoney } from "../../utils/formatters.js";
import { netoYo } from "../../utils/metricas.js";
import PlazoChip from "../ui/PlazoChip.jsx";


// Versión compacta de "Cobros pendientes" para la pantalla Hoy. El detalle completo está en Análisis.
export default function CobrosResumen({ cobros, onAbrir, onVerTodos }) {
  if (!cobros.length) return null;
  const totalNeto = cobros.reduce((s, c) => s + netoYo(c), 0);
  return (
    <section style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Cobros pendientes</h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{cobros.length} · mi neto <b className="num" style={{ color: "var(--text)" }}>{fmtMoney(totalNeto)}</b></span>
      </div>
      <div className="lista-scroll" style={{ maxHeight: 300, overflowY: "auto", marginRight: -8, paddingRight: 8 }}>
      {cobros.map((c, i) => (
        <button key={c.id} type="button" onClick={() => onAbrir(c)}
          style={{
            width: "100%", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "2px 10px", alignItems: "center",
            padding: "8px 0", background: "none", border: "none", borderTop: i ? "1px solid var(--border)" : "none",
            textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit",
          }}>
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.asegurado}</span>
          <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>{fmtMoney(netoYo(c))}</span>
          <span style={{ fontSize: 12, color: "var(--sub)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.compania_aseguradora || "Sin compañía"}</span>
          <span>{c.fechaEstimada ? <PlazoChip vence={c.fechaEstimada} /> : <span style={{ fontSize: 11, color: "var(--muted)" }}>Sin fecha</span>}</span>
        </button>
      ))}
      </div>
      <button type="button" onClick={onVerTodos}
        style={{ marginTop: 4, background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: "4px 0" }}>
        Ver detalle en Análisis →
      </button>
    </section>
  );
}
