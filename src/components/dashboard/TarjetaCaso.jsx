import { useState } from "react";
import { describirPlazo, fechaLocalISO, sumarDias, fmtMoney } from "../../utils/formatters.js";
import { propsMenu } from "../ui/MenuContextual.jsx";
import Boton from "../ui/Boton.jsx";

const NIVEL = { vencido: "var(--bad)", hoy: "var(--warn)", pronto: "var(--warn)", tranquilo: "var(--info)" };
const PLAZOS = [["Mañana", 1], ["3 d", 3], ["7 d", 7], ["14 d", 14]];
const campo = { boxSizing: "border-box", padding: "8px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 };
// Lo de adentro (botones, campos) no abre la tarjeta ni empieza a arrastrarla
const aislar = { onClick: e => e.stopPropagation(), onPointerDown: e => e.stopPropagation(), onKeyDown: e => e.stopPropagation() };

function ChipsPlazo({ valor, onElegir }) {
  const hoy = fechaLocalISO();
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {PLAZOS.map(([l, d]) => {
        const f = sumarDias(hoy, d);
        return <button key={l} type="button" className="chip" aria-pressed={valor === f} onClick={() => onElegir(f)}>{l}</button>;
      })}
      <input type="date" value={valor || ""} onChange={e => onElegir(e.target.value || null)} aria-label="Fecha" style={{ ...campo, padding: "5px 8px", fontSize: 13 }} />
    </div>
  );
}

// Un caso (o expediente) con todos sus pendientes. Con caso: "Hecho" (la acción va a la bitácora y se carga la próxima)
// y "Posponer" (corre el plazo de la próxima acción). Tocar la tarjeta abre la ficha; click derecho, el menú del caso.
export default function TarjetaCaso({ grupo, chip, tipos, menu, onAbrir, onHecho, onPosponer, onReiterar, dragging, dragProps }) {
  const [modo, setModo] = useState(null); // null | "hecho" | "posponer"
  const [nueva, setNueva] = useState("");
  const [vence, setVence] = useState(sumarDias(fechaLocalISO(), 7));
  const [guardando, setGuardando] = useState(false);
  const { caso } = grupo;
  const p = grupo.vence ? describirPlazo(grupo.vence) : null;
  const tieneAccion = !!caso?.proxima_accion?.trim();
  const quieto = grupo.tareas.some(t => t.tipo === "quieto");
  const monto = grupo.tareas.find(t => t.monto)?.monto;

  const correr = async fn => { setGuardando(true); const ok = await fn(); setGuardando(false); if (ok) setModo(null); };
  const guardarHecho = sinNueva => correr(() => onHecho(caso, sinNueva ? {} : { nueva, vence: nueva.trim() ? vence : null }));

  return (
    <div className="tc" data-dragging={dragging} style={{ "--nivel": p ? NIVEL[p.nivel] : "var(--muted)", alignItems: "start" }}
      onClick={() => !modo && onAbrir(grupo)} {...dragProps} {...(menu ? propsMenu(menu) : {})}
      onKeyDown={e => { if (e.key === "Enter" && e.target === e.currentTarget) onAbrir(grupo); dragProps?.onKeyDown?.(e); }}>
      <span className="tc-asa" aria-hidden="true" style={{ marginTop: 4 }}>
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          {[2, 8, 14].flatMap(y => [2, 8].map(x => <circle key={`${x}${y}`} cx={x} cy={y} r="1.4" />))}
        </svg>
      </span>

      <div style={{ minWidth: 0, gridColumn: "2 / -1" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {chip || <span className="tc-chip num">{p ? p.texto : "Sin plazo"}</span>}
          {monto ? <span className="num" style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700 }}>{fmtMoney(monto)}</span> : null}
        </div>
        <div style={{ fontSize: 15, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{grupo.titulo}</div>
        <ul style={{ listStyle: "none", margin: "2px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {grupo.tareas.map(t => (
            <li key={t.id} style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.45, overflowWrap: "anywhere" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>{tipos[t.tipo] || "Tarea"}</span> · {t.detalle}
            </li>
          ))}
        </ul>

        {caso && !modo && (
          <div {...aislar} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <Boton tamaño="sm" icono="check" onClick={() => { setNueva(""); setModo("hecho"); }}>{tieneAccion ? "Hecho" : "Cargar próxima acción"}</Boton>
            {tieneAccion && <Boton tamaño="sm" variante="fantasma" onClick={() => setModo("posponer")}>Posponer</Boton>}
            {quieto && onReiterar && <Boton tamaño="sm" variante="fantasma" disabled={guardando} onClick={() => correr(() => onReiterar(caso))}>{guardando ? "Guardando…" : "Reiteré hoy"}</Boton>}
          </div>
        )}

        {modo === "hecho" && (
          <div {...aislar} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            {tieneAccion && <div style={{ fontSize: 12, color: "var(--muted)" }}>"{caso.proxima_accion.trim()}" queda en la bitácora como hecho.</div>}
            <input autoFocus value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Próxima acción (ej.: Reiterar el reclamo)" aria-label="Próxima acción"
              onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter" && nueva.trim()) guardarHecho(false); if (e.key === "Escape") setModo(null); }} style={campo} />
            <ChipsPlazo valor={vence} onElegir={setVence} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Boton tamaño="sm" variante="primario" disabled={guardando || !nueva.trim()} onClick={() => guardarHecho(false)}>{guardando ? "Guardando…" : "Guardar"}</Boton>
              {tieneAccion && <Boton tamaño="sm" variante="fantasma" disabled={guardando} onClick={() => guardarHecho(true)}>Hecho, sin nueva acción</Boton>}
              <Boton tamaño="sm" variante="fantasma" onClick={() => setModo(null)}>Cancelar</Boton>
            </div>
          </div>
        )}

        {modo === "posponer" && (
          <div {...aislar} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Correr "{caso.proxima_accion.trim()}" a:</div>
            <ChipsPlazo valor={null} onElegir={f => f && correr(() => onPosponer(caso, f))} />
            <div><Boton tamaño="sm" variante="fantasma" onClick={() => setModo(null)}>Cancelar</Boton></div>
          </div>
        )}
      </div>
    </div>
  );
}
