import { useState, useEffect, useMemo } from "react";
import { fmtMoney, fmtDate, fechaLocalISO } from "../../utils/formatters.js";
import { comisionPorPagar, comisionPagada } from "../../utils/metricas.js";
import { registrarPago, cargarPagos, abrirComprobante, borrarPago, validarArchivo, ACEPTA } from "../../utils/comprobantes.js";
import CampoMonto from "../ui/CampoMonto.jsx";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";

const num = v => Number(v) || 0;
const tieneComision = c => num(c.monto_comision_pas) > 0 && c.estado !== "desistido";

// Registrar una transferencia a un PAS: tildás las comisiones que cubre, subís el comprobante y quedan pagadas.
// Abajo, los pagos ya registrados con su comprobante. El PAS los ve igual desde su portal.
export default function PagoComisiones({ pas, casos, onCasoLocal, onCerrar }) {
  const porPagar = useMemo(() => casos.filter(comisionPorPagar), [casos]);
  // Pagadas antes de esta función (o tildadas a mano) que todavía no tienen comprobante: para cargarlo después
  const sinComprobante = useMemo(() => casos.filter(c => tieneComision(c) && comisionPagada(c) && !c.pago_comision_id), [casos]);

  const [tildados, setTildados] = useState(() => new Set(porPagar.map(c => c.id)));
  const [fecha, setFecha] = useState(fechaLocalISO());
  const [monto, setMonto] = useState(null); // null = la suma de lo tildado
  const [nota, setNota] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [pagos, setPagos] = useState(undefined); // undefined = cargando, null = no se pudo

  const recargar = () => cargarPagos(pas.id).then(setPagos);
  useEffect(() => { recargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pas.id]);

  const elegidos = [...porPagar, ...sinComprobante].filter(c => tildados.has(c.id));
  const suma = elegidos.reduce((s, c) => s + num(c.monto_comision_pas), 0);
  const montoFinal = monto === null ? suma : num(monto);

  const alternar = id => setTildados(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const guardar = async () => {
    setError(""); setAviso("");
    const errArchivo = validarArchivo(archivo);
    if (errArchivo) { setError(errArchivo); return; }
    if (!elegidos.length) { setError("Tildá al menos una comisión."); return; }
    setGuardando(true);
    const r = await registrarPago({ pasId: pas.id, fecha, monto: montoFinal, nota, archivo, casos: elegidos });
    setGuardando(false);
    r.casos?.forEach(c => onCasoLocal(String(pas.id), c));
    if (r.error) { setError(r.error); if (r.pago) recargar(); return; }
    setAviso(`Listo: ${elegidos.length === 1 ? "1 comisión quedó pagada" : `${elegidos.length} comisiones quedaron pagadas`} con su comprobante. ${pas.nombre?.split(" ")[0] || "El PAS"} ya lo ve en su portal.`);
    setTildados(new Set()); setArchivo(null); setNota(""); setMonto(null);
    recargar();
  };

  const quitar = async pago => {
    if (!window.confirm("¿Borrar este comprobante? Las comisiones siguen marcadas como pagadas, pero sin comprobante.")) return;
    if (await borrarPago(pago)) {
      casos.filter(c => c.pago_comision_id === pago.id).forEach(c => onCasoLocal(String(pas.id), { id: c.id, pago_comision_id: null }));
      recargar();
    } else setError("No se pudo borrar el comprobante.");
  };

  const ver = async pago => { if (!(await abrirComprobante(pago))) setError("No se pudo abrir el comprobante."); };
  const casosDe = pago => casos.filter(c => c.pago_comision_id === pago.id);

  const filaCaso = c => (
    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderTop: "1px solid var(--border)", cursor: "pointer", fontSize: 14 }}>
      <input type="checkbox" checked={tildados.has(c.id)} onChange={() => alternar(c.id)} />
      <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {c.asegurado || "Sin nombre"}
        {c.patente && <span style={{ marginLeft: 8, fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)" }}>{c.patente}</span>}
        {c.fecha_pago_comision && <span style={{ marginLeft: 8, fontSize: 12, color: "var(--muted)" }}>marcada pagada el {fmtDate(c.fecha_pago_comision)}</span>}
      </span>
      <span className="num" style={{ fontWeight: 600 }}>{fmtMoney(num(c.monto_comision_pas))}</span>
    </label>
  );

  const campo = { font: "inherit", fontSize: 14, padding: "7px 10px", borderRadius: "var(--r-xs)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", boxSizing: "border-box", width: "100%" };
  const titulo = { fontSize: 12, fontWeight: 600, color: "var(--muted)", padding: "6px 10px", background: "var(--card2)" };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-sm)", background: "var(--card)", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Pagos de comisiones</span>
        <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex" }}><Icono nombre="cerrar" size={16} /></button>
      </div>

      {porPagar.length + sinComprobante.length === 0
        ? <div style={{ fontSize: 13, color: "var(--muted)" }}>No hay comisiones por pagar ni pagadas sin comprobante.</div>
        : <>
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-xs)", overflow: "hidden" }}>
              {porPagar.length > 0 && <><div style={titulo}>Por pagar</div>{porPagar.map(filaCaso)}</>}
              {sinComprobante.length > 0 && <><div style={{ ...titulo, borderTop: porPagar.length ? "1px solid var(--border)" : "none" }}>Pagadas sin comprobante</div>{sinComprobante.map(filaCaso)}</>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--sub)" }}>
                Fecha de la transferencia
                <input type="date" value={fecha} max={fechaLocalISO()} onChange={e => setFecha(e.target.value)} style={campo} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--sub)" }}>
                Monto transferido
                <CampoMonto value={monto === null ? suma : monto} onChange={v => setMonto(v)} style={{ ...campo, paddingLeft: 22 }} aria-label="Monto transferido" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--sub)" }}>
                Comprobante (PDF o foto)
                <input type="file" accept={ACEPTA} onChange={e => setArchivo(e.target.files?.[0] || null)} style={{ ...campo, padding: "5px 8px" }} />
              </label>
            </div>
            <input type="text" placeholder="Nota (opcional, la ve el PAS)" value={nota} onChange={e => setNota(e.target.value)} style={campo} aria-label="Nota" />
            {monto !== null && num(monto) !== suma && <div style={{ fontSize: 13, color: "var(--warn)" }}>Lo tildado suma {fmtMoney(suma)}.</div>}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Boton variante="primario" tamaño="sm" icono="adjuntar" onClick={guardar} disabled={guardando}>
                {guardando ? "Guardando…" : `Registrar pago${elegidos.length ? ` de ${fmtMoney(montoFinal)}` : ""}`}
              </Boton>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{elegidos.length} {elegidos.length === 1 ? "comisión tildada" : "comisiones tildadas"}</span>
            </div>
          </>}

      {error && <div role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>{error}</div>}
      {aviso && <div role="status" style={{ fontSize: 13, color: "var(--ok)" }}>{aviso}</div>}

      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--sub)", marginBottom: 6 }}>Pagos registrados</div>
        {pagos === undefined && <div style={{ fontSize: 13, color: "var(--muted)" }}>Cargando…</div>}
        {pagos === null && <div style={{ fontSize: 13, color: "var(--warn)" }}>No se pudieron leer los pagos (¿falta correr el SQL 49?).</div>}
        {pagos?.length === 0 && <div style={{ fontSize: 13, color: "var(--muted)" }}>Todavía no hay pagos con comprobante.</div>}
        {pagos?.length > 0 && (
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-xs)", overflow: "hidden" }}>
            {pagos.map((p, i) => {
              const cubre = casosDe(p);
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderTop: i ? "1px solid var(--border)" : "none", fontSize: 14, flexWrap: "wrap" }}>
                  <span className="num" style={{ width: 82, color: "var(--sub)" }}>{fmtDate(p.fecha)}</span>
                  <span className="num" style={{ fontWeight: 600, width: 110 }}>{p.monto != null ? fmtMoney(num(p.monto)) : "—"}</span>
                  <span style={{ flex: "1 1 160px", minWidth: 0, color: "var(--sub)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {cubre.length ? cubre.map(c => c.asegurado || "Sin nombre").join(", ") : "Sin casos vinculados"}{p.nota ? ` · ${p.nota}` : ""}
                  </span>
                  <Boton tamaño="sm" icono="externo" onClick={() => ver(p)} disabled={!p.archivo}>Ver</Boton>
                  <Boton tamaño="sm" variante="fantasma" icono="papelera" onClick={() => quitar(p)} aria-label="Borrar comprobante" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
