import { fmtMoney } from "../../utils/formatters.js";
import { netoYo, textoFalta } from "../../utils/metricas.js";
import TarjetaTarea from "../ui/TarjetaTarea.jsx";
import { itemsCaso } from "../../utils/menus.js";
import ListaOrdenable from "../ui/ListaOrdenable.jsx";


// Versión compacta de "Cobros pendientes" para la pantalla Hoy. El detalle completo está en Análisis.
export default function CobrosResumen({ cobros, onAbrir, onVerTodos }) {
  if (!cobros.length) return null;
  // Mi neto pendiente: solo de los casos donde todavía no cobré los honorarios
  const netoPendiente = c => (c.faltaHonorarios ? netoYo(c) : 0);
  const totalNeto = cobros.reduce((s, c) => s + netoPendiente(c), 0);
  return (
    <section className="panel-vidrio">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 14, padding: "0 4px" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Cobros pendientes</h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{cobros.length} · mi neto <b className="num" style={{ color: "var(--text)" }}>{fmtMoney(totalNeto)}</b></span>
      </div>
      <div className="lista-scroll" style={{ maxHeight: 340, overflowY: "auto", margin: "0 -10px", padding: "6px 10px 10px" }}>
        <ListaOrdenable items={cobros} storageKey="cobros" render={(c, { dragging, dragProps }) => (
          <TarjetaTarea dragging={dragging} dragProps={dragProps} vence={c.fechaEstimada} titulo={c.asegurado}
            detalle={`${c.compania_aseguradora || "Sin compañía"} · ${textoFalta(c)}`} onClick={() => onAbrir(c)}
            menu={() => itemsCaso(c, { abrir: onAbrir, extra: [{ label: "Ver cobros en Análisis", onClick: onVerTodos }] })}
            derecha={netoPendiente(c) ? fmtMoney(netoPendiente(c)) : "—"} />
        )} />
      </div>
      <button type="button" onClick={onVerTodos}
        style={{ marginTop: 8, background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: "4px 4px" }}>
        Ver detalle en Análisis →
      </button>
    </section>
  );
}
