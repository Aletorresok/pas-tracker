import { useState } from "react";
import { RESULTADOS_CONTACTO } from "../constants.js";

export default function ContactModal({ pas, onClose, onSave, darkMode }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [resultados, setResultados] = useState([]);
  const [nota, setNota] = useState("");
  const [recordatorio, setRecordatorio] = useState("");

  const toggle = (key) => setResultados(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const labelStyle = { fontSize: 10, color: darkMode ? "#64748b" : "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.2, display: "block", fontWeight: 600 };
  const inputStyle = {
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="slide-up" style={{ background: darkMode ? "#0f172a" : "#fff", border: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`, borderRadius: 18, width: "100%", maxWidth: 480, padding: "32px 28px", boxShadow: "0 24px 60px #000a" }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, color: "#6366f1", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>Registrar contacto</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: darkMode ? "#f1f5f9" : "#1e293b" }}>{pas.nombre || "Sin nombre"}</div>
        </div>

        <label style={{ display: "block", marginBottom: 18 }}>
          <span style={labelStyle}>Fecha</span>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ marginBottom: 18 }}>
          <span style={labelStyle}>Resultado</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {RESULTADOS_CONTACTO.map(r => {
              const sel = resultados.includes(r.key);
              return (
                <button key={r.key} onClick={() => toggle(r.key)} style={{
                  background: sel ? r.color + "18" : darkMode ? "#111827" : "#f8fafc",
                  border: `2px solid ${sel ? r.color : darkMode ? "#1e293b" : "#e2e8f0"}`,
                  borderRadius: 10, color: sel ? r.color : darkMode ? "#64748b" : "#94a3b8",
                  padding: "10px 12px", fontSize: 12, cursor: "pointer", textAlign: "left",
                  transition: "all .15s", display: "flex", alignItems: "center", gap: 8, fontWeight: sel ? 600 : 400,
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${sel ? r.color : "#475569"}`, background: sel ? r.color : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
                    {sel && <span style={{ color: "#fff", fontSize: 10, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                  </div>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <label style={{ display: "block", marginBottom: 18 }}>
          <span style={labelStyle}>Nota (opcional)</span>
          <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} placeholder="Ej: dijo que me llama la semana que viene..." style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} />
        </label>

        {resultados.includes("volver_contactar") && (
          <label style={{ display: "block", marginBottom: 18 }}>
            <span style={{ ...labelStyle, color: "#6366f1" }}>🔁 ¿Cuándo volver a contactar?</span>
            <input type="date" value={recordatorio} onChange={e => setRecordatorio(e.target.value)} style={{ ...inputStyle, borderColor: "#6366f166" }} />
          </label>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: darkMode ? "#1e293b" : "#f1f5f9", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 10, color: darkMode ? "#94a3b8" : "#64748b", padding: "11px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={() => onSave({ fecha, resultados, nota, recordatorio })} style={{ flex: 2, background: "linear-gradient(135deg, #6366f1, #818cf8)", border: "none", borderRadius: 10, color: "white", padding: "11px", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 12px #6366f133" }}>Guardar ✓</button>
        </div>
      </div>
    </div>
  );
}
