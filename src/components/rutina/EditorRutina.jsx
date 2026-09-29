import { useState } from "react";
import { FRECUENCIAS, PRIORIDADES, DIAS_SEMANA, PESTANAS, guardarItem, borrarItem, guardarEscuela, borrarEscuela } from "../../utils/rutina.js";
import { fechaLocalISO } from "../../utils/formatters.js";
import Boton from "../ui/Boton.jsx";
import { ChipPrioridad, nombreAcceso, tarjeta, campo, etiqueta } from "./comunes.jsx";

const VACIO = { frecuencia: "diaria", bloque: "", hora_inicio: "", hora_fin: "", dia: null, titulo: "", prioridad: "importante", acceso: "", orden: 0, activo: true };
const hora = h => (h ? String(h).slice(0, 5) : "");
const cuando = i => {
  const h = i.hora_inicio ? `${hora(i.hora_inicio)}${i.hora_fin ? `–${hora(i.hora_fin)}` : ""}` : "sin horario";
  if (i.frecuencia === "semanal") return `${i.dia ? DIAS_SEMANA[i.dia - 1] : "Cualquier día"} · ${h}`;
  if (i.frecuencia === "mensual") return `${Number(i.dia) ? `Día ${i.dia}` : "Último día"} · ${h}`;
  return h;
};

function FormItem({ inicial, bloques, onGuardar, onCancelar }) {
  const [i, setI] = useState({ ...VACIO, ...inicial, hora_inicio: hora(inicial.hora_inicio), hora_fin: hora(inicial.hora_fin) });
  const esLink = i.acceso && !i.acceso.startsWith("app:");
  const [modoLink, setModoLink] = useState(esLink);
  const c = (k, v) => setI(x => ({ ...x, [k]: v }));
  const listo = i.titulo.trim() && i.bloque.trim() && (!i.hora_fin || !i.hora_inicio || i.hora_fin > i.hora_inicio);
  return (
    <div style={{ ...tarjeta, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, borderColor: "var(--accent)" }}>
      <label style={{ gridColumn: "1 / -1" }}><span style={etiqueta}>Qué hay que hacer</span>
        <input value={i.titulo} onChange={e => c("titulo", e.target.value)} placeholder="Ej: reiterar los reclamos quietos" style={campo} autoFocus /></label>
      <label><span style={etiqueta}>Bloque</span>
        <input value={i.bloque} onChange={e => c("bloque", e.target.value)} list="bloques-rutina" placeholder="Ej: Siniestros con compañías" style={campo} />
        <datalist id="bloques-rutina">{bloques.map(b => <option key={b} value={b} />)}</datalist></label>
      <label><span style={etiqueta}>Frecuencia</span>
        <select value={i.frecuencia} onChange={e => setI(x => ({ ...x, frecuencia: e.target.value, dia: e.target.value === "mensual" ? 1 : null }))} style={campo}>
          {FRECUENCIAS.map(f => <option key={f.k} value={f.k}>{f.l}</option>)}
        </select></label>
      {i.frecuencia === "semanal" && (
        <label><span style={etiqueta}>Día</span>
          <select value={i.dia ?? ""} onChange={e => c("dia", e.target.value ? Number(e.target.value) : null)} style={campo}>
            <option value="">Cualquier día</option>
            {DIAS_SEMANA.map((d, n) => <option key={d} value={n + 1}>{d}</option>)}
          </select></label>
      )}
      {i.frecuencia === "mensual" && (
        <label><span style={etiqueta}>Día del mes</span>
          <select value={i.dia ?? 1} onChange={e => c("dia", Number(e.target.value))} style={campo}>
            {Array.from({ length: 28 }, (_, n) => <option key={n + 1} value={n + 1}>{n + 1}</option>)}
            <option value={0}>Último día</option>
          </select></label>
      )}
      <label><span style={etiqueta}>Desde</span><input type="time" value={i.hora_inicio} onChange={e => c("hora_inicio", e.target.value)} style={campo} /></label>
      <label><span style={etiqueta}>Hasta</span><input type="time" value={i.hora_fin} onChange={e => c("hora_fin", e.target.value)} style={campo} /></label>
      <label><span style={etiqueta}>Prioridad</span>
        <select value={i.prioridad} onChange={e => c("prioridad", e.target.value)} style={campo}>
          {PRIORIDADES.map(p => <option key={p.k} value={p.k}>{p.l}</option>)}
        </select></label>
      <label><span style={etiqueta}>Acceso directo</span>
        <select value={modoLink ? "link" : i.acceso || ""} onChange={e => { const v = e.target.value; setModoLink(v === "link"); c("acceso", v === "link" ? "https://" : v); }} style={campo}>
          <option value="">Ninguno</option>
          {PESTANAS.map(p => <option key={p.k} value={p.k}>Pestaña {p.l}</option>)}
          <option value="link">Un link (PJN, MEV, Gmail…)</option>
        </select></label>
      {modoLink && <label style={{ gridColumn: "1 / -1" }}><span style={etiqueta}>Link</span><input type="url" value={i.acceso} onChange={e => c("acceso", e.target.value)} style={campo} /></label>}
      <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--muted)" }}>
        Imprescindible: se mantiene aunque haya escuela (se corre para después). Importante: se corre si entra antes de las 22. Postergable: los días de escuela pasa a "hoy no entra".
      </div>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
        <Boton tamaño="sm" variante="primario" onClick={() => onGuardar({ ...i, hora_inicio: i.hora_inicio || null, hora_fin: i.hora_fin || null, acceso: i.acceso && i.acceso !== "https://" ? i.acceso : null })} disabled={!listo}>Guardar</Boton>
        <Boton tamaño="sm" variante="fantasma" onClick={onCancelar}>Cancelar</Boton>
      </div>
    </div>
  );
}

