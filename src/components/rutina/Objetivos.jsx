import { useState, useEffect } from "react";
import { PERIODOS, METRICAS, metrica, rangoPeriodo, evaluar, formatoValor, guardarObjetivo, borrarObjetivo } from "../../utils/objetivos.js";
import Boton from "../ui/Boton.jsx";
import { Anillo, COLOR_NIVEL, tarjeta, campo, etiqueta } from "./comunes.jsx";

function FormObjetivo({ inicial, onGuardar, onCancelar }) {
  const [o, setO] = useState(inicial);
  const m = metrica(o.metrica);
  const listo = o.titulo.trim() && (!o.metrica || Number(o.meta) > 0);
  return (
    <div style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 10, borderColor: "var(--accent)" }}>
      <label><span style={etiqueta}>Objetivo</span>
        <input value={o.titulo} onChange={e => setO({ ...o, titulo: e.target.value })} placeholder="Ej: sumar 5 PAS que deriven" style={campo} autoFocus /></label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <label><span style={etiqueta}>Cómo se mide</span>
          <select value={o.metrica} onChange={e => setO({ ...o, metrica: e.target.value, titulo: o.titulo || (e.target.value ? metrica(e.target.value).l : "") })} style={campo}>
            <option value="">Lo tildo a mano</option>
            {METRICAS.map(x => <option key={x.k} value={x.k}>{x.l}</option>)}
          </select></label>
        {o.metrica && (
          <label><span style={etiqueta}>Meta{m.sentido === "bajar" ? " (como máximo)" : ""}{m.unidad ? ` en ${m.unidad}` : m.dinero ? " en $" : ""}</span>
            <input type="number" min="0" value={o.meta} onChange={e => setO({ ...o, meta: e.target.value })} style={campo} /></label>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Boton tamaño="sm" variante="primario" onClick={() => onGuardar(o)} disabled={!listo}>Guardar</Boton>
        <Boton tamaño="sm" variante="fantasma" onClick={onCancelar}>Cancelar</Boton>
      </div>
    </div>
  );
}

function Tarjeta({ o, ctx, onEditar, onBorrar, onTildar }) {
  const [confirmar, setConfirmar] = useState(false);
  const [hecho, setHecho] = useState(o.hecho);
  useEffect(() => setHecho(o.hecho), [o.hecho]);
  const tildar = async v => { setHecho(v); if (!(await onTildar(v))) setHecho(!v); };
  const acciones = (
    <div style={{ display: "flex", gap: 10 }}>
      <button type="button" onClick={onEditar} style={{ background: "none", border: "none", padding: 0, color: "var(--sub)", cursor: "pointer", fontSize: 12 }}>Editar</button>
      <button type="button" onClick={() => (confirmar ? onBorrar() : setConfirmar(true))} onBlur={() => setConfirmar(false)}
        style={{ background: "none", border: "none", padding: 0, color: confirmar ? "var(--bad)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: confirmar ? 600 : 400 }}>{confirmar ? "¿Borrar?" : "Borrar"}</button>
    </div>
  );
  if (!o.metrica) {
    return (
      <div style={{ ...tarjeta, display: "flex", gap: 12, alignItems: "center" }}>
        <input type="checkbox" checked={hecho} onChange={e => tildar(e.target.checked)} aria-label={o.titulo} style={{ width: 22, height: 22, accentColor: "var(--ok)", flex: "none" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, textDecoration: hecho ? "line-through" : "none", color: hecho ? "var(--muted)" : "var(--text)" }}>{o.titulo}</div>
          <div style={{ fontSize: 12, color: hecho ? "var(--ok)" : "var(--muted)" }}>{hecho ? "¡Hecho!" : "Se tilda a mano"}</div>
        </div>
        {acciones}
      </div>
    );
  }
  const m = metrica(o.metrica);
  const r = evaluar(o, ctx);
  return (
    <div style={{ ...tarjeta, display: "flex", gap: 14, alignItems: "center" }}>
      <Anillo avance={r.avance} esperado={r.esperado} nivel={r.nivel} centro={r.valor === null ? "—" : `${Math.round(r.avance * 100)}%`} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{o.titulo}</div>
        <div className="num" style={{ fontSize: 13, color: "var(--sub)" }}>
          <b style={{ color: COLOR_NIVEL[r.nivel] }}>{formatoValor(m, r.valor)}</b> de {formatoValor(m, r.meta)}{m.sentido === "bajar" ? " (máximo)" : ""}
        </div>
        <div style={{ fontSize: 13, color: "var(--text)" }}>{r.frase}</div>
        {r.esperado !== null && r.valor !== null && r.valor < r.meta && (
          <div className="num" style={{ fontSize: 12, color: "var(--muted)" }}>A esta altura deberías ir por {formatoValor(m, r.meta * r.esperado)}.</div>
        )}
        {acciones}
      </div>
    </div>
  );
}

// Objetivos del mes, trimestre, semestre y año en curso
export default function Objetivos({ objetivos, ctx, onCambio }) {
  const [editando, setEditando] = useState(null); // { periodo, obj? }

  const guardar = async o => { if (await guardarObjetivo(o)) { setEditando(null); onCambio(); } };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
      <div style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.5 }}>
        Los objetivos medibles se calculan solos con los datos de la app. La rayita en el anillo marca dónde deberías estar hoy: <b style={{ color: "var(--ok)" }}>verde</b> si vas a tiempo, <b style={{ color: "var(--warn)" }}>naranja</b> si vas un poco atrás, <b style={{ color: "var(--bad)" }}>rojo</b> si vas muy atrás.
      </div>
      {PERIODOS.map(p => {
        const { desde, nombre } = rangoPeriodo(p.k, ctx.hoy);
        const lista = objetivos.filter(o => o.periodo === p.k && o.inicio === desde);
        return (
          <section key={p.k} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{p.l} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>· {nombre}</span></h2>
              {editando?.periodo !== p.k && <Boton tamaño="sm" variante="fantasma" onClick={() => setEditando({ periodo: p.k })}>+ Objetivo</Boton>}
            </div>
            {editando?.periodo === p.k && !editando.obj && (
              <FormObjetivo inicial={{ periodo: p.k, inicio: desde, titulo: "", metrica: "", meta: "" }} onGuardar={guardar} onCancelar={() => setEditando(null)} />
            )}
            {!lista.length && editando?.periodo !== p.k && <div style={{ fontSize: 13, color: "var(--muted)" }}>Sin objetivos.</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
              {lista.map(o => editando?.obj?.id === o.id
                ? <FormObjetivo key={o.id} inicial={{ ...o, metrica: o.metrica || "", meta: o.meta ?? "" }} onGuardar={guardar} onCancelar={() => setEditando(null)} />
                : <Tarjeta key={o.id} o={o} ctx={ctx} onEditar={() => setEditando({ periodo: p.k, obj: o })}
                    onBorrar={async () => { if (await borrarObjetivo(o.id)) onCambio(); }}
                    onTildar={async hecho => { const ok = await guardarObjetivo({ ...o, hecho }); if (ok) onCambio(); return ok; }} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
