import { useMemo } from "react";
import { fmtMoney } from "../utils/formatters.js";
import { aplanarCasos, kpis as calcularKpis, cobrosPendientes } from "../utils/metricas.js";
import { ESTADOS_CASO } from "../constants.js";
import GraficoCompanias from "./GraficoCompanias.jsx";
import CobrosPendientesCard from "./dashboard/CobrosPendientesCard.jsx";
import RankingPASCard from "./dashboard/RankingPASCard.jsx";

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 };

// Métricas de fondo: lo que no hace falta mirar todos los días
export default function TabAnalisis({ pas, casos, darkMode, pasManuales = [] }) {
  const todosLosPas = useMemo(() => [...pas, ...pasManuales], [pas, pasManuales]);
  const allCasos = useMemo(() => aplanarCasos(casos, todosLosPas), [casos, todosLosPas]);
  const k = useMemo(() => calcularKpis(allCasos), [allCasos]);
  const cobros = useMemo(() => cobrosPendientes(allCasos), [allCasos]);

  const ranking = useMemo(() => Object.entries(casos)
    .map(([pasId, lista]) => ({
      nombre: todosLosPas.find(p => String(p.id) === String(pasId))?.nombre || "PAS desconocido",
      cobrado: lista.reduce((s, c) => s + (Number(c.monto_cobro_yo) || 0), 0),
      total: lista.length,
      activos: lista.filter(c => !["cobrado", "desistido"].includes(c.estado)).length,
    }))
    .filter(p => p.total > 0)
    .sort((a, b) => b.cobrado - a.cobrado || b.total - a.total)
    .slice(0, 8), [casos, todosLosPas]);

  const porEstado = ESTADOS_CASO.map(e => ({ ...e, count: allCasos.filter(c => c.estado === e.key).length })).filter(e => e.count > 0);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Análisis</h1>

      <section className="kpis" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
        {[
          { l: "Honorarios cobrados · histórico", v: fmtMoney(k.totalHistorico) },
          { l: "Comisiones pagadas a PAS", v: fmtMoney(k.comisionesPAS) },
          { l: "Casos totales", v: k.total },
        ].map(x => (
          <div key={x.l} style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: 12, color: "var(--sub)" }}>{x.l}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{x.v}</div>
          </div>
        ))}
      </section>

      <section style={{ ...card, padding: "14px 16px" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700 }}>Casos por estado</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "6px 16px" }}>
          {porEstado.map(e => (
            <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flex: "none" }} />
              <span style={{ color: "var(--sub)", flex: 1 }}>{e.label}</span>
              <b className="num">{e.count}</b>
            </div>
          ))}
        </div>
      </section>

      <CobrosPendientesCard cobrosPendientes={cobros} darkMode={darkMode} />
      <RankingPASCard ranking={ranking} darkMode={darkMode} />
      <GraficoCompanias allCasos={allCasos} darkMode={darkMode} cardBg="var(--card)" cardBorder="var(--border)" textColor="var(--text)" subColor="var(--sub)" />
    </div>
  );
}
