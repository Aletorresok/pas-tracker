import { useMemo } from "react";
import TablaAnalisis, { card, tono, ConMuestra, Barrita, Nota } from "./TablaAnalisis.jsx";
import EstadoPill from "../ui/EstadoPill.jsx";
import { embudo, tiempoEnEstado, mediana, pct, ETAPAS } from "../../utils/analisis.js";
import { ESTADOS_CASO } from "../../constants.js";

// Análisis → Etapas: cuántos casos llegan a cada etapa, cuánto tardan entre una y otra y dónde se traban
export default function AnalisisEtapas({ allCasos, onAbrirCaso }) {
  const { etapas, caidas, desistidos } = useMemo(() => embudo(allCasos), [allCasos]);
  const activos = useMemo(() => tiempoEnEstado(allCasos), [allCasos]);
  const total = allCasos.length;

  const porEstado = ESTADOS_CASO.map(e => {
    const del = activos.filter(a => a.caso.estado === e.key);
    const ds = del.map(a => a.dias).filter(d => d !== null);
    return { key: e.key, label: e.label, casos: del.length, mediana: mediana(ds), max: ds.length ? Math.max(...ds) : null, conFecha: ds.length, sinFecha: del.length - ds.length };
  }).filter(e => e.casos > 0);
  const maxMediana = Math.max(...porEstado.map(e => e.mediana || 0), 1);

  const demorados = activos.filter(a => a.dias !== null).sort((a, b) => b.dias - a.dias).slice(0, 10);
  const maxDemora = Math.max(...demorados.map(d => d.dias), 1);

  return (
    <>
      <section style={{ ...card, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Embudo</h2>
          <span className="num" style={{ fontSize: 13, color: "var(--muted)" }}>{total} casos</span>
        </div>
        {etapas.map((e, i) => {
          const conversion = i ? pct(e.llegaron, etapas[i - 1].llegaron) : null;
          return (
            <div key={e.key}>
              {i > 0 && (
                <div className="num" style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "var(--muted)", padding: "3px 0 3px min(33%, 176px)" }}>
                  <span>{conversion ?? "—"}% pasa</span>
                  <span>·</span>
                  <span>tarda <ConMuestra valor={e.tiempo.valor} n={e.tiempo.n} sufijo=" d" /></span>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "min(33%, 166px) minmax(0, 1fr) 84px", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "var(--sub)", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.label}</span>
                <div style={{ height: 14, background: "var(--card2)", borderRadius: 4, overflow: "hidden" }} title={`${e.label}: ${e.llegaron} de ${total}`}>
                  <div style={{ width: `${total ? Math.max(2, (e.llegaron / total) * 100) : 0}%`, height: "100%", borderRadius: 4, background: tono(35 + Math.round((i / (etapas.length - 1)) * 60)) }} />
                </div>
                <span className="num" style={{ fontSize: 13 }}><b>{e.llegaron}</b> <span style={{ color: "var(--muted)" }}>{pct(e.llegaron, total) ?? 0}%</span></span>
              </div>
            </div>
          );
        })}
        {desistidos > 0 && (
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--sub)" }}>
            <b className="num" style={{ color: "var(--text)" }}>{desistidos}</b> desistidos. Última etapa a la que llegaron: {ETAPAS.filter(e => caidas[e.key]).map(e => `${e.label} (${caidas[e.key]})`).join(" · ")}.
          </div>
        )}
        <Nota>
          Un caso "llegó" a una etapa si tiene su fecha cargada o si su estado ya es posterior. "Tarda" es la mediana de días desde la etapa anterior, con los casos que tienen las dos fechas (al lado, cuántos son).
        </Nota>
      </section>

      <section>
        <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Tiempo en el estado actual</h2>
        <TablaAnalisis clave={f => f.key} filas={porEstado} ordenInicial={{ k: "mediana", desc: true }} minWidth={560} vacio="No hay casos en curso." columnas={[
          { k: "label", l: "Estado", ancho: "34%", valor: f => ESTADOS_CASO.findIndex(e => e.key === f.key), celda: f => <EstadoPill estado={f.key} /> },
          { k: "casos", l: "Casos", ancho: "12%", derecha: true, celda: f => <span className="num">{f.casos}</span> },
          { k: "mediana", l: "Mediana", ancho: "20%", derecha: true, celda: f => <><ConMuestra valor={f.mediana} n={f.conFecha} sufijo=" d" /><Barrita valor={f.mediana} max={maxMediana} /></> },
          { k: "max", l: "Máximo", ancho: "16%", derecha: true, celda: f => f.max === null ? <span style={{ color: "var(--muted)" }}>—</span> : <span className="num">{f.max} d</span> },
          { k: "sinFecha", l: "Sin fecha", ancho: "18%", derecha: true, ayuda: "Casos en este estado sin la fecha que indica cuándo entraron",
            celda: f => <span className="num" style={{ color: f.sinFecha ? "var(--warn)" : "var(--muted)", fontWeight: f.sinFecha ? 600 : 400 }}>{f.sinFecha}</span> },
        ]} />
        <Nota>
          Como no se guarda cuándo cambió el estado, la entrada se toma de la fecha del expediente que le corresponde: Reclamado desde el último reclamo, Con ofrecimiento desde la reconsideración u ofrecimiento, Esperando pago desde la aceptación o firma, y así. Los "sin fecha" no entran en la cuenta.
        </Nota>
      </section>

      {demorados.length > 0 && (
        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Los más demorados</h2>
          <TablaAnalisis clave={f => f.caso.id} filas={demorados} ordenInicial={{ k: "dias", desc: true }} minWidth={620} onFila={f => onAbrirCaso(f.caso)} columnas={[
            { k: "asegurado", l: "Asegurado", ancho: "30%", valor: f => (f.caso.asegurado || "").toLowerCase(), celda: f => <b style={{ fontWeight: 600 }}>{f.caso.asegurado || "Sin nombre"}</b> },
            { k: "compania", l: "Compañía", ancho: "22%", valor: f => (f.caso.compania_aseguradora || "").toLowerCase(), celda: f => f.caso.compania_aseguradora || "—" },
            { k: "estado", l: "Estado", ancho: "26%", valor: f => ESTADOS_CASO.findIndex(e => e.key === f.caso.estado), celda: f => <EstadoPill estado={f.caso.estado} /> },
            { k: "dias", l: "Días", ancho: "22%", derecha: true, celda: f => <><span className="num">{f.dias} d</span><Barrita valor={f.dias} max={maxDemora} color="var(--warn)" /></> },
          ]} />
        </section>
      )}
    </>
  );
}