function Escuela({ escuela, onCambio }) {
  const hoy = fechaLocalISO();
  const [nueva, setNueva] = useState(null);
  const c = (k, v) => setNueva(x => ({ ...x, [k]: v }));
  const listo = nueva && nueva.desde && nueva.hasta >= nueva.desde && nueva.hora_salida > nueva.hora_entrada;
  return (
    <div style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Días de escuela</span>
        {!nueva && <Boton tamaño="sm" variante="fantasma" onClick={() => setNueva({ desde: hoy, hasta: hoy, hora_entrada: "18:00", hora_salida: "22:00", incluye_fds: false })}>+ Agregar</Boton>}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>Esos días, lo que choque con el horario se reacomoda según la prioridad.</div>
      {escuela.map(d => (
        <div key={d.id} className="num" style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, padding: "4px 0", borderTop: "1px solid var(--border)" }}>
          <span>{d.desde.split("-").reverse().join("/")} al {d.hasta.split("-").reverse().join("/")} · {hora(d.hora_entrada)} a {hora(d.hora_salida)}{d.incluye_fds ? " · también fin de semana" : ""}{d.hasta < hoy ? " (terminó)" : ""}</span>
          <button type="button" onClick={async () => { if (await borrarEscuela(d.id)) onCambio(); }} style={{ background: "none", border: "none", color: "var(--bad)", cursor: "pointer", fontSize: 12 }}>Borrar</button>
        </div>
      ))}
      {nueva && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, alignItems: "end" }}>
          <label><span style={etiqueta}>Desde</span><input type="date" value={nueva.desde} onChange={e => c("desde", e.target.value)} style={campo} /></label>
          <label><span style={etiqueta}>Hasta</span><input type="date" value={nueva.hasta} onChange={e => c("hasta", e.target.value)} style={campo} /></label>
          <label><span style={etiqueta}>Entrada</span><input type="time" value={nueva.hora_entrada} onChange={e => c("hora_entrada", e.target.value)} style={campo} /></label>
          <label><span style={etiqueta}>Salida</span><input type="time" value={nueva.hora_salida} onChange={e => c("hora_salida", e.target.value)} style={campo} /></label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--sub)", gridColumn: "1 / -1" }}>
            <input type="checkbox" checked={nueva.incluye_fds} onChange={e => c("incluye_fds", e.target.checked)} style={{ accentColor: "var(--accent)" }} />También sábados y domingos
          </label>
          <div style={{ display: "flex", gap: 8, gridColumn: "1 / -1" }}>
            <Boton tamaño="sm" variante="primario" disabled={!listo} onClick={async () => { if (await guardarEscuela(nueva)) { setNueva(null); onCambio(); } }}>Guardar</Boton>
            <Boton tamaño="sm" variante="fantasma" onClick={() => setNueva(null)}>Cancelar</Boton>
          </div>
        </div>
      )}
    </div>
  );
}

// Armar la rutina: ítems por frecuencia y días de escuela
export default function EditorRutina({ items, escuela, onCambio }) {
  const [editando, setEditando] = useState(null); // "nuevo" | id
  const [borrando, setBorrando] = useState(null);
  const bloques = [...new Set(items.map(i => i.bloque).filter(Boolean))];
  const guardar = async i => { if (await guardarItem(i)) { setEditando(null); onCambio(); } };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 900 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {editando !== "nuevo" && <Boton variante="primario" icono="agregar" onClick={() => setEditando("nuevo")}>Agregar a la rutina</Boton>}
      </div>
      {editando === "nuevo" && <FormItem inicial={{ orden: items.length + 1 }} bloques={bloques} onGuardar={guardar} onCancelar={() => setEditando(null)} />}

      {FRECUENCIAS.map(f => {
        const lista = items.filter(i => i.frecuencia === f.k).sort((a, b) => (Number(a.dia) || 0) - (Number(b.dia) || 0) || String(a.hora_inicio || "99").localeCompare(String(b.hora_inicio || "99")) || a.orden - b.orden);
        if (!lista.length) return null;
        return (
          <div key={f.k} style={{ ...tarjeta, padding: "12px 16px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{f.l}</div>
            {lista.map(i => editando === i.id
              ? <FormItem key={i.id} inicial={i} bloques={bloques} onGuardar={guardar} onCancelar={() => setEditando(null)} />
              : (
                <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)", opacity: i.activo ? 1 : 0.5, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{i.titulo}</div>
                    <div className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{i.bloque} · {cuando(i)}{i.acceso ? ` · ${nombreAcceso(i.acceso)}` : ""}</div>
                  </div>
                  <ChipPrioridad k={i.prioridad} />
                  <button type="button" onClick={async () => { if (await guardarItem({ ...i, activo: !i.activo })) onCambio(); }} style={{ background: "none", border: "none", color: "var(--sub)", cursor: "pointer", fontSize: 12 }}>{i.activo ? "Pausar" : "Reactivar"}</button>
                  <button type="button" onClick={() => setEditando(i.id)} style={{ background: "none", border: "none", color: "var(--accent-ink)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Editar</button>
                  <button type="button" onClick={async () => { if (borrando !== i.id) { setBorrando(i.id); return; } if (await borrarItem(i.id)) onCambio(); setBorrando(null); }} onBlur={() => setBorrando(null)}
                    style={{ background: "none", border: "none", color: borrando === i.id ? "var(--bad)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: borrando === i.id ? 600 : 400 }}>{borrando === i.id ? "¿Borrar?" : "Borrar"}</button>
                </div>
              ))}
          </div>
        );
      })}

      <Escuela escuela={escuela} onCambio={onCambio} />
    </div>
  );
}
