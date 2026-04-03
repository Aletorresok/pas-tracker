import { useState } from "react";
import { RESULTADOS_CONTACTO } from "../constants.js";

const LS = { fontSize: 11, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1, display: "block" };
const LS_LIGHT = { fontSize: 11, color: "#94a3b8", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1, display: "block" };

const IS = {
  background: "#1e293b",
  border: "1px solid #2d3f55",
  borderRadius: 8,
  color: "#f1f5f9",
  padding: "9px 12px",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const IS_LIGHT = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  color: "#0f172a",
  padding: "9px 12px",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

export default function ContactModal({ pas, onClose, onSave, darkMode }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [resultados, setResultados] = useState([]);
  const [nota, setNota] = useState("");
  const [recordatorio, setRecordatorio] = useState("");
  
  const toggle = (key) => setResultados(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const iStyle = darkMode ? IS : IS_LIGHT;
  const lStyle = darkMode ? LS : LS_LIGHT;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: darkMode ? "#0f172a" : "#fff", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 16, width: "100%", maxWidth: 480, padding: 28, boxShadow: "0 24px 60px #000b" }}>
        <div style={{ marginBottom: 20 }}>
          <span style={lStyle}>Registrar contacto</span>
          <div style={{ fontSize: 20, fontWeight: 700, color: darkMode ? "#f1f5f9" : "#1e293b", marginTop: 4 }}>{pas.nombre || "Sin nombre"}</div>
        </div>

        <label style={{ display: "block", marginBottom: 16 }}>
          <span style={lStyle}>Fecha</span>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={iStyle} />
        </label>

        <div style={{ marginBottom: 16 }}>
          <span style={lStyle}>Resultado — opcional, podés cargarlo después</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {RESULTADOS_CONTACTO.map(r => {
              const sel = resultados.includes(r.key);
              return (
                <button key={r.key} onClick={() => toggle(r.key)} style={{
                  background: sel ? r.color + "2a" : darkMode ? "#1e293b" : "#f8fafc",
                  border: `2px solid ${sel ? r.color : darkMode ? "#2d3f55" : "#e2e8f0"}`,
                  borderRadius: 9, color: sel ? r.color : darkMode ? "#64748b" : "#94a3b8",
                  padding: "9px 10px", fontSize: 12, cursor: "pointer", textAlign: "left",
                  transition: "all .15s", display: "flex", alignItems: "center", gap: 7,
                }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${sel ? r.color : "#475569"}`, background: sel ? r.color : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {sel && <div style={{ width: 6, height: 6, borderRadius: 1, background: "#fff" }} />}
                  </div>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <label style={{ display: "block", marginBottom: 16 }}>
          <span style={lStyle}>Nota (opcional)</span>
          <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} placeholder="Ej: dijo que me llama la semana que viene..." style={{ ...iStyle, resize: "vertical" }} />
        </label>

        {resultados.includes("volver_contactar") && (
          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ ...lStyle, color: "#6366f1" }}>🔁 Recordatorio — ¿cuándo volver a contactar?</span>
            <input type="date" value={recordatorio} onChange={e => setRecordatorio(e.target.value)} style={{ ...iStyle, borderColor: "#6366f188" }} />
          </label>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: darkMode ? "#1e293b" : "#f1f5f9", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 10, color: darkMode ? "#94a3b8" : "#64748b", padding: "10px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={() => onSave({ fecha, resultados, nota, recordatorio })} style={{ flex: 2, background: "#6366f1", border: "none", borderRadius: 10, color: "white", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Guardar ✓</button>
        </div>
      </div>
    </div>
  );
}
