import { fmtMoney } from "../../utils/formatters.js";
import { resultadoDelMes, ultimosMeses } from "../../utils/finanzas.js";
import { MESES_LARGOS } from "../../utils/estadisticasPas.js";

const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 };
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const mesCorto = mes => `${MESES_CORTOS[Number(mes.slice(5, 7)) - 1]} ${mes.slice(2, 4)}`;
export const nombreMes = mes => { const m = MESES_LARGOS[Number(mes.slice(5, 7)) - 1]; return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${mes.slice(0, 4)}`; };

// Resultado del mes elegido (honorarios − comisiones − gastos) y los últimos 6 meses
export default function ResumenMes({ allCasos, gastos, mes }) {
  const r = resultadoDelMes(allCasos, gastos, mes);
  const meses = ultimosMeses(6, new Date(`${mes}-15T12:00:00`));
  const filas = meses.map(m => ({ mes: m, ...resultadoDelMes(allCasos, gastos, m) }));
  const kpi = (l, v, pie, color) => (
    <div style={{ padding: "12px 16px", minWidth: 0 }}>
      <div style={{ fontSize: 12, color: "var(--sub)" }}>{l}</div>
      <div className="num" style={{ fontSize: "clamp(18px, 4.6vw, 22px)", fontWeight: 700, color: color || "var(--text)", marginTop: 2, overflowWrap: "anywhere" }}>{v}</div>
      {pie && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{pie}</div>}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section className="kpis" style={{ ...tarjeta, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {kpi("Honorarios cobrados", fmtMoney(r.honorarios), `${r.casosCobrados} ${r.casosCobrados === 1 ? "caso" : "casos"}`)}
        {kpi("Comisiones a PAS", fmtMoney(r.comisiones), "pagadas en el mes")}
        {kpi("Gastos", fmtMoney(r.gastos), r.porCategoria[0] ? `más: ${r.porCategoria[0].l.toLowerCase()}` : "sin gastos cargados")}
        {kpi("Resultado", `${r.resultado < 0 ? "− " : ""}${fmtMoney(Math.abs(r.resultado))}`, "lo que te quedó", r.resultado < 0 ? "var(--bad)" : "var(--accent-ink)")}
      </section>

      <div className="dash-cols" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        <section style={{ ...tarjeta, padding: "12px 16px" }}>
          <h2 style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 700 }}>Últimos 6 meses</h2>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Salidas = comisiones a PAS + gastos</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "var(--muted)", textAlign: "right" }}>
                  <th style={{ textAlign: "left", fontWeight: 600, padding: "6px 0" }}>Mes</th>
                  <th style={{ fontWeight: 600 }}>Honorarios</th><th style={{ fontWeight: 600 }} title="Comisiones a PAS + gastos">Salidas</th><th style={{ fontWeight: 600 }}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(f => (
                  <tr key={f.mes} className="num" style={{ borderTop: "1px solid var(--border)", textAlign: "right", fontWeight: f.mes === mes ? 700 : 400 }}>
                    <td style={{ textAlign: "left", padding: "7px 0", whiteSpace: "nowrap" }}>{mesCorto(f.mes)}</td>
                    <td>{fmtMoney(f.honorarios)}</td>
                    <td style={{ color: "var(--sub)" }}>{fmtMoney(f.comisiones + f.gastos)}</td>
                    <td style={{ color: f.resultado < 0 ? "var(--bad)" : "var(--text)" }}>{f.resultado < 0 ? "− " : ""}{fmtMoney(Math.abs(f.resultado))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section style={{ ...tarjeta, padding: "12px 16px" }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Gastos por categoría · {nombreMes(mes)}</h2>
          {!r.porCategoria.length && <div style={{ fontSize: 13, color: "var(--muted)", padding: "6px 0" }}>Sin gastos este mes.</div>}
          {r.porCategoria.map(c => (
            <div key={c.k} style={{ padding: "6px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{c.l}</span><b className="num">{fmtMoney(c.total)}</b>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: "var(--border)", marginTop: 4, overflow: "hidden" }}>
                <div style={{ width: `${Math.round((c.total / r.gastos) * 100)}%`, height: "100%", background: "var(--accent)" }} />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
