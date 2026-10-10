import { useEffect, useMemo, useState } from "react";
import { fmtMoney, fmtDate, fechaLocalISO } from "../../utils/formatters.js";
import { CATEGORIAS_GASTO, categoria, gastosDelMes, guardarGasto, borrarGasto, hayRecuperables, RECUPERAR_DE, recuperarDe } from "../../utils/finanzas.js";
import CampoMonto from "../ui/CampoMonto.jsx";
import Boton from "../ui/Boton.jsx";
import BotoneraForm from "../ui/BotoneraForm.jsx";
import { nombreMes } from "./ResumenMes.jsx";

const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" };
const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sub)", marginBottom: 4 };
const campo = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 };

// Atajos para cargar los gastos fijos de siempre: quedan como "se repite todos los meses" y solo falta el monto
const FIJOS = [
  { categoria: "matricula", descripcion: "Matrícula" },
  { categoria: "software", descripcion: "Suscripción a Claude" },
];

const etiquetaCaso = c => `${c.asegurado || "Sin nombre"}${c.patente ? ` · ${c.patente}` : ""}`;

// Gastos del mes (los recurrentes aparecen todos los meses) con alta, edición y baja
export default function Gastos({ gastos, mes, allCasos, onCambio, setToast }) {
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [conRecuperables, setConRecuperables] = useState(false); // SQL 36
  useEffect(() => { hayRecuperables().then(setConRecuperables); }, []);
  const delMes = gastosDelMes(gastos, mes).sort((a, b) => (a.recurrente === b.recurrente ? String(b.fecha).localeCompare(String(a.fecha)) : a.recurrente ? -1 : 1));
  const total = delMes.reduce((s, g) => s + (Number(g.monto) || 0), 0);
  const porId = useMemo(() => Object.fromEntries(allCasos.map(c => [c.id, c])), [allCasos]);
  const opcionesCaso = useMemo(() => [...allCasos].sort((a, b) => String(a.asegurado || "").localeCompare(String(b.asegurado || ""))), [allCasos]);

  const hoy = fechaLocalISO();
  const nuevo = (extra = {}) => setForm({ fecha: mes === hoy.slice(0, 7) ? hoy : `${mes}-01`, categoria: "otros", descripcion: "", monto: "", recurrente: false, hasta: "", caso_id: "", casoTexto: "", ...extra });
  // Atajos que todavía no están cargados como gasto fijo
  const fijosFaltantes = FIJOS.filter(f => !gastos.some(g => g.recurrente && g.categoria === f.categoria && String(g.descripcion || "").toLowerCase() === f.descripcion.toLowerCase()));
  const editar = g => setForm({ ...g, hasta: g.hasta || "", caso_id: g.caso_id || "", casoTexto: g.caso_id && porId[g.caso_id] ? etiquetaCaso(porId[g.caso_id]) : "" });

  const elegirCaso = texto => {
    const c = opcionesCaso.find(x => etiquetaCaso(x) === texto);
    setForm(f => ({ ...f, casoTexto: texto, caso_id: c ? c.id : "" }));
  };

  const guardar = async () => {
    if (!(Number(form.monto) > 0)) return setToast({ msg: "Poné el monto", type: "error" });
    if (!form.fecha) return setToast({ msg: "Poné la fecha", type: "error" });
    if (form.recurrente && form.hasta && form.hasta < form.fecha) return setToast({ msg: "El \"hasta\" tiene que ser después de la fecha", type: "error" });
    setGuardando(true);
    const { recuperable, recuperar_de, recuperado_en, ...resto } = form;
    const recup = conRecuperables ? { recuperable: !!recuperable, recuperar_de: recuperable ? recuperar_de || "cliente" : null, recuperado_en: recuperable ? recuperado_en || null : null } : {};
    const ok = await guardarGasto({ ...resto, ...recup, monto: Number(form.monto), descripcion: form.descripcion.trim(), hasta: form.recurrente ? form.hasta : "", caso_id: form.caso_id || null });
    setGuardando(false);
    if (!ok) return setToast({ msg: "No se pudo guardar el gasto", type: "error" });
    setForm(null);
    onCambio();
  };

  const borrar = async () => {
    if (!confirm(form.recurrente ? "¿Borrar este gasto fijo? Deja de contar en todos los meses. Si solo terminó, mejor poné hasta cuándo." : "¿Borrar este gasto?")) return;
    if (await borrarGasto(form.id)) { setForm(null); onCambio(); }
  };

  return (
    <section style={{ ...tarjeta, padding: "12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Gastos · {nombreMes(mes)}</h2>
        <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <b className="num" style={{ fontSize: 14 }}>{fmtMoney(total)}</b>
          <Boton tamaño="sm" variante="primario" icono="agregar" onClick={() => nuevo()}>Gasto</Boton>
        </span>
      </div>
      {!delMes.length && <div style={{ fontSize: 13, color: "var(--muted)", padding: "10px 0 2px" }}>Sin gastos cargados en este mes. Los fijos (matrícula, aportes, software) cargalos una vez como "se repite todos los meses".</div>}
      {!form && fijosFaltantes.length > 0 && (
        <div className="chips" style={{ alignItems: "center", padding: "8px 0 4px", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Gasto fijo:</span>
          {fijosFaltantes.map(f => (
            <button key={f.descripcion} type="button" className="chip" onClick={() => nuevo({ ...f, recurrente: true, fecha: `${mes}-01` })}>+ {f.descripcion}</button>
          ))}
        </div>
      )}
      {delMes.map(g => {
        const c = g.caso_id ? porId[g.caso_id] : null;
        return (
          <button key={g.id} type="button" onClick={() => editar(g)}
            style={{ display: "flex", width: "100%", gap: 10, alignItems: "center", padding: "10px 0", background: "none", border: "none", borderTop: "1px solid var(--border)", font: "inherit", color: "var(--text)", cursor: "pointer", textAlign: "left" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 600, overflowWrap: "anywhere" }}>{g.descripcion || categoria(g.categoria).l}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>
                {[categoria(g.categoria).l, g.recurrente ? `todos los meses${g.hasta ? ` hasta ${nombreMes(g.hasta.slice(0, 7)).toLowerCase()}` : ""}` : fmtDate(g.fecha), c && `caso ${c.asegurado || ""}`].filter(Boolean).join(" · ")}
              </span>
              {g.recuperable && (
                <span style={{ display: "inline-block", marginTop: 3, fontSize: 11.5, fontWeight: 600, padding: "1px 8px", borderRadius: "var(--r-pill)", background: `color-mix(in srgb, ${g.recuperado_en ? "var(--ok)" : "var(--warn)"} 14%, transparent)`, color: g.recuperado_en ? "var(--ok)" : "var(--warn)" }}>
                  {g.recuperado_en ? `Recuperado ${fmtDate(g.recuperado_en)}` : `Se recupera ${recuperarDe(g.recuperar_de).toLowerCase()}`}
                </span>
              )}
            </span>
            <b className="num" style={{ fontSize: 14, whiteSpace: "nowrap" }}>{fmtMoney(Number(g.monto))}</b>
          </button>
        );
      })}

      {form && (
        <div role="dialog" aria-modal="true" aria-label={form.id ? "Editar gasto" : "Nuevo gasto"} onClick={e => e.target === e.currentTarget && setForm(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16, overflowY: "auto" }}>
          <div style={{ ...tarjeta, width: "100%", maxWidth: 460, padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, gridColumn: "1 / -1" }}>{form.id ? "Editar gasto" : "Nuevo gasto"}</div>
            <label><span style={etiqueta}>Categoría</span>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={campo}>
                {CATEGORIAS_GASTO.map(c => <option key={c.k} value={c.k}>{c.l}</option>)}
              </select>
            </label>
            <label><span style={etiqueta}>Monto</span>
              <CampoMonto value={form.monto} onChange={v => setForm(f => ({ ...f, monto: v }))} />
            </label>
            <label style={{ gridColumn: "1 / -1" }}><span style={etiqueta}>Detalle (opcional)</span>
              <input value={form.descripcion || ""} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Cuota CPACF, carta documento a La Segunda" style={campo} />
            </label>
            <label><span style={etiqueta}>{form.recurrente ? "Desde" : "Fecha"}</span>
              <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={campo} />
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--sub)", alignSelf: "end", paddingBottom: 8 }}>
              <input type="checkbox" checked={!!form.recurrente} onChange={e => setForm(f => ({ ...f, recurrente: e.target.checked }))} style={{ accentColor: "var(--accent)" }} />
              Se repite todos los meses
            </label>
            {form.recurrente && (
              <label style={{ gridColumn: "1 / -1" }}><span style={etiqueta}>Hasta (vacío = sigue)</span>
                <input type="date" value={form.hasta || ""} onChange={e => setForm(f => ({ ...f, hasta: e.target.value }))} style={campo} />
              </label>
            )}
            <label style={{ gridColumn: "1 / -1" }}><span style={etiqueta}>Caso (opcional, para ver la ganancia neta del caso)</span>
              <input value={form.casoTexto} onChange={e => elegirCaso(e.target.value)} list="casos-gasto" placeholder="Escribí el asegurado o la patente" style={campo} />
              <datalist id="casos-gasto">{opcionesCaso.map(c => <option key={c.id} value={etiquetaCaso(c)} />)}</datalist>
              {form.casoTexto && !form.caso_id && <span style={{ fontSize: 12, color: "var(--warn)" }}>Elegí un caso de la lista (o dejalo vacío).</span>}
            </label>
            {conRecuperables && <>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--sub)" }}>
                <input type="checkbox" checked={!!form.recuperable} onChange={e => setForm(f => ({ ...f, recuperable: e.target.checked }))} style={{ accentColor: "var(--accent)" }} />
                Se recupera (lo paga otro después)
              </label>
              {form.recuperable ? (
                <select value={form.recuperar_de || "cliente"} onChange={e => setForm(f => ({ ...f, recuperar_de: e.target.value }))} style={campo} aria-label="De quién se recupera">
                  {RECUPERAR_DE.map(x => <option key={x.k} value={x.k}>{x.l}</option>)}
                </select>
              ) : <span />}
              {form.recuperable && (
                <label style={{ gridColumn: "1 / -1" }}><span style={etiqueta}>Recuperado el (vacío = todavía no)</span>
                  <input type="date" value={form.recuperado_en || ""} onChange={e => setForm(f => ({ ...f, recuperado_en: e.target.value }))} style={campo} />
                </label>
              )}
            </>}
            <BotoneraForm onBorrar={form.id && borrar} onCancelar={() => setForm(null)} onGuardar={guardar} guardando={guardando} deshabilitado={form.casoTexto && !form.caso_id}
              style={{ gridColumn: "1 / -1" }} />
          </div>
        </div>
      )}
    </section>
  );
}
