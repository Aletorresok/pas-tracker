import { useState } from "react";
import { PERIODOS, METRICAS, metrica, rangoPeriodo, nombrePeriodo, avanceObjetivo, formatoValor, guardarObjetivo, borrarObjetivo } from "../../utils/objetivos.js";
import { fechaLocalISO } from "../../utils/formatters.js";
import Boton from "../ui/Boton.jsx";
import BotoneraForm from "../ui/BotoneraForm.jsx";
import Icono from "../ui/Icono.jsx";
import AnilloObjetivo, { COLOR_NIVEL } from "./AnilloObjetivo.jsx";

const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sub)", marginBottom: 4 };
const campo = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 };
const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" };

export function TarjetaObjetivo({ obj, datos, onTildar, onEditar, compacto }) {
  const a = obj.metrica ? avanceObjetivo(obj, datos) : null;
  const manual = !obj.metrica;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: compacto ? 0 : "10px 0" }}>
      {manual
        ? <AnilloObjetivo pct={obj.hecho ? 100 : 0} nivel={obj.hecho ? "hecho" : "sin"} size={compacto ? 44 : 56}>{obj.hecho ? <Icono nombre="check" size={18} /> : ""}</AnilloObjetivo>
        : <AnilloObjetivo pct={a.pct} esperadoPct={a.esperadoPct} nivel={a.nivel} size={compacto ? 44 : 56} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", overflowWrap: "anywhere" }}>{obj.titulo}</div>
        {manual
          ? <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--sub)", cursor: "pointer", marginTop: 2 }}>
              <input type="checkbox" checked={!!obj.hecho} onChange={e => onTildar?.(obj, e.target.checked)} style={{ accentColor: "var(--accent)" }} />
              {obj.hecho ? "Cumplido" : "Tildalo cuando lo cumplas"}
            </label>
          : <>
              <div className="num" style={{ fontSize: 13, color: "var(--sub)" }}>
                <b style={{ color: COLOR_NIVEL[a.nivel] }}>{formatoValor(a.m, a.valor)}</b> de {formatoValor(a.m, a.meta)}
                {a.m.sentido === "bajar" || obj.sentido === "bajar" ? " (meta a la baja)" : ""}
              </div>
              {!compacto && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{a.frase}</div>}
            </>}
      </div>
      {onEditar && <Boton tamaño="sm" variante="fantasma" onClick={() => onEditar(obj)}>Editar</Boton>}
    </div>
  );
}

// Objetivos del período actual de cada tipo (mes, trimestre, semestre y año)
export default function ObjetivosPanel({ objetivos, datos, onCambio, setToast }) {
  const hoy = fechaLocalISO();
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const nuevo = periodo => setForm({ periodo, inicio: rangoPeriodo(periodo, hoy).inicio, titulo: "", metrica: "", meta: "", sentido: "subir" });

  const guardar = async () => {
    if (!form.titulo.trim()) return setToast?.({ msg: "Poné un título", type: "error" });
    if (form.metrica && !(Number(form.meta) > 0)) return setToast?.({ msg: "Poné la meta (un número)", type: "error" });
    setGuardando(true);
    const m = metrica(form.metrica);
    const ok = await guardarObjetivo({ ...form, titulo: form.titulo.trim(), metrica: form.metrica || null, meta: form.metrica ? Number(form.meta) : null, sentido: m?.sentido || "subir" });
    setGuardando(false);
    if (!ok) return setToast?.({ msg: "No se pudo guardar el objetivo", type: "error" });
    setForm(null);
    onCambio();
  };

  const borrar = async () => {
    if (!confirm(`¿Borrar el objetivo "${form.titulo}"?`)) return;
    if (await borrarObjetivo(form.id)) { setForm(null); onCambio(); }
  };

  const tildar = async (obj, hecho) => { if (await guardarObjetivo({ id: obj.id, hecho })) onCambio(); };

  const elegirMetrica = k => {
    const m = metrica(k);
    setForm(f => ({ ...f, metrica: k, titulo: f.titulo || (m ? m.l : "") }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 13, color: "var(--muted)" }}>
        El anillo muestra cuánto llevás; la rayita, dónde deberías estar hoy. Verde: vas a tiempo · naranja: un poco atrás · rojo: muy atrás.
      </div>
      {PERIODOS.slice().reverse().map(p => {
        const { inicio } = rangoPeriodo(p.k, hoy);
        const lista = objetivos.filter(o => o.periodo === p.k && o.inicio === inicio);
        return (
          <section key={p.k} style={{ ...tarjeta, padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{nombrePeriodo(p.k, inicio)}</h2>
              <Boton tamaño="sm" icono="agregar" onClick={() => nuevo(p.k)}>Objetivo</Boton>
            </div>
            {!lista.length && <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0 2px" }}>Sin objetivos para este {p.l.toLowerCase()}.</div>}
            {lista.map((o, i) => (
              <div key={o.id} style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
                <TarjetaObjetivo obj={o} datos={datos} onTildar={tildar} onEditar={x => setForm({ ...x, meta: x.meta ?? "", metrica: x.metrica || "" })} />
              </div>
            ))}
          </section>
        );
      })}

      {form && (
        <div role="dialog" aria-modal="true" aria-label={form.id ? "Editar objetivo" : "Nuevo objetivo"} onClick={e => e.target === e.currentTarget && setForm(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ ...tarjeta, width: "100%", maxWidth: 440, padding: 20, display: "flex", flexDirection: "column", gap: 12, boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{form.id ? "Editar objetivo" : `Nuevo objetivo · ${nombrePeriodo(form.periodo, form.inicio)}`}</div>
            <label><span style={etiqueta}>Cómo se mide</span>
              <select value={form.metrica} onChange={e => elegirMetrica(e.target.value)} style={campo}>
                <option value="">Lo tildo a mano</option>
                {METRICAS.map(m => <option key={m.k} value={m.k}>{m.l}{m.sentido === "bajar" ? " (menos es mejor)" : ""}</option>)}
              </select>
            </label>
            <label><span style={etiqueta}>Objetivo</span>
              <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Sumar 5 PAS que deriven" style={campo} />
            </label>
            {form.metrica && (
              <label><span style={etiqueta}>Meta {metrica(form.metrica)?.dinero ? "($)" : metrica(form.metrica)?.unidad ? `(${metrica(form.metrica).unidad})` : ""}</span>
                <input type="number" inputMode="decimal" min="0" value={form.meta} onChange={e => setForm(f => ({ ...f, meta: e.target.value }))} style={campo} />
              </label>
            )}
            <BotoneraForm onBorrar={form.id && borrar} onCancelar={() => setForm(null)} onGuardar={guardar} guardando={guardando} />
          </div>
        </div>
      )}
    </div>
  );
}
