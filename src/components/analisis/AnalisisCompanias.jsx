import { useMemo, useState } from "react";
import TablaAnalisis, { card, ConMuestra, Barrita, Nota } from "./TablaAnalisis.jsx";
import MargenCompanias from "../MargenCompanias.jsx";
import { statsCompanias, pct, incumplimientos } from "../../utils/analisis.js";
import { fmtDate } from "../../utils/formatters.js";

const dias = v => (v === null ? "—" : `${v} d`);

// Análisis → Compañías: plazos de oferta y pago, cuánto ofrecen y cuántos terminan en mediación o juicio
export default function AnalisisCompanias({ allCasos, ofertas = {}, onAbrirCaso }) {
  const [minimo, setMinimo] = useState(1);
  const { general, companias } = useMemo(() => statsCompanias(allCasos, ofertas), [allCasos, ofertas]);
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
    colPct("suba", "Suba 1ª → última", "Cuánto subió la compañía de la primera oferta a la última (casos con 2 o más ofertas)"),
    { k: "pagos", l: "Paga a término", ancho: "11%", derecha: true, ayuda: "Pagos con fecha comprometida que llegaron a tiempo. Al lado, los atrasados e impagos",
      valor: f => f.pagos.pctATermino,
      celda: f => f.pagos.total === 0 ? <span style={{ color: "var(--muted)" }}>—</span> : (
        <span className="num" title={`${f.pagos.aTermino} a término · ${f.pagos.tarde} tarde · ${f.pagos.impagos} sin pagar`}>
          {f.pagos.pctATermino === null ? "—" : `${f.pagos.pctATermino}%`}
          {(f.pagos.tarde + f.pagos.impagos) > 0 && <span style={{ fontSize: 11, color: "var(--bad)", marginLeft: 5 }}>· {f.pagos.tarde + f.pagos.impagos} incumpl.</span>}
        </span>
      ) },
    colCuantos("mediacion", "Mediación"),
    colCuantos("juicio", "Juicio"),
  ];

  const kpis = [
    { l: "Reclamo a oferta", v: dias(general.diasOferta.valor), s: `${general.diasOferta.n} casos` },
    { l: "Acuerdo a pago · indemnización", v: dias(general.diasIndemnizacion.valor), s: `${general.diasIndemnizacion.n} casos` },
    { l: "Acuerdo a pago · honorarios", v: dias(general.diasHonorarios.valor), s: `${general.diasHonorarios.n} casos` },
    { l: "Ofrecido sobre reclamado", v: general.pctOfrecido.valor === null ? "—" : `${general.pctOfrecido.valor}%`, s: `${general.pctOfrecido.n} casos` },
    { l: "Suba de la 1ª a la última oferta", v: general.suba.valor === null ? "—" : `${general.suba.valor > 0 ? "+" : ""}${general.suba.valor}%`, s: `${general.suba.n} casos` },
    { l: "Mediación · juicio", v: `${pct(general.mediacion, general.total) ?? 0}% · ${pct(general.juicio, general.total) ?? 0}%`, s: `${general.mediacion} y ${general.juicio} de ${general.total} casos` },
  ];

  return (
    <>
      <section className="kpis" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
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
        <TablaAnalisis columnas={columnas} filas={filas} ordenInicial={{ k: "total", desc: true }} clave={f => f.nombre} minWidth={1200}
          vacio="Todavía no hay casos con compañía cargada." />
        <Nota>
          Los plazos son la <b>mediana</b> (el caso del medio), así un juicio de años no desfigura el número. Al lado va cuántos casos tienen las dos fechas cargadas: con pocos, tomalo como una pista.
          "Acuerdo" es la fecha de aceptación, o la de firma si no hay aceptación. Tocá un encabezado para ordenar.
        </Nota>
      </section>

      <Incumplimientos allCasos={allCasos} general={general.pagos} onAbrirCaso={onAbrirCaso} />

      <MargenCompanias allCasos={allCasos} />
    </>
  );
}

// Casos en los que la compañía pagó después de la fecha comprometida, o ya se pasó y no pagó
function Incumplimientos({ allCasos, general, onAbrirCaso }) {
  const filas = useMemo(() => incumplimientos(allCasos).filter(x => x.estado !== "a_termino"), [allCasos]);
  const maxAtraso = Math.max(...filas.map(f => f.atraso), 1);
  return (
    <section>
      <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Incumplimientos de pago</h2>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--sub)" }}>
        {general.total === 0 ? "Todavía no hay casos con fecha comprometida de pago." : (
          <>De <b className="num">{general.cerrados}</b> {general.cerrados === 1 ? "pago" : "pagos"} con fecha comprometida, <b className="num">{general.aTermino}</b> a término
          y <b className="num" style={{ color: general.tarde ? "var(--bad)" : undefined }}>{general.tarde}</b> tarde{general.atraso !== null ? <> (atraso típico: <b className="num">{general.atraso} días</b>)</> : null}.
          {general.impagos > 0 && <> Hoy hay <b className="num" style={{ color: "var(--bad)" }}>{general.impagos}</b> vencido{general.impagos === 1 ? "" : "s"} sin pagar.</>}</>
        )}
      </p>
      <TablaAnalisis clave={f => f.caso.id} filas={filas} ordenInicial={{ k: "atraso", desc: true }} minWidth={760} onFila={onAbrirCaso ? f => onAbrirCaso(f.caso) : undefined}
        vacio="Ninguna compañía pagó tarde, por ahora." columnas={[
          { k: "asegurado", l: "Asegurado", ancho: "22%", valor: f => (f.caso.asegurado || "").toLowerCase(), celda: f => <b style={{ fontWeight: 600 }}>{f.caso.asegurado || "Sin nombre"}</b> },
          { k: "compania", l: "Compañía", ancho: "18%", valor: f => (f.caso.compania_aseguradora || "").toLowerCase(), celda: f => f.caso.compania_aseguradora || "—" },
          { k: "debia", l: "Tenía que pagar", ancho: "22%", celda: f => <span className="num">{fmtDate(f.debia)} <span style={{ fontSize: 12, color: "var(--muted)" }}>{f.segun}</span></span> },
          { k: "pago", l: "Pagó", ancho: "16%", valor: f => f.pago || "9999", celda: f => f.pago ? <span className="num">{fmtDate(f.pago)}</span> : <b style={{ color: "var(--bad)" }}>Sin pagar</b> },
          { k: "atraso", l: "Atraso", ancho: "22%", derecha: true, celda: f => <><span className="num" style={{ color: "var(--bad)", fontWeight: 600 }}>{f.atraso} {f.atraso === 1 ? "día" : "días"}{f.estado === "impago" ? " y sigue" : ""}</span><Barrita valor={f.atraso} max={maxAtraso} color="var(--bad)" /></> },
        ]} />
      <Nota>
        La fecha comprometida sale de la firma + plazo del convenio; si no hay firma, de la aceptación + plazo; si no hay plazo, de la fecha de pago cargada.
        El pago es la fecha en que se tildó "Indemnización pagada". Un caso sin pagar entra al día siguiente de la fecha comprometida.
      </Nota>
    </section>
  );
}
