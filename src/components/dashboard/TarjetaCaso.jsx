import { useRef, useState } from "react";
import { describirPlazo, fechaLocalISO, sumarDias, fmtMoney, primerNombre, nombrePropio } from "../../utils/formatters.js";
import { propsMenu } from "../ui/MenuContextual.jsx";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";
import { linkWhatsApp } from "../../utils/mensajes.js";

const NIVEL = { vencido: "var(--bad)", hoy: "var(--warn)", pronto: "var(--warn)", tranquilo: "var(--info)" };
// Avisos que se callan mientras el caso tenga una próxima acción con plazo vigente (metricas.js: tareasPendientes)
const AVISOS = new Set(["quieto", "pedir_respuesta", "firma", "cobro"]);
const PLAZOS = [["Mañana", 1], ["3 d", 3], ["7 d", 7], ["14 d", 14]];
const campo = { boxSizing: "border-box", padding: "8px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 };
// Lo de adentro (botones, campos) no abre la tarjeta
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

// Un caso (o expediente) con todos sus pendientes, en una fila: tilde, quién, qué hay que hacer, plazo y acciones.
// El tilde marca "Hecho" (la acción va a la bitácora y se carga la próxima) y "Posponer" corre el plazo de la próxima acción;
// con expediente, solo si tiene próxima acción. Tocar la fila abre la ficha; click derecho, el menú del caso.
export default function TarjetaCaso({ grupo, chip, tipos, menu, onAbrir, onHecho, onPosponer, onReiterar }) {
  const [modo, setModo] = useState(null); // null | "hecho" | "posponer"
  const [nueva, setNueva] = useState("");
  const [vence, setVence] = useState(sumarDias(fechaLocalISO(), 7));
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);
  const { caso, expediente } = grupo;
  const sujeto = caso || expediente; // a quién se le guarda la próxima acción
  const esExp = !caso && !!expediente;
  const p = grupo.vence ? describirPlazo(grupo.vence) : null;
  const tieneAccion = !!sujeto?.proxima_accion?.trim();
  const quieto = grupo.tareas.some(t => t.tipo === "quieto");
  const monto = grupo.tareas.find(t => t.monto)?.monto;
  // Con avisos, "Hecho" pide una próxima acción con fecha: sin ella el aviso vuelve enseguida y la fila no se va
  const conAvisos = grupo.tareas.some(t => AVISOS.has(t.tipo) || t.callaAviso);
  const faltaFecha = conAvisos && (!vence || vence < fechaLocalISO());
  const conAcciones = caso || (esExp && tieneAccion);
  const sub = caso ? [caso.compania_aseguradora, caso.patente].filter(Boolean).join(" · ")
    : expediente ? ["Expediente", expediente.numero].filter(Boolean).join(" · ") : "";
  const wa = caso?.telefono_asegurado ? linkWhatsApp(caso.telefono_asegurado, `Hola ${primerNombre(caso.asegurado)}, te escribo por tu reclamo.`.replace("Hola , ", "Hola, ")) : null;

  // enCurso: un segundo Enter (o doble click) mientras guarda no repite la acción en la bitácora
  const correr = async fn => {
    if (enCurso.current) return;
    enCurso.current = true; setGuardando(true);
    let ok = false;
    try { ok = await fn(); } finally { enCurso.current = false; setGuardando(false); }
    if (ok) setModo(null);
  };
  const guardarHecho = sinNueva => correr(() => onHecho(sujeto, sinNueva ? {} : { nueva, vence: nueva.trim() ? vence : null }, { expediente: esExp }));
  const abrirHecho = () => { setNueva(""); setModo("hecho"); };

  // Teclado con la fila enfocada: J/K o flechas para moverse, Enter abre, H hecho, P posponer, R reiteré hoy, W WhatsApp
  const alTeclear = e => {
    if (e.target !== e.currentTarget || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "enter") { e.preventDefault(); onAbrir(grupo); return; }
    if (["j", "k", "arrowdown", "arrowup"].includes(k)) {
      e.preventDefault();
      const filas = [...(e.currentTarget.closest(".lista-filas")?.querySelectorAll(".ft") || [])];
      const i = filas.indexOf(e.currentTarget) + (k === "j" || k === "arrowdown" ? 1 : -1);
      if (filas[i]) { filas[i].focus(); filas[i].scrollIntoView({ block: "nearest" }); }
      return;
    }
    if (modo) return;
    if (k === "h" && conAcciones) { e.preventDefault(); abrirHecho(); }
    else if (k === "p" && conAcciones && tieneAccion) { e.preventDefault(); setModo("posponer"); }
    else if (k === "r" && conAcciones && quieto && onReiterar) { e.preventDefault(); correr(() => onReiterar(caso)); }
    else if (k === "w" && wa) { e.preventDefault(); window.open(wa, "_blank", "noreferrer"); }
  };

  return (
    <div className="ft" tabIndex={0} onClick={() => !modo && onAbrir(grupo)} {...(menu ? propsMenu(menu) : {})}
      onKeyDown={alTeclear}>

      <span {...aislar}>
        {conAcciones
          ? <button type="button" className="ft-check" onClick={abrirHecho} aria-label={tieneAccion ? "Marcar como hecho" : "Cargar próxima acción"} title={tieneAccion ? "Hecho" : "Cargar próxima acción"}><Icono nombre="check" size={14} /></button>
          : <span className="ft-check" aria-hidden="true" style={{ borderStyle: "dashed", cursor: "default" }} />}
      </span>

      <div style={{ minWidth: 0 }}>
        <div className="ft-titulo">{grupo.titulo}</div>
        {sub && <div className="ft-sub">{sub}</div>}
      </div>

      <ul className="ft-detalle">
        {grupo.tareas.map(t => (
          <li key={t.id}>{t.tipo !== "accion" && <><small>{tipos[t.tipo] || "Tarea"}</small> · </>}{t.detalle}</li>
        ))}
      </ul>

      <span style={{ display: "flex", alignItems: "center", gap: 8, justifySelf: "end" }}>
        {monto ? <span className="num" style={{ fontSize: 14, fontWeight: 600 }}>{fmtMoney(monto)}</span> : null}
        {chip || <span className={`plazo num${p?.grave ? " plazo-grave" : ""}`} style={{ "--tono": p ? NIVEL[p.nivel] : "var(--muted)" }}>{p?.grave && <Icono nombre="alerta" size={12} stroke={2.2} />}{p ? p.texto : "Sin plazo"}</span>}
      </span>

      <span className="ft-acciones" {...aislar}>
        {conAcciones && !modo && <>
          {tieneAccion && <button type="button" className="ft-btn" onClick={() => setModo("posponer")}>Posponer</button>}
          {quieto && onReiterar && <button type="button" className="ft-btn" disabled={guardando} onClick={() => correr(() => onReiterar(caso))}>{guardando ? "Guardando…" : "Reiteré hoy"}</button>}
        </>}
        {wa && <a className="ft-btn wa" href={wa} target="_blank" rel="noreferrer" aria-label={`Escribir por WhatsApp a ${nombrePropio(caso.asegurado)}`} title="WhatsApp"><Icono nombre="mensaje" size={16} /></a>}
      </span>

      {modo === "hecho" && (
        <div className="ft-form" {...aislar}>
          {tieneAccion && <div style={{ fontSize: 12, color: "var(--muted)" }}>"{sujeto.proxima_accion.trim()}" queda en la bitácora como hecho.</div>}
          <input autoFocus value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Próxima acción (ej.: Reiterar el reclamo)" aria-label="Próxima acción"
            onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter" && nueva.trim() && !faltaFecha) guardarHecho(false); if (e.key === "Escape") setModo(null); }} style={campo} />
          <ChipsPlazo valor={vence} onElegir={setVence} />
          {faltaFecha && <div style={{ fontSize: 12, color: "var(--muted)" }}>Elegí una fecha de hoy en adelante para que el aviso no vuelva.</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Boton tamaño="sm" variante="primario" disabled={guardando || !nueva.trim() || faltaFecha} onClick={() => guardarHecho(false)}>{guardando ? "Guardando…" : "Guardar"}</Boton>
            {tieneAccion && !conAvisos && <Boton tamaño="sm" variante="fantasma" disabled={guardando} onClick={() => guardarHecho(true)}>Hecho, sin nueva acción</Boton>}
            <Boton tamaño="sm" variante="fantasma" onClick={() => setModo(null)}>Cancelar</Boton>
          </div>
        </div>
      )}

      {modo === "posponer" && (
        <div className="ft-form" {...aislar}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Correr "{sujeto.proxima_accion.trim()}" a:</div>
          <ChipsPlazo valor={null} onElegir={f => f && correr(() => onPosponer(sujeto, f, { expediente: esExp }))} />
          <div><Boton tamaño="sm" variante="fantasma" onClick={() => setModo(null)}>Cancelar</Boton></div>
        </div>
      )}
    </div>
  );
}
