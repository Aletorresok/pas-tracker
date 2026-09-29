import { useState } from "react";
import { fmtMoney, fmtDate, fechaLocalISO, diasDesde } from "../../utils/formatters.js";
import { facturacion, guardarFactura, gastosPorCaso } from "../../utils/finanzas.js";
import Boton from "../ui/Boton.jsx";

const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" };
const campo = { boxSizing: "border-box", padding: "6px 8px", borderRadius: "var(--r-xs)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 13 };
const num = v => Number(v) || 0;

// Honorarios: sin facturar (se facturan acá con número y fecha), facturados sin cobrar y cobrados con su neto
export default function Facturacion({ allCasos, gastos, conNumero, onCasoLocal, onAbrirCaso, setToast }) {
  const { sinFacturar, facturadoSinCobrar, cobrados } = facturacion(allCasos);
  const porCaso = gastosPorCaso(gastos);
  const [borradores, setBorradores] = useState({}); // id → { nro_factura, fecha_factura }
  const [guardando, setGuardando] = useState(null);
  const [verCobrados, setVerCobrados] = useState(10);

  const borrador = c => borradores[c.id] || { nro_factura: c.nro_factura || "", fecha_factura: c.fecha_factura || fechaLocalISO() };
  const cambiar = (c, k, v) => setBorradores(b => ({ ...b, [c.id]: { ...borrador(c), [k]: v } }));

  const facturar = async c => {
    const b = borrador(c);
    if (!b.fecha_factura) return setToast({ msg: "Poné la fecha de la factura", type: "error" });
    setGuardando(c.id);
    const cambios = await guardarFactura(c, conNumero ? b : { fecha_factura: b.fecha_factura });
    setGuardando(null);
    if (!cambios) return setToast({ msg: "No se pudo guardar la factura", type: "error" });
    const { _pasId, _pasNombre, ...limpio } = c;
    onCasoLocal(_pasId, { ...limpio, ...cambios });
    setBorradores(x => { const { [c.id]: _, ...resto } = x; return resto; });
    setToast({ msg: "Factura cargada", type: "success" });
  };

  const titulo = (t, n, extra) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t} <span className="num" style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>{n}</span></h2>
      {extra}
    </div>
  );
  const nombre = c => (
    <button type="button" onClick={() => onAbrirCaso(c)} style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--text)", cursor: "pointer", textAlign: "left", minWidth: 0 }}>
      <span style={{ display: "block", fontSize: 14, fontWeight: 600, overflowWrap: "anywhere" }}>{c.asegurado || "Sin nombre"}</span>
      <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{[c.compania_aseguradora, c._pasNombre].filter(Boolean).join(" · ")}</span>
    </button>
  );
  const total = lista => fmtMoney(lista.reduce((s, c) => s + num(c.monto_cobro_yo), 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!conNumero && <div style={{ fontSize: 13, color: "var(--warn)" }}>Para guardar el número de factura falta correr el SQL 28 (por ahora se guarda solo la fecha).</div>}

      <section style={{ ...tarjeta, padding: "12px 16px" }}>
        {titulo("Sin facturar", sinFacturar.length, <b className="num" style={{ fontSize: 14 }}>{total(sinFacturar)}</b>)}
        {!sinFacturar.length && <div style={{ fontSize: 13, color: "var(--muted)", padding: "6px 0" }}>Todo lo que tiene honorarios cargados ya está facturado.</div>}
        {sinFacturar.map(c => {
          const b = borrador(c);
          return (
            <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
              <span style={{ flex: "1 1 180px", minWidth: 0 }}>{nombre(c)}</span>
              <b className="num" style={{ fontSize: 14 }}>{fmtMoney(num(c.monto_cobro_yo))}</b>
              {conNumero && <input value={b.nro_factura} onChange={e => cambiar(c, "nro_factura", e.target.value)} placeholder="N° de factura" aria-label={`Número de factura de ${c.asegurado}`} style={{ ...campo, width: 140 }} />}
              <input type="date" value={b.fecha_factura} onChange={e => cambiar(c, "fecha_factura", e.target.value)} aria-label={`Fecha de factura de ${c.asegurado}`} style={{ ...campo, width: 140 }} />
              <Boton tamaño="sm" onClick={() => facturar(c)} disabled={guardando === c.id}>{guardando === c.id ? "Guardando…" : "Facturar"}</Boton>
            </div>
          );
        })}
      </section>

      <section style={{ ...tarjeta, padding: "12px 16px" }}>
        {titulo("Facturado, sin cobrar", facturadoSinCobrar.length, <b className="num" style={{ fontSize: 14 }}>{total(facturadoSinCobrar)}</b>)}
        {!facturadoSinCobrar.length && <div style={{ fontSize: 13, color: "var(--muted)", padding: "6px 0" }}>No hay facturas pendientes de cobro.</div>}
        {facturadoSinCobrar.map(c => {
          const dias = diasDesde(c.fecha_factura);
          return (
            <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
              <span style={{ flex: "1 1 180px", minWidth: 0 }}>{nombre(c)}</span>
              <span style={{ fontSize: 12, color: dias > 30 ? "var(--bad)" : "var(--sub)", fontWeight: dias > 30 ? 600 : 400 }}>
                {[c.nro_factura && `Fact. ${c.nro_factura}`, `${fmtDate(c.fecha_factura)} · hace ${dias} d`].filter(Boolean).join(" · ")}
              </span>
              <b className="num" style={{ fontSize: 14 }}>{fmtMoney(num(c.monto_cobro_yo))}</b>
              <Boton tamaño="sm" variante="fantasma" onClick={() => onAbrirCaso(c, "montos")}>Marcar cobro</Boton>
            </div>
          );
        })}
      </section>

      <section style={{ ...tarjeta, padding: "12px 16px" }}>
        {titulo("Cobrados", cobrados.length)}
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Neto = tus honorarios − comisión del PAS − gastos cargados a ese caso.</div>
        {cobrados.slice(0, verCobrados).map(c => {
          const gasto = porCaso.get(c.id) || 0;
          const neto = num(c.monto_cobro_yo) - num(c.monto_comision_pas) - gasto;
          return (
            <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
              <span style={{ flex: "1 1 180px", minWidth: 0 }}>{nombre(c)}</span>
              <span className="num" style={{ fontSize: 12, color: "var(--sub)" }}>
                {[c.fecha_cobro_honorarios && `cobrado ${fmtDate(c.fecha_cobro_honorarios)}`, c.nro_factura && `Fact. ${c.nro_factura}`,
                  num(c.monto_comision_pas) > 0 && `comisión ${fmtMoney(num(c.monto_comision_pas))}`, gasto > 0 && `gastos ${fmtMoney(gasto)}`].filter(Boolean).join(" · ")}
              </span>
              <b className="num" style={{ fontSize: 14 }} title={`Honorarios ${fmtMoney(num(c.monto_cobro_yo))}`}>{fmtMoney(neto)}</b>
            </div>
          );
        })}
        {cobrados.length > verCobrados && <Boton tamaño="sm" variante="fantasma" onClick={() => setVerCobrados(n => n + 20)}>Ver más</Boton>}
      </section>
    </div>
  );
}
