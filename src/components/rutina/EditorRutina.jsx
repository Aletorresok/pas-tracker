import { useState } from "react";
import { FRECUENCIAS, PRIORIDADES, ACCESOS, DIAS_SEMANA, prioridad, hhmm, guardarItem, borrarItem, cargarSugerida, guardarEscuela, borrarEscuela } from "../../utils/rutina.js";
import { fmtDate, fechaLocalISO } from "../../utils/formatters.js";
import Boton from "../ui/Boton.jsx";
import BotoneraForm from "../ui/BotoneraForm.jsx";

const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sub)", marginBottom: 4 };
const campo = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 };
const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" };

const VACIO = { frecuencia: "diaria", bloque: "", hora_inicio: "", hora_fin: "", dia: "", titulo: "", prioridad: "importante", acceso: "", activo: true };

const cuando = it => it.frecuencia === "diaria"
  ? [hhmm(it.hora_inicio), hhmm(it.hora_fin)].filter(Boolean).join(" a ")
  : it.frecuencia === "semanal" ? (it.dia ? DIAS_SEMANA[it.dia] : "Cualquier día")
  : it.dia === null || it.dia === undefined ? "Cualquier día" : it.dia === 0 ? "Último día" : `Día ${it.dia}`;

// Alta, edición y baja de los ítems de la rutina + días de escuela
export default function EditorRutina({ items, escuela, onCambio, setToast }) {
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [nuevaEscuela, setNuevaEscuela] = useState(null);

  const guardar = async () => {
    if (!form.titulo.trim() || !form.bloque.trim()) return setToast({ msg: "Completá el bloque y la tarea", type: "error" });
    setGuardando(true);
    const dia = form.frecuencia === "diaria" || form.dia === "" ? null : Number(form.dia);
    const ok = await guardarItem({ ...form, titulo: form.titulo.trim(), bloque: form.bloque.trim(), dia,
      hora_inicio: form.frecuencia === "diaria" ? form.hora_inicio || null : null, hora_fin: form.frecuencia === "diaria" ? form.hora_fin || null : null,
      acceso: form.acceso || null, orden: form.orden ?? items.length });
    setGuardando(false);
    if (!ok) return setToast({ msg: "No se pudo guardar", type: "error" });
    setForm(null);
    onCambio();
  };

  const borrar = async () => {
    if (!confirm(`¿Borrar "${form.titulo}" de la rutina?`)) return;
    if (await borrarItem(form.id)) { setForm(null); onCambio(); }
  };

  const activar = async (it, activo) => { if (await guardarItem({ id: it.id, activo })) onCambio(); };

  const sugerida = async () => {
    setGuardando(true);
    const ok = await cargarSugerida();
    setGuardando(false);
    if (!ok) return setToast({ msg: "No se pudo cargar la rutina sugerida", type: "error" });
    setToast({ msg: "Rutina sugerida cargada. Editala a tu gusto.", type: "success" });
    onCambio();
  };

  const guardarDiasEscuela = async () => {
    const d = nuevaEscuela;
    if (!d.desde || !d.hasta || d.hasta < d.desde) return setToast({ msg: "Revisá las fechas", type: "error" });
    if (!d.hora_entrada || !d.hora_salida || d.hora_salida <= d.hora_entrada) return setToast({ msg: "Revisá el horario", type: "error" });
    if (!(await guardarEscuela(d))) return setToast({ msg: "No se pudo guardar", type: "error" });
    setNuevaEscuela(null);
    onCambio();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!items.length && (
        <section style={{ ...tarjeta, padding: 16, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
          <div style={{ fontSize: 14, color: "var(--sub)", lineHeight: 1.5 }}>
            Todavía no cargaste tu rutina. Podés arrancar con una sugerida (arranque con PJN, MEV y mails; siniestros con compañías; prospección; escritos; cierre; revisión semanal y cierre del mes) y editarla.
          </div>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Boton variante="primario" onClick={sugerida} disabled={guardando}>{guardando ? "Cargando…" : "Cargar rutina sugerida"}</Boton>
            <Boton icono="agregar" onClick={() => setForm({ ...VACIO })}>Empezar de cero</Boton>
          </span>
        </section>
      )}

      {FRECUENCIAS.map(f => {
        const lista = items.filter(it => it.frecuencia === f.k);
        if (!lista.length) return null;
        return (
          <section key={f.k} style={{ ...tarjeta, padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{f.k === "diaria" ? "Todos los días" : f.k === "semanal" ? "Cada semana" : "Cada mes"}</h2>
              <Boton tamaño="sm" icono="agregar" onClick={() => setForm({ ...VACIO, frecuencia: f.k })}>Tarea</Boton>
            </div>
            {lista.map((it, i) => (
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i ? "1px solid var(--border)" : "none", opacity: it.activo ? 1 : 0.5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: prioridad(it.prioridad).color, flex: "none" }} title={prioridad(it.prioridad).l} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, color: "var(--text)", overflowWrap: "anywhere" }}>{it.titulo}</span>
                  <span className="num" style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{[it.bloque, cuando(it), prioridad(it.prioridad).l].filter(Boolean).join(" · ")}</span>
                </span>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--sub)", cursor: "pointer" }} title="Pausar sin borrar">
                  <input type="checkbox" checked={it.activo} onChange={e => activar(it, e.target.checked)} style={{ accentColor: "var(--accent)" }} />Activa
                </label>
                <Boton tamaño="sm" variante="fantasma" onClick={() => setForm({ ...VACIO, ...it, hora_inicio: hhmm(it.hora_inicio), hora_fin: hhmm(it.hora_fin), dia: it.dia ?? "", acceso: it.acceso || "" })}>Editar</Boton>
              </div>
            ))}
          </section>
        );
      })}

      {items.length > 0 && !items.some(it => it.frecuencia === "semanal") && <Boton style={{ alignSelf: "flex-start" }} icono="agregar" onClick={() => setForm({ ...VACIO, frecuencia: "semanal" })}>Tarea semanal</Boton>}
      {items.length > 0 && !items.some(it => it.frecuencia === "mensual") && <Boton style={{ alignSelf: "flex-start" }} icono="agregar" onClick={() => setForm({ ...VACIO, frecuencia: "mensual" })}>Tarea mensual</Boton>}

      <section style={{ ...tarjeta, padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Días de escuela</h2>
          {!nuevaEscuela && <Boton tamaño="sm" icono="agregar" onClick={() => setNuevaEscuela({ desde: fechaLocalISO(), hasta: "", hora_entrada: "08:00", hora_salida: "12:00", incluye_fds: false })}>Período</Boton>}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 6px" }}>
          En esos días, lo que choca con el horario se reacomoda: lo imprescindible queda (con aviso), lo importante pasa a la salida y lo postergable queda para otro día.
        </div>
        {escuela.map(d => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: "1px solid var(--border)" }}>
            <span className="num" style={{ flex: 1, fontSize: 14 }}>{fmtDate(d.desde)} al {fmtDate(d.hasta)} · {hhmm(d.hora_entrada)} a {hhmm(d.hora_salida)}{d.incluye_fds ? " · incluye fines de semana" : ""}</span>
            <Boton tamaño="sm" variante="fantasma" icono="cerrar" aria-label="Borrar período" onClick={async () => { if (confirm("¿Borrar este período de escuela?") && await borrarEscuela(d.id)) onCambio(); }} />
          </div>
        ))}
        {nuevaEscuela && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            <label><span style={etiqueta}>Desde</span><input type="date" value={nuevaEscuela.desde} onChange={e => setNuevaEscuela(d => ({ ...d, desde: e.target.value }))} style={campo} /></label>
            <label><span style={etiqueta}>Hasta</span><input type="date" value={nuevaEscuela.hasta} onChange={e => setNuevaEscuela(d => ({ ...d, hasta: e.target.value }))} style={campo} /></label>
            <label><span style={etiqueta}>Entrada</span><input type="time" value={nuevaEscuela.hora_entrada} onChange={e => setNuevaEscuela(d => ({ ...d, hora_entrada: e.target.value }))} style={campo} /></label>
            <label><span style={etiqueta}>Salida</span><input type="time" value={nuevaEscuela.hora_salida} onChange={e => setNuevaEscuela(d => ({ ...d, hora_salida: e.target.value }))} style={campo} /></label>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--sub)", gridColumn: "1 / -1" }}>
              <input type="checkbox" checked={nuevaEscuela.incluye_fds} onChange={e => setNuevaEscuela(d => ({ ...d, incluye_fds: e.target.checked }))} style={{ accentColor: "var(--accent)" }} />Incluye sábados y domingos
            </label>
            <span style={{ display: "flex", gap: 8, gridColumn: "1 / -1", justifyContent: "flex-end" }}>
              <Boton variante="fantasma" onClick={() => setNuevaEscuela(null)}>Cancelar</Boton>
              <Boton variante="primario" onClick={guardarDiasEscuela}>Guardar</Boton>
            </span>
          </div>
        )}
      </section>

      {form && (
        <div role="dialog" aria-modal="true" aria-label={form.id ? "Editar tarea" : "Nueva tarea"} onClick={e => e.target === e.currentTarget && setForm(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16, overflowY: "auto" }}>
          <div style={{ ...tarjeta, width: "100%", maxWidth: 460, padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, gridColumn: "1 / -1" }}>{form.id ? "Editar tarea" : "Nueva tarea"}</div>
            <label style={{ gridColumn: "1 / -1" }}><span style={etiqueta}>Tarea</span>
              <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Revisar notificaciones en PJN" style={campo} />
            </label>
            <label><span style={etiqueta}>Frecuencia</span>
              <select value={form.frecuencia} onChange={e => setForm(f => ({ ...f, frecuencia: e.target.value, dia: "" }))} style={campo}>
                {FRECUENCIAS.map(x => <option key={x.k} value={x.k}>{x.k === "diaria" ? "Todos los días" : x.k === "semanal" ? "Cada semana" : "Cada mes"}</option>)}
              </select>
            </label>
            <label><span style={etiqueta}>Bloque</span>
              <input value={form.bloque} onChange={e => setForm(f => ({ ...f, bloque: e.target.value }))} placeholder="Ej: Arranque" list="bloques-rutina" style={campo} />
              <datalist id="bloques-rutina">{[...new Set(items.map(it => it.bloque))].map(b => <option key={b} value={b} />)}</datalist>
            </label>
            {form.frecuencia === "diaria" && <>
              <label><span style={etiqueta}>Desde</span><input type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} style={campo} /></label>
              <label><span style={etiqueta}>Hasta</span><input type="time" value={form.hora_fin} onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))} style={campo} /></label>
            </>}
            {form.frecuencia === "semanal" && (
              <label style={{ gridColumn: "1 / -1" }}><span style={etiqueta}>Desde qué día</span>
                <select value={form.dia} onChange={e => setForm(f => ({ ...f, dia: e.target.value }))} style={campo}>
                  <option value="">Cualquier día de la semana</option>
                  {DIAS_SEMANA.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                </select>
              </label>
            )}
            {form.frecuencia === "mensual" && (
              <label style={{ gridColumn: "1 / -1" }}><span style={etiqueta}>Desde qué día del mes</span>
                <select value={form.dia} onChange={e => setForm(f => ({ ...f, dia: e.target.value }))} style={campo}>
                  <option value="">Cualquier día del mes</option>
                  {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>Día {i + 1}</option>)}
                  <option value="0">Último día del mes</option>
                </select>
              </label>
            )}
            <label><span style={etiqueta}>Prioridad</span>
              <select value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))} style={campo}>
                {PRIORIDADES.map(p => <option key={p.k} value={p.k}>{p.l}</option>)}
              </select>
            </label>
            <label><span style={etiqueta}>Acceso directo</span>
              <select value={form.acceso} onChange={e => setForm(f => ({ ...f, acceso: e.target.value }))} style={campo}>
                <option value="">Ninguno</option>
                {ACCESOS.map(a => <option key={a.k} value={a.k}>{a.l}</option>)}
              </select>
            </label>
            <BotoneraForm onBorrar={form.id && borrar} onCancelar={() => setForm(null)} onGuardar={guardar} guardando={guardando} style={{ gridColumn: "1 / -1" }} />
          </div>
        </div>
      )}
    </div>
  );
}
