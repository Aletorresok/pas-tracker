import { useState, useEffect } from "react";
import { TIPOS_EVENTO, tipoEvento, armarInicio, fechaDe, horaDe, describirCuando, linkGoogleCalendar, eventosDelCaso, guardarEvento, borrarEvento } from "../../utils/agenda.js";
import { fechaLocalISO } from "../../utils/formatters.js";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";

const VACIO = { tipo: "mediacion", fecha: "", hora: "10:00", duracion_min: 60, link: "", lugar: "", notas: "" };
const AVANZADOS = ["en_mediacion", "en_juicio", "esperando_pago", "cobrado", "desistido"];

// Agenda del caso: mediaciones, audiencias, vencimientos. Cada evento con "Agregar a Google Calendar".
export default function AgendaCaso({ casoId, caso, onChange, Th }) {
  const [eventos, setEventos] = useState(null);
  const [form, setForm] = useState(null); // null = cerrado; { ...VACIO, id? }
  const [pasarAMediacion, setPasarAMediacion] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [borrando, setBorrando] = useState(null);

  const [falla, setFalla] = useState(false);
  const cargar = () => eventosDelCaso(casoId).then(d => { setFalla(d === null); setEventos(d || []); });
  useEffect(() => { if (casoId) cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [casoId]);

  const hoy = fechaLocalISO();
  const proximos = (eventos || []).filter(e => fechaDe(new Date(e.inicio)) >= hoy);
  const pasados = (eventos || []).filter(e => fechaDe(new Date(e.inicio)) < hoy);
  const ofrecerMediacion = form && !form.id && form.tipo === "mediacion" && !AVANZADOS.includes(caso.estado);

  const cambiar = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const editar = (e) => { const d = new Date(e.inicio); setForm({ ...VACIO, ...e, fecha: fechaDe(d), hora: horaDe(d), link: e.link || "", lugar: e.lugar || "", notas: e.notas || "" }); setError(""); };

  const guardar = async (ev) => {
    ev.preventDefault();
    if (!form.fecha) { setError("Poné la fecha."); return; }
    setGuardando(true); setError("");
    const { error: err } = await guardarEvento({ ...form, caso_id: casoId, inicio: armarInicio(form.fecha, form.hora) });
    setGuardando(false);
    if (err) { setError("No se pudo guardar. ¿Ya corriste el SQL de la agenda?"); return; }
    if (ofrecerMediacion && pasarAMediacion) { onChange("estado", "en_mediacion"); onChange("fecha_mediacion", form.fecha); }
    setForm(null);
    cargar();
  };

  const borrar = async (e) => {
    if (borrando !== e.id) { setBorrando(e.id); return; } // segundo toque confirma
    await borrarEvento(e.id);
    setBorrando(null);
    cargar();
  };

  const campo = { ...Th.input, padding: "8px 10px" };
  const etiqueta = { display: "block", fontSize: 12, color: Th.sub, marginBottom: 4 };
  const link = { background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 };

  const fila = (e, pasado) => (
    <div key={e.id} style={{ padding: "9px 0", borderTop: `1px solid ${Th.border}`, display: "flex", flexDirection: "column", gap: 4, opacity: pasado ? 0.65 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: Th.text }}>{tipoEvento(e.tipo)}</span>
        <span className="num" style={{ fontSize: 13, color: pasado ? Th.muted : "var(--accent-ink)", fontWeight: 600, whiteSpace: "nowrap" }}>{describirCuando(e.inicio)}</span>
      </div>
      {(e.lugar || e.notas) && <div style={{ fontSize: 12, color: Th.sub }}>{[e.lugar, e.notas].filter(Boolean).join(" · ")}</div>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
        {e.link && <a href={e.link} target="_blank" rel="noreferrer" style={{ ...link, textDecoration: "none" }}>Unirse →</a>}
        {!pasado && <a href={linkGoogleCalendar(e, caso)} target="_blank" rel="noreferrer" style={{ ...link, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}><Icono nombre="agregar" size={13} />Google Calendar</a>}
        <button type="button" onClick={() => editar(e)} style={{ ...link, color: Th.sub, fontWeight: 500 }}>Editar</button>
        <button type="button" onClick={() => borrar(e)} onBlur={() => setBorrando(null)} style={{ ...link, color: borrando === e.id ? "var(--bad)" : Th.muted, fontWeight: borrando === e.id ? 600 : 500 }}>{borrando === e.id ? "¿Borrar? Tocá de nuevo" : "Borrar"}</button>
      </div>
    </div>
  );

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: Th.text }}>Agenda</span>
        {!form && <button type="button" onClick={() => { setForm({ ...VACIO }); setError(""); }} style={link}>+ Agregar</button>}
      </div>

      {form && (
        <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0 12px" }}>
          <div role="group" aria-label="Tipo" style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {TIPOS_EVENTO.map(t => (
              <button key={t.k} type="button" aria-pressed={form.tipo === t.k} onClick={() => cambiar("tipo", t.k)}
                style={{ font: "inherit", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, cursor: "pointer", border: `1px solid ${form.tipo === t.k ? "var(--text)" : "var(--border)"}`, background: form.tipo === t.k ? "var(--text)" : "var(--card)", color: form.tipo === t.k ? "var(--bg)" : "var(--sub)" }}>{t.l}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
            <label><span style={etiqueta}>Fecha</span><input type="date" value={form.fecha} onChange={e => cambiar("fecha", e.target.value)} required style={campo} /></label>
            <label><span style={etiqueta}>Hora</span><input type="time" value={form.hora} onChange={e => cambiar("hora", e.target.value)} style={campo} /></label>
            <label><span style={etiqueta}>Duración</span>
              <select value={form.duracion_min} onChange={e => cambiar("duracion_min", Number(e.target.value))} style={campo}>
                {[30, 60, 90, 120, 180].map(m => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`.replace(".5", ",5")}</option>)}
              </select>
            </label>
          </div>
          <label><span style={etiqueta}>Link (Zoom, Meet, Teams…)</span><input type="url" value={form.link} onChange={e => cambiar("link", e.target.value)} placeholder="https://…" style={campo} /></label>
          <label><span style={etiqueta}>Lugar / mediador</span><input value={form.lugar} onChange={e => cambiar("lugar", e.target.value)} placeholder="Ej: Dr. Pérez · Av. Corrientes 1234, 5° B" style={campo} /></label>
          <label><span style={etiqueta}>Notas</span><input value={form.notas} onChange={e => cambiar("notas", e.target.value)} placeholder="Ej: llevar poder y presupuesto actualizado" style={campo} /></label>
          {ofrecerMediacion && (
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: Th.sub }}>
              <input type="checkbox" checked={pasarAMediacion} onChange={e => setPasarAMediacion(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
              Pasar el caso a “En mediación”
            </label>
          )}
          {error && <div role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Boton type="submit" variante="primario" tamaño="sm" disabled={guardando}>{guardando ? "Guardando…" : form.id ? "Guardar cambios" : "Agendar"}</Boton>
            <Boton tamaño="sm" variante="fantasma" onClick={() => setForm(null)}>Cancelar</Boton>
          </div>
        </form>
      )}

      {eventos === null && <div style={{ fontSize: 13, color: Th.muted }}>Cargando…</div>}
      {falla && <div style={{ fontSize: 13, color: "var(--warn)" }}>No se pudo cargar la agenda. Si es la primera vez, falta correr el SQL de la agenda.</div>}
      {eventos && !falla && !eventos.length && !form && <div style={{ fontSize: 13, color: Th.muted }}>Sin mediaciones ni audiencias agendadas.</div>}
      {proximos.map(e => fila(e, false))}
      {pasados.length > 0 && (
        <details style={{ marginTop: 6 }}>
          <summary style={{ fontSize: 12, color: Th.muted, cursor: "pointer" }}>{pasados.length} {pasados.length === 1 ? "evento pasado" : "eventos pasados"}</summary>
          {[...pasados].reverse().map(e => fila(e, true))}
        </details>
      )}
    </div>
  );
}
