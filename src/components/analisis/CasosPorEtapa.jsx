import { casosPorTramo } from "../../utils/metricas.js";

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 };
// Tonos del acento en orden de avance: de suave (arranque) a pleno (cobrado)
const TONOS = [45, 60, 74, 87, 100];
const tono = i => `color-mix(in srgb, var(--accent) ${TONOS[i]}%, var(--card))`;

// Barra con los casos agrupados por etapa (Análisis → Resumen). "Ver casos" lleva a la pestaña Casos.
export default function CasosPorEtapa({ allCasos, onVerCasos }) {
  const { tramos, desistidos } = casosPorTramo(allCasos);
  const total = tramos.reduce((s, t) => s + t.count, 0);

  return (
    <section style={{ ...card, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Casos por etapa</h2>
        {onVerCasos && <button type="button" onClick={onVerCasos} style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}>Ver casos →</button>}
      </div>
      {total > 0 && (
        <div style={{ display: "flex", height: 12, borderRadius: 4, overflow: "hidden", gap: 2, marginBottom: 12 }} aria-hidden="true">
          {tramos.map((t, i) => t.count > 0 && <div key={t.key} title={`${t.label}: ${t.count}`} style={{ flex: t.count, background: tono(i) }} />)}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "6px 16px" }}>
        {tramos.map((t, i) => (
          <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, flex: "none", background: tono(i) }} />
            <span style={{ color: "var(--sub)", flex: 1 }}>{t.label}</span>
            <b className="num">{t.count}</b>
          </div>
        ))}
        {desistidos > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, flex: "none" }} />
            <span style={{ color: "var(--muted)", flex: 1 }}>Desistidos</span>
            <b className="num" style={{ color: "var(--muted)" }}>{desistidos}</b>
          </div>
        )}
      </div>
    </section>
  );
}
