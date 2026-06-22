import { useState } from "react";
import { createPortal } from "react-dom";
import { formatoFecha } from "../../utils/casoDetalleUtils.js";

export default function SeccionTimeline({ acciones, loading, onGuardar, onEditar, onEliminar, Th }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null);

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;

  const abrirNueva = () => { setEditando(null); setFecha(new Date().toISOString().slice(0, 10)); setDescripcion(""); setModalOpen(true); };
  const abrirEditar = (a) => { setEditando(a); setFecha(a.fecha?.slice(0, 10) || ""); setDescripcion(a.descripcion || ""); setModalOpen(true); };
  const cerrar = () => { setModalOpen(false); setDescripcion(""); setEditando(null); };

  const handleGuardar = async () => {
    if (!descripcion.trim()) return;
    setGuardando(true);
    await onGuardar({ id: editando?.id, fecha, descripcion: descripcion.trim() });
    setGuardando(false);
    cerrar();
  };

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: Th.text }}>⏳ Historial de acciones</div>
        <button onClick={abrirNueva} style={{ background: "#6366f1", border: "none", borderRadius: 8, color: "white", padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
          ➕ Agregar acción
        </button>
      </div>

      {loading && <div style={{ color: Th.muted, fontSize: 13 }}>Cargando...</div>}
      {!loading && acciones.length === 0 && (
        <div style={{ color: Th.muted, fontSize: 13, textAlign: "center", padding: "12px 0" }}>Sin acciones registradas aún</div>
      )}

      <div style={{ paddingLeft: 4, marginTop: 12 }}>
        {acciones.map((a, i) => (
          <div key={a.id || i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: i === 0 ? "#6366f1" : Th.border, marginTop: 3, flexShrink: 0, border: i === 0 ? "2px solid #6366f144" : "none" }} />
              {i < acciones.length - 1 && <div style={{ width: 1, flex: 1, background: Th.border, marginTop: 4, minHeight: 18 }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: 6 }}>
              <div style={{ fontSize: 11, color: i === 0 ? "#6366f1" : Th.muted, fontWeight: i === 0 ? 700 : 500, marginBottom: 2 }}>
                {formatoFecha(a.fecha?.slice(0, 10))}{i === 0 ? " · más reciente" : ""}
              </div>
              <div style={{ fontSize: 13, color: Th.sub, lineHeight: 1.5, marginBottom: 8 }}>{a.descripcion}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => abrirEditar(a)} style={{ background: "#3b82f6", border: "none", borderRadius: 4, color: "white", padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>✏️ Editar</button>
                <button onClick={() => onEliminar(a.id)} style={{ background: "#ef4444", border: "none", borderRadius: 4, color: "white", padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>🗑️ Eliminar</button>
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
                {editando ? "✏️ Editar acción" : "➕ Registrar acción"}
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
                <button onClick={handleGuardar} disabled={guardando || !descripcion.trim()} style={{ flex: 2, background: guardando || !descripcion.trim() ? Th.card2 : "#6366f1", border: "none", borderRadius: 8, color: "white", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700, opacity: guardando || !descripcion.trim() ? 0.5 : 1 }}>
                  {guardando ? "Guardando..." : editando ? "✓ Actualizar" : "✓ Guardar acción"}
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
