import { fmtMoney, describirPlazo } from "../../utils/formatters.js";
import { netoYo, textoFalta } from "../../utils/metricas.js";
import { itemsCaso } from "../../utils/menus.js";
import { propsMenu } from "../ui/MenuContextual.jsx";

// "Por cobrar" de la pantalla Hoy: mi neto pendiente en grande y los casos en filas. El detalle completo está en Análisis.
export default function CobrosResumen({ cobros, onAbrir, onVerTodos }) {
  if (!cobros.length) return null;
  // Mi neto pendiente: solo de los casos donde todavía no cobré los honorarios
  const netoPendiente = c => (c.faltaHonorarios ? netoYo(c) : 0);
  const totalNeto = cobros.reduce((s, c) => s + netoPendiente(c), 0);
  const cuando = c => {
    const p = c.fechaEstimada ? describirPlazo(c.fechaEstimada) : null;
    return p ? p.texto.replace(/^Vence /, "").replace(/^Vencido /, "venció ") : null;
  };
  return (
    <section className="panel-vidrio">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <h2 style={{ margin: 0, fontFamily: "var(--font)", letterSpacing: 0, fontSize: 14, fontWeight: 600, color: "var(--sub)" }}>Por cobrar <span className="num" style={{ fontWeight: 400, color: "var(--muted)" }}>· {cobros.length}</span></h2>
        <button type="button" className="link-sutil" onClick={onVerTodos} style={{ padding: 0 }}>Ver todo</button>
      </div>
      <div className="cifra num" style={{ margin: "4px 0 2px" }}>{totalNeto ? fmtMoney(totalNeto) : "—"}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>mi neto pendiente</div>
      <div className="lista-scroll" style={{ maxHeight: 300, overflowY: "auto" }}>
        {cobros.map(c => (
          <div key={c.id} className="fila-cobro" role="button" tabIndex={0} onClick={() => onAbrir(c)}
            onKeyDown={e => { if (e.key === "Enter") onAbrir(c); }}
            {...propsMenu(() => itemsCaso(c, { abrir: onAbrir, extra: [{ label: "Ver cobros en Análisis", onClick: onVerTodos }] }))}>
            <div style={{ minWidth: 0 }}>
              <div className="ft-titulo">{c.asegurado}</div>
              <div className="ft-sub">{[c.compania_aseguradora || "Sin compañía", cuando(c), !(c.faltaIndemnizacion && c.faltaHonorarios) && textoFalta(c)].filter(Boolean).join(" · ")}</div>
            </div>
            <div className="num" style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>{netoPendiente(c) ? fmtMoney(netoPendiente(c)) : "—"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
