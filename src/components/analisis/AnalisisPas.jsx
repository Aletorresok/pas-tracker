import { useMemo, useState } from "react";
import TablaAnalisis, { card, Barrita, Nota } from "./TablaAnalisis.jsx";
import Icono from "../ui/Icono.jsx";
import { statsPasAnalisis, pct } from "../../utils/analisis.js";
import { fmtMoney } from "../../utils/formatters.js";

const nada = <span style={{ color: "var(--muted)" }}>—</span>;

// Análisis → PAS: cuánto deja cada productor y qué tan seguido sus casos se cobran o se caen
export default function AnalisisPas({ allCasos }) {
  const [busqueda, setBusqueda] = useState("");
  const todas = useMemo(() => statsPasAnalisis(allCasos), [allCasos]);
  const q = busqueda.trim().toLowerCase();
  const filas = q ? todas.filter(f => f.nombre.toLowerCase().includes(q)) : todas;

  const tot = todas.reduce((a, f) => ({ total: a.total + f.total, cobrados: a.cobrados + f.cobrados, desistidos: a.desistidos + f.desistidos, neto: a.neto + f.neto, conNeto: a.conNeto + f.casosConNeto }),
    { total: 0, cobrados: 0, desistidos: 0, neto: 0, conNeto: 0 });
  const maxNetoCaso = Math.max(...filas.map(f => f.netoPorCaso || 0), 1);
  const maxNeto = Math.max(...filas.map(f => f.neto), 1);
  const porcentaje = (v, color) => v === null ? nada : <><span className="num">{v}%</span><Barrita valor={v} max={100} color={color} /></>;

  const columnas = [
    { k: "nombre", l: "PAS", ancho: "17%", valor: f => f.nombre.toLowerCase(), celda: f => <b style={{ fontWeight: 600 }}>{f.nombre}</b> },
    { k: "total", l: "Casos", ancho: "6%", derecha: true, celda: f => <span className="num">{f.total}</span> },
    { k: "enCurso", l: "En curso", ancho: "7%", derecha: true, celda: f => <span className="num" style={{ color: f.enCurso ? "var(--text)" : "var(--muted)" }}>{f.enCurso}</span> },
    { k: "pctExito", l: "Cobrados", ancho: "9%", derecha: true, ayuda: "De los casos ya cerrados, cuántos se cobraron", celda: f => porcentaje(f.pctExito, "var(--ok)") },
    { k: "pctDesistidos", l: "Desistidos", ancho: "9%", derecha: true, ayuda: "Desistidos sobre el total de casos del PAS (igual que en Clientes)", celda: f => porcentaje(f.pctDesistidos, "var(--bad)") },
    { k: "netoPorCaso", l: "Neto por caso", ancho: "11%", derecha: true, ayuda: "Tus honorarios menos la comisión del PAS, promedio por caso con honorarios cobrados",
      celda: f => f.netoPorCaso === null ? nada : <><span className="num">{fmtMoney(f.netoPorCaso)}</span><Barrita valor={f.netoPorCaso} max={maxNetoCaso} /></> },
    { k: "neto", l: "Neto total", ancho: "11%", derecha: true, celda: f => f.neto ? <><span className="num">{fmtMoney(f.neto)}</span><Barrita valor={f.neto} max={maxNeto} /></> : nada },
    { k: "diasACobro", l: "Deriv. a cobro", ancho: "9%", derecha: true, ayuda: "Promedio de días desde que te derivó el caso hasta que se cobró",
      celda: f => f.diasACobro === null ? nada : <span className="num">{f.diasACobro} d</span> },
    { k: "ritmo", l: "Ritmo", ancho: "12%", ayuda: "Cada cuántos días te deriva (mediana, desde 3 casos). Dormido: pasó el doble de su ritmo sin derivarte",
      valor: f => f.ritmo,
      celda: f => f.ritmo === null ? nada : <span className="num" style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
        {f.dormido && <span title={`Hace ${f.diasDesdeUltimo} días que no te deriva`} style={{ fontSize: 11, fontWeight: 700, color: "var(--warn)", background: "color-mix(in srgb, var(--warn) 13%, transparent)", borderRadius: 5, padding: "1px 6px" }}>Dormido</span>}
        cada {f.ritmo} d
      </span> },
    { k: "tendencia", l: "Últ. 6 meses", ancho: "9%", derecha: true, ayuda: "Casos derivados en los últimos 6 meses contra los 6 anteriores",
      valor: f => f.ult6 - f.prev6,
      celda: f => <span className="num" title={`${f.ult6} casos en los últimos 6 meses, ${f.prev6} en los 6 anteriores`}>
        {f.ult6}<span style={{ fontSize: 12, marginLeft: 4, color: f.ult6 > f.prev6 ? "var(--ok)" : f.ult6 < f.prev6 ? "var(--bad)" : "var(--muted)" }}>{f.ult6 > f.prev6 ? "▲" : f.ult6 < f.prev6 ? "▼" : "="} {f.prev6}</span>
      </span> },
  ];

  const cerrados = tot.cobrados + tot.desistidos;
  const kpis = [
    { l: "Neto por caso", v: tot.conNeto ? fmtMoney(Math.round(tot.neto / tot.conNeto)) : "—", s: `${tot.conNeto} casos con honorarios cobrados` },
    { l: "Cobrados", v: cerrados ? `${pct(tot.cobrados, cerrados)}%` : "—", s: `${tot.cobrados} de ${cerrados} cerrados` },
    { l: "Desistidos", v: tot.total ? `${pct(tot.desistidos, tot.total)}%` : "—", s: `${tot.desistidos} de ${tot.total} casos` },
    { l: "PAS con casos", v: todas.length, s: `${todas.filter(f => f.neto > 0).length} ya te dejaron honorarios` },
  ];

  return (
    <>
      <section className="kpis" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {kpis.map(x => (
          <div key={x.l} style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: 12, color: "var(--sub)" }}>{x.l}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{x.v}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{x.s}</div>
          </div>
        ))}
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Por PAS</h2>
          <div style={{ position: "relative", width: 260, maxWidth: "100%" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex" }}><Icono nombre="buscar" size={15} /></span>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar PAS…" aria-label="Buscar PAS"
              style={{ width: "100%", padding: "7px 10px 7px 32px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 13 }} />
          </div>
        </div>
        <TablaAnalisis columnas={columnas} filas={filas} ordenInicial={{ k: "neto", desc: true }} clave={f => f.pasId} minWidth={1080}
          vacio={q ? "Ningún PAS coincide con la búsqueda." : "Todavía no hay casos derivados."} />
        <Nota>
          "Cobrados" se mide sobre los casos <b>cerrados</b> (cobrados + desistidos), así un PAS con todo en trámite no queda en 0%. "Desistidos" se mide sobre el total, igual que en Clientes.
          Neto = tus honorarios menos la comisión del PAS, de los casos donde ya cobraste los honorarios. Ritmo = cada cuántos días te deriva; "Dormido" si pasó el doble sin derivarte (lo mismo que ves en Clientes).
        </Nota>
      </section>
    </>
  );
}
