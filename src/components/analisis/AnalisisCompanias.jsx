import { useMemo, useState } from "react";
import TablaAnalisis, { card, ConMuestra, Barrita, Nota } from "./TablaAnalisis.jsx";
import MargenCompanias from "../MargenCompanias.jsx";
import { statsCompanias, pct } from "../../utils/analisis.js";

const dias = v => (v === null ? "—" : `${v} d`);

// Análisis → Compañías: plazos de oferta y pago, cuánto ofrecen y cuántos terminan en mediación o juicio
export default function AnalisisCompanias({ allCasos }) {
  const [minimo, setMinimo] = useState(1);
  const { general, companias } = useMemo(() => statsCompanias(allCasos), [allCasos]);
  const filas = companias.filter(c => c.total >= minimo);

  const max = k => Math.max(...filas.map(f => f[k].valor || 0), 1);
  const colDias = (k, l, ayuda) => ({
    k, l, ayuda, ancho: "12%", derecha: true, valor: f => f[k].valor,
    celda: f => <><ConMuestra valor={f[k].valor} n={f[k].n} sufijo=" d" /><Barrita valor={f[k].valor} max={max(k)} /></>,
  });
  const colPct = (k, l, ayuda) => ({ k, l, ayuda, ancho: "10%", derecha: true, valor: f => f[k].valor, celda: f => <ConMuestra valor={f[k].valor} n={f[k].n} sufijo="%" /> });
  const colCuantos = (k, l) => ({
    k, l, ancho: "9%", derecha: true, valor: f => pct(f[k], f.total),
    celda: f => f[k] ? <span className="num">{f[k]} <span style={{ color: "var(--muted)", fontSize: 12 }}>({pct(f[k], f.total)}%)</span></span> : <span style={{ color: "var(--muted)" }}>0</span>,
  });

  const columnas = [
    { k: "nombre", l: "Compañía", ancho: "16%", valor: f => f.nombre.toLowerCase(), celda: f => <b style={{ fontWeight: 600 }}>{f.nombre}</b> },
    { k: "total", l: "Casos", ancho: "7%", derecha: true, celda: f => <span className="num">{f.total}</span> },
    colDias("diasOferta", "Reclamo a oferta", "Días desde el inicio del reclamo hasta el ofrecimiento"),
    colDias("diasIndemnizacion", "Pago indemn.", "Días desde el acuerdo (aceptación o firma) hasta que se cobró la indemnización"),
    colDias("diasHonorarios", "Pago honor.", "Días desde el acuerdo (aceptación o firma) hasta que cobraste los honorarios"),
    colDias("diasFactura", "Factura a cobro", "Días desde la factura hasta el cobro de honorarios"),
    colPct("pctOfrecido", "% ofrecido", "Primer ofrecimiento sobre el monto reclamado"),
    colPct("pctCobrado", "% cobrado", "Lo que cobró el asegurado sobre el monto reclamado"),
    colCuantos("mediacion", "Mediación"),
    colCuantos("juicio", "Juicio"),
  ];

  const kpis = [
    { l: "Reclamo a oferta", v: dias(general.diasOferta.valor), s: `${general.diasOferta.n} casos` },
    { l: "Acuerdo a pago · indemnización", v: dias(general.diasIndemnizacion.valor), s: `${general.diasIndemnizacion.n} casos` },
    { l: "Acuerdo a pago · honorarios", v: dias(general.diasHonorarios.valor), s: `${general.diasHonorarios.n} casos` },
    { l: "Ofrecido sobre reclamado", v: general.pctOfrecido.valor === null ? "—" : `${general.pctOfrecido.valor}%`, s: `${general.pctOfrecido.n} casos` },
    { l: "Mediación · juicio", v: `${pct(general.mediacion, general.total) ?? 0}% · ${pct(general.juicio, general.total) ?? 0}%`, s: `${general.mediacion} y ${general.juicio} de ${general.total} casos` },
  ];

  return (
    <>
      <section className="kpis" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        {kpis.map(x => (
          <div key={x.l} style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: 12, color: "var(--sub)" }}>{x.l}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{x.v}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>mediana · {x.s}</div>
          </div>
        ))}
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Por compañía</h2>
          <label style={{ fontSize: 13, color: "var(--sub)", display: "flex", alignItems: "center", gap: 8 }}>
            Con al menos
            <select value={minimo} onChange={e => setMinimo(Number(e.target.value))}
              style={{ font: "inherit", fontSize: 13, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)" }}>
              {[1, 2, 3, 5, 10].map(n => <option key={n} value={n}>{n} {n === 1 ? "caso" : "casos"}</option>)}
            </select>
          </label>
        </div>
        <TablaAnalisis columnas={columnas} filas={filas} ordenInicial={{ k: "total", desc: true }} clave={f => f.nombre} minWidth={980}
          vacio="Todavía no hay casos con compañía cargada." />
        <Nota>
          Los plazos son la <b>mediana</b> (el caso del medio), así un juicio de años no desfigura el número. Al lado va cuántos casos tienen las dos fechas cargadas: con pocos, tomalo como una pista.
          "Acuerdo" es la fecha de aceptación, o la de firma si no hay aceptación. Tocá un encabezado para ordenar.
        </Nota>
      </section>

      <MargenCompanias allCasos={allCasos} />
    </>
  );
}
