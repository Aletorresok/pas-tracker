import { useState } from "react";
import { createPortal } from "react-dom";
import { formatoFecha, fechaLocalISO } from "../../utils/formatters.js";

export default function SeccionTimeline({ acciones, loading, onCrear, onActualizar, onEliminar, Th }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // Guardamos solo el ID, no todo el objeto
  const [rapida, setRapida] = useState("");
  const [guardandoRapida, setGuardandoRapida] = useState(false);

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;

  const abrirNueva = () => { 
    setEditandoId(null); 
    setFecha(fechaLocalISO()); 
    setDescripcion(""); 
    setModalOpen(true); 
  };
  
  const abrirEditar = (a) => { 
    setEditandoId(a.id); // ID exacto de la base de datos
    setFecha(a.fecha?.slice(0, 10) || ""); 
    setDescripcion(a.descripcion || ""); 
    setModalOpen(true); 
  };
  
  const cerrar = () => { 
    setModalOpen(false); 
    setDescripcion(""); 
    setEditandoId(null); 
  };

  const handleGuardar = async () => {
    if (!descripcion.trim()) return;
    setGuardando(true);

    if (editandoId) {
      // Es una edición explícita
      await onActualizar({ id: editandoId, fecha, descripcion: descripcion.trim() });
    } else {
      // Es una creación explícita
      await onCrear({ fecha, descripcion: descripcion.trim() });
    }

    setGuardando(false);
    cerrar();
  };

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: Th.text }}>Bitácora</div>
        <button onClick={abrirNueva} style={{ background: "none", border: "none", color: "var(--accent-ink)", padding: 0, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          Con otra fecha…
        </button>
      </div>
      <form onSubmit={async e => { e.preventDefault(); if (!rapida.trim()) return; setGuardandoRapida(true); await onCrear({ fecha: fechaLocalISO(), descripcion: rapida.trim() }); setRapida(""); setGuardandoRapida(false); }}
        style={{ display: "flex", gap: 8 }}>
        <input value={rapida} onChange={e => setRapida(e.target.value)} placeholder="Agregar movimiento de hoy y Enter…" aria-label="Nuevo movimiento" style={{ ...inputStyle, padding: "8px 12px" }} />
        <button type="submit" disabled={guardandoRapida || !rapida.trim()} style={{ flex: "none", padding: "0 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 600, cursor: "pointer", opacity: guardandoRapida || !rapida.trim() ? 0.5 : 1 }}>
          {guardandoRapida ? "…" : "Agregar"}
        </button>
      </form>

      {loading && <div style={{ color: Th.muted, fontSize: 13 }}>Cargando...</div>}
      {!loading && acciones.length === 0 && (
        <div style={{ color: Th.muted, fontSize: 13, textAlign: "center", padding: "12px 0" }}>Sin acciones registradas aún</div>
      )}

      <div style={{ paddingLeft: 4, marginTop: 12 }}>
        {acciones.map((a, i) => (
          <div key={a.id || i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: i === 0 ? "var(--accent)" : Th.border, marginTop: 3, flexShrink: 0, border: i === 0 ? "2px solid color-mix(in srgb, var(--accent) 27%, transparent)" : "none" }} />
              {i < acciones.length - 1 && <div style={{ width: 1, flex: 1, background: Th.border, marginTop: 4, minHeight: 18 }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: 6 }}>
              <div style={{ fontSize: 11, color: i === 0 ? "var(--accent)" : Th.muted, fontWeight: i === 0 ? 700 : 500, marginBottom: 2 }}>
                {formatoFecha(a.fecha?.slice(0, 10))}{i === 0 ? " · más reciente" : ""}
              </div>
              <div style={{ fontSize: 13, color: Th.sub, lineHeight: 1.5, marginBottom: 8 }}>{a.descripcion}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => abrirEditar(a)} style={{ background: "none", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--sub)", padding: "3px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Editar</button>
                <button onClick={() => onEliminar(a.id)} style={{ background: "none", border: "none", borderRadius: 6, color: "var(--bad)", padding: "3px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 9998 }} onClick={cerrar} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999 }}>
            <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 16, padding: "28px 24px", maxWidth: 440, width: "100%" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: Th.text, marginBottom: 18 }}>
                {editandoId ? "Editar acción" : "Registrar acción"}
              </div>
              <label style={{ display: "block", marginBottom: 14 }}>
                <span style={labelStyle}>Fecha</span>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: "block", marginBottom: 20 }}>
                <span style={labelStyle}>Descripción *</span>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej: Natalia aceptó el ofrecimiento..." rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} />
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={cerrar} style={{ flex: 1, background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 8, color: Th.sub, padding: "10px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
                <button onClick={handleGuardar} disabled={guardando || !descripcion.trim()} style={{ flex: 2, background: guardando || !descripcion.trim() ? Th.card2 : "var(--accent)", border: "none", borderRadius: 8, color: "var(--on-accent)", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700, opacity: guardando || !descripcion.trim() ? 0.5 : 1 }}>
                  {guardando ? "Guardando..." : editandoId ? "✓ Actualizar" : "✓ Guardar acción"}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}