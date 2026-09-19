import { useState } from "react";
import EstadoSelector from "../caso/EstadoSelector.jsx";
import CompaniaSelector from "../caso/CompaniaSelector.jsx";

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export function NuevoCasoModal({ pasNombre, darkMode, onClose, onSave, companias, onAgregarCompania }) {
  const [asegurado, setAsegurado] = useState("");
  const [compania, setCompania] = useState("");
  const [fechaSiniestro, setFechaSiniestro] = useState("");
  const [fechaDerivacion, setFechaDerivacion] = useState(new Date().toISOString().slice(0, 10));
  const [estado, setEstado] = useState("doc_pendiente");

  const iStyle = {
    background: darkMode ? "#1e293b" : "#f8fafc",
    border: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}`,
    borderRadius: 10,
    color: darkMode ? "#f1f5f9" : "#0f172a",
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  const handleSave = () => {
    if (!asegurado.trim()) return;
    onSave({
      id: generateUUID(),
      caso_id: Date.now(),
      asegurado: asegurado.trim(),
      compania: compania.trim() || null,
      compania_aseguradora: compania.trim() || null,
      fecha_siniestro: fechaSiniestro || null,
      fecha_derivacion: fechaDerivacion || null,
      estado,
      estado_honorarios: "NO_FACTURADO",
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: darkMode ? "#0f172a" : "#fff", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 18, width: "100%", maxWidth: 520, padding: "32px 28px", boxShadow: "0 20px 60px #0004" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, color: darkMode ? "#f1f5f9" : "#1e293b" }}>Nuevo caso</div>
        <div style={{ fontSize: 13, color: darkMode ? "#64748b" : "#94a3b8", marginBottom: 24 }}>{pasNombre}</div>

        <label style={{ display: "block", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Asegurado *</div>
          <input type="text" value={asegurado} onChange={e => setAsegurado(e.target.value)} placeholder="Nombre del asegurado" style={iStyle} autoFocus />
        </label>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Compañía aseguradora</div>
          <CompaniaSelector value={compania} onChange={setCompania} companias={companias || []} onAgregar={onAgregarCompania || (() => {})} darkMode={darkMode} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <label>
            <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Fecha siniestro</div>
            <input type="date" value={fechaSiniestro} onChange={e => setFechaSiniestro(e.target.value)} style={iStyle} />
          </label>
          <label>
            <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Fecha derivación</div>
            <input type="date" value={fechaDerivacion} onChange={e => setFechaDerivacion(e.target.value)} style={iStyle} />
          </label>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Estado del caso</div>
          <EstadoSelector value={estado} onChange={setEstado} darkMode={darkMode} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: darkMode ? "#1e293b" : "#f1f5f9", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 10, color: darkMode ? "#94a3b8" : "#64748b", padding: "11px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={handleSave} disabled={!asegurado.trim()} style={{ flex: 2, background: asegurado.trim() ? "#6366f1" : darkMode ? "#334155" : "#e2e8f0", border: "none", borderRadius: 10, color: asegurado.trim() ? "white" : darkMode ? "#64748b" : "#94a3b8", padding: "11px", cursor: asegurado.trim() ? "pointer" : "default", fontSize: 14, fontWeight: 700 }}>Crear caso</button>
        </div>
      </div>
    </div>
  );
}

export function NuevoPASModal({ pasEdit, darkMode, onClose, onSave }) {
  const [nombre, setNombre] = useState(pasEdit?.nombre || "");
  const [mail, setMail] = useState(pasEdit?.mail || "");
  const iStyle = {
    background: darkMode ? "#1e293b" : "#f8fafc",
    border: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}`,
    borderRadius: 10,
    color: darkMode ? "#f1f5f9" : "#0f172a",
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: darkMode ? "#0f172a" : "#fff", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 18, width: "100%", maxWidth: 420, padding: "32px 28px", boxShadow: "0 20px 60px #0004" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 24, color: darkMode ? "#f1f5f9" : "#1e293b" }}>
          {pasEdit ? "Editar PAS" : "Nuevo PAS manual"}
        </div>
        <label style={{ display: "block", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Nombre</div>
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} style={iStyle} />
        </label>
        <label style={{ display: "block", marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Mail</div>
          <input type="email" value={mail} onChange={e => setMail(e.target.value)} style={iStyle} />
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: darkMode ? "#1e293b" : "#f1f5f9", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 10, color: darkMode ? "#94a3b8" : "#64748b", padding: "11px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={() => onSave({ id: pasEdit?.id || (100000 + Math.floor(Math.random() * 1900000)), nombre, mail, manual: true })} style={{ flex: 1, background: "#6366f1", border: "none", borderRadius: 10, color: "white", padding: "11px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}