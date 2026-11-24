import { fmtMoney, describirPlazo, nombrePropio, fmtDate } from "../../utils/formatters.js";
import { netoYo, textoFalta } from "../../utils/metricas.js";
import { itemsCaso } from "../../utils/menus.js";
import { propsMenu } from "../ui/MenuContextual.jsx";

// "Por cobrar" de la pantalla Hoy: mi neto pendiente en grande y los casos en filas. El detalle completo está en Análisis.
export default function CobrosResumen({ cobros, onAbrir, onVerTodos }) {
  if (!cobros.length) return null;
  // Mi neto pendiente: solo de los casos donde todavía no cobré los honorarios
  const netoPendiente = c => (c.faltaHonorarios ? netoYo(c) : 0);
  const totalNeto = cobros.reduce((s, c) => s + netoPendiente(c), 0);
  // Línea de los próximos 30 días: un punto dorado por cobro con fecha (más grande cuanto más plata); lo vencido, en el borde izquierdo
  const DIAS_LINEA = 30;
  const enLinea = cobros.filter(c => c.diasRestantes !== null && c.diasRestantes <= DIAS_LINEA);
  const mayor = Math.max(1, ...enLinea.map(c => netoPendiente(c) || c.montoAsegurado || 0));
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
      <div className="cifra-heroe num" style={{ margin: "6px 0 8px" }}>{totalNeto ? fmtMoney(totalNeto) : "—"}</div>
      <span className="hilo-oro" />
      <div style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 2px" }}>mi neto pendiente</div>
      {enLinea.length > 0 && <>
        <div className="linea-cobros" role="img" aria-label={`${enLinea.length} ${enLinea.length === 1 ? "cobro previsto" : "cobros previstos"} en los próximos ${DIAS_LINEA} días`}>
          {enLinea.map(c => {
            const monto = netoPendiente(c) || c.montoAsegurado || 0;
            const tam = Math.round(8 + 10 * Math.sqrt(monto / mayor));
            // Los vencidos se apilan al principio, corridos un poco cada uno para que no queden encimados
            const vencidos = enLinea.filter(x => x.diasRestantes < 0);
            const izq = c.diasRestantes < 0 ? -2 + vencidos.indexOf(c) * 2.5 : (c.diasRestantes / DIAS_LINEA) * 100;
            return <span key={c.id} className={c.diasRestantes < 0 ? "vencido" : undefined} title={`${nombrePropio(c.asegurado)} · ${fmtDate(c.fechaEstimada)}`}
              style={{ left: `calc(${izq}% * 0.94 + 3%)`, width: tam, height: tam }} />;
          })}
        </div>
        <div className="linea-cobros-ejes" aria-hidden="true"><span>hoy</span><span>en 15 días</span><span>en 30 días</span></div>
      </>}
      <div className="lista-scroll" style={{ maxHeight: 300, overflowY: "auto" }}>
        {cobros.map(c => (
          <div key={c.id} className="fila-cobro" role="button" tabIndex={0} onClick={() => onAbrir(c)}
            onKeyDown={e => { if (e.key === "Enter") onAbrir(c); }}
            {...propsMenu(() => itemsCaso(c, { abrir: onAbrir, extra: [{ label: "Ver cobros en Análisis", onClick: onVerTodos }] }))}>
            <div style={{ minWidth: 0 }}>
              <div className="ft-titulo">{nombrePropio(c.asegurado)}</div>
              <div className="ft-sub">{[c.compania_aseguradora || "Sin compañía", cuando(c), !(c.faltaIndemnizacion && c.faltaHonorarios) && textoFalta(c)].filter(Boolean).join(" · ")}</div>
            </div>
            <div className="num" style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>{netoPendiente(c) ? fmtMoney(netoPendiente(c)) : "—"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
