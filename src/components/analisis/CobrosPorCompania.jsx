import { useMemo } from "react";
import { fmtMoney, fmtDate } from "../../utils/formatters.js";
import { abrirCompania } from "../../utils/companiaAbierta.js";
import TablaAnalisis from "./TablaAnalisis.jsx";

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)" };

// Análisis → Resumen: lo que falta cobrar, agrupado por compañía (el detalle caso por caso está en Hoy).
// Debe = indemnización + tus honorarios pendientes; vencido = lo que ya pasó la fecha de pago; atraso = promedio de días vencidos.
export default function CobrosPorCompania({ cobros }) {
  const filas = useMemo(() => {
    const m = new Map();
    cobros.forEach(c => {
      const k = c.compania_aseguradora || "Sin compañía";
      const f = m.get(k) || { nombre: k, casos: 0, debe: 0, honorarios: 0, vencido: 0, atrasos: [], proximo: null };
      const monto = (c.montoAsegurado || 0) + (c.montoYo || 0);
      f.casos++; f.debe += monto; f.honorarios += c.montoYo || 0;
      if (c.diasRestantes !== null && c.diasRestantes < 0) { f.vencido += monto; f.atrasos.push(-c.diasRestantes); }
      else if (c.fechaEstimada && (!f.proximo || c.fechaEstimada < f.proximo)) f.proximo = c.fechaEstimada;
      m.set(k, f);
    });
    return [...m.values()].map(f => ({ ...f, atraso: f.atrasos.length ? Math.round(f.atrasos.reduce((s, d) => s + d, 0) / f.atrasos.length) : null }));
  }, [cobros]);

  if (!filas.length) return null;
  const total = filas.reduce((s, f) => s + f.debe, 0);
  const vencido = filas.reduce((s, f) => s + f.vencido, 0);
  const columnas = [
    { k: "nombre", l: "Compañía", celda: f => (
      <button type="button" onClick={() => abrirCompania(f.nombre)} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 600, color: "var(--text)", cursor: "pointer", textAlign: "left" }}>{f.nombre}</button>
    ) },
    { k: "casos", l: "Casos", derecha: true },
    { k: "debe", l: "Debe", derecha: true, celda: f => fmtMoney(f.debe) },
    { k: "honorarios", l: "Tus honorarios", derecha: true, celda: f => fmtMoney(f.honorarios) },
    { k: "vencido", l: "Vencido", derecha: true, celda: f => f.vencido ? <span style={{ color: "var(--bad)", fontWeight: 600 }}>{fmtMoney(f.vencido)}</span> : "—" },
    { k: "atraso", l: "Atraso promedio", derecha: true, celda: f => (f.atraso != null ? `${f.atraso} d` : "—") },
    { k: "proximo", l: "Próximo pago", celda: f => (f.proximo ? fmtDate(f.proximo) : "—") },
  ];
  return (
    <section style={{ ...card, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Cobros pendientes por compañía</h2>
        <span className="num" style={{ fontSize: 13, color: "var(--sub)" }}>
          Deben <b style={{ color: "var(--text)" }}>{fmtMoney(total)}</b>{vencido ? <> · vencido <b style={{ color: "var(--bad)" }}>{fmtMoney(vencido)}</b></> : null}
        </span>
      </div>
      <TablaAnalisis columnas={columnas} filas={filas} ordenInicial={{ k: "vencido", desc: true }} clave={f => f.nombre} minWidth={720} vacio="No hay cobros pendientes." />
    </section>
  );
}
