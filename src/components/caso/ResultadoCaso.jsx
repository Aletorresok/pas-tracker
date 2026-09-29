import { useEffect, useState } from "react";
import { fmtMoney, fmtDate, fechaLocalISO } from "../../utils/formatters.js";
import { cargarGastosDe, guardarGasto, resultadoDeCaso, hayRecuperables, CATEGORIAS_GASTO, categoria, RECUPERAR_DE, recuperarDe } from "../../utils/finanzas.js";
import CampoMonto from "../ui/CampoMonto.jsx";
import Boton from "../ui/Boton.jsx";

const NUEVO = { categoria: "mediaciones", monto: "", descripcion: "", recuperable: false, recuperar_de: "cliente" };

// Montos → "Resultado del caso": honorarios − comisión del PAS − gastos del caso (+ lo ya recuperado).
// Los gastos se cargan acá o en Finanzas → Gastos eligiendo el caso. Recuperables: SQL 36.
export default function ResultadoCaso({ caso, formData, setToast, Th }) {
  const [gastos, setGastos] = useState(undefined); // undefined = cargando, null = sin tabla gastos (SQL 28)
  const [conRecuperables, setConRecuperables] = useState(false);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const recargar = () => cargarGastosDe({ casoId: caso.id }).then(setGastos);
  useEffect(() => { recargar(); hayRecuperables().then(setConRecuperables); }, [caso.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (gastos === undefined || gastos === null) return null;
  const r = resultadoDeCaso({ ...caso, ...formData }, gastos);

  const guardar = async () => {
    if (!(Number(form.monto) > 0)) { setToast({ msg: "Poné el monto del gasto", type: "error" }); return; }
    setGuardando(true);
    const fila = { fecha: fechaLocalISO(), categoria: form.categoria, monto: Number(form.monto), descripcion: form.descripcion.trim(), caso_id: caso.id,
      ...(conRecuperables ? { recuperable: form.recuperable, recuperar_de: form.recuperable ? form.recuperar_de : null } : {}) };
    const ok = await guardarGasto(fila);
    setGuardando(false);
    if (!ok) { setToast({ msg: "No se pudo guardar el gasto", type: "error" }); return; }
    setForm(null); recargar();
  };
  const marcarRecuperado = async g => {
    const ok = await guardarGasto({ id: g.id, recuperado_en: g.recuperado_en ? null : fechaLocalISO() });
    if (!ok) { setToast({ msg: "No se pudo guardar", type: "error" }); return; }
    recargar();
  };

  const fila = { display: "grid", gridTemplateColumns: "18px minmax(0, 1fr) auto", gap: 10, alignItems: "center", padding: "8px 0", borderTop: `1px solid ${Th.border}`, fontSize: 14 };
  const signo = { color: Th.muted, textAlign: "center", fontVariantNumeric: "tabular-nums" };
  const campo = { ...Th.input, padding: "8px 10px" };

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: Th.text }}>Resultado del caso</div>
        {!form && <Boton tamaño="sm" icono="agregar" onClick={() => setForm({ ...NUEVO })}>Gasto</Boton>}
      </div>
      <div className="num">
        <div style={{ ...fila, borderTop: "none" }}><span style={signo}>+</span><span>Mis honorarios</span><b>{fmtMoney(r.honorarios)}</b></div>
        <div style={fila}><span style={signo}>−</span><span>Comisión del PAS</span><span>{fmtMoney(r.comision)}</span></div>
        {gastos.map(g => (
          <div key={g.id} style={fila}>
            <span style={signo}>−</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ overflowWrap: "anywhere" }}>{g.descripcion || categoria(g.categoria).l}</span>
              <span style={{ display: "block", fontSize: 12, color: Th.muted }}>
                {[categoria(g.categoria).l, fmtDate(g.fecha), g.recuperable && (g.recuperado_en ? `recuperado el ${fmtDate(g.recuperado_en)}` : `se recupera ${recuperarDe(g.recuperar_de).toLowerCase()}`)].filter(Boolean).join(" · ")}
              </span>
              {g.recuperable && (
                <button type="button" onClick={() => marcarRecuperado(g)} style={{ marginTop: 4, background: "none", border: `1px solid ${Th.border}`, borderRadius: "var(--r-pill)", color: g.recuperado_en ? Th.sub : "var(--ok)", fontSize: 12, fontWeight: 600, padding: "2px 10px", cursor: "pointer" }}>
                  {g.recuperado_en ? "Deshacer recuperado" : "Marcar recuperado"}
                </button>
              )}
            </span>
            <span style={{ textDecoration: g.recuperado_en ? "line-through" : "none", color: g.recuperado_en ? Th.muted : Th.text }}>{fmtMoney(Number(g.monto))}</span>
          </div>
        ))}
        <div style={{ ...fila, borderTop: `2px solid ${Th.border}` }}>
          <span style={signo}>=</span><b>Neto del caso</b>
          <b style={{ fontSize: 17, color: r.neto >= 0 ? "var(--ok)" : "var(--bad)" }}>{fmtMoney(r.neto)}</b>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12.5, color: Th.muted, marginTop: 4 }}>
        {r.porRecuperar > 0 && <span style={{ color: "var(--warn)", fontWeight: 600 }}>Por recuperar: {fmtMoney(r.porRecuperar)}</span>}
        {r.dias !== null && <span>{r.dias} días desde la derivación hasta el cobro de tus honorarios</span>}
        {!gastos.length && <span>Sin gastos cargados en este caso (mediación, cartas, sellados…).</span>}
      </div>

      {form && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${Th.border}`, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <label><span style={{ display: "block", fontSize: 12, color: Th.sub, marginBottom: 4 }}>Categoría</span>
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={campo}>{CATEGORIAS_GASTO.map(c => <option key={c.k} value={c.k}>{c.l}</option>)}</select>
          </label>
          <label><span style={{ display: "block", fontSize: 12, color: Th.sub, marginBottom: 4 }}>Monto</span>
            <CampoMonto id="gasto-caso-monto" value={form.monto} onChange={v => setForm(f => ({ ...f, monto: v }))} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}><span style={{ display: "block", fontSize: 12, color: Th.sub, marginBottom: 4 }}>Detalle (opcional)</span>
            <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Honorarios del mediador" style={campo} />
          </label>
          {conRecuperables && <>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: Th.sub }}>
              <input type="checkbox" checked={form.recuperable} onChange={e => setForm(f => ({ ...f, recuperable: e.target.checked }))} style={{ accentColor: "var(--accent)" }} />
              Se recupera
            </label>
            {form.recuperable && (
              <select value={form.recuperar_de} onChange={e => setForm(f => ({ ...f, recuperar_de: e.target.value }))} style={campo} aria-label="De quién se recupera">
                {RECUPERAR_DE.map(x => <option key={x.k} value={x.k}>{x.l}</option>)}
              </select>
            )}
          </>}
          <div style={{ display: "flex", gap: 8, gridColumn: "1 / -1" }}>
            <Boton tamaño="sm" variante="primario" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar gasto"}</Boton>
            <Boton tamaño="sm" variante="fantasma" onClick={() => setForm(null)}>Cancelar</Boton>
          </div>
        </div>
      )}
    </div>
  );
}
