export default function ContactModal({ pas, onClose, onSave, darkMode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="slide-up" style={{ background: darkMode ? "#0f172a" : "#fff", border: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`, borderRadius: 18, width: "100%", maxWidth: 380, padding: "32px 28px", boxShadow: "0 24px 60px #000a", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#6366f1", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>Registrar contacto</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: darkMode ? "#f1f5f9" : "#1e293b", marginBottom: 28 }}>{pas.nombre || "Sin nombre"}</div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: darkMode ? "#1e293b" : "#f1f5f9", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 10, color: darkMode ? "#94a3b8" : "#64748b", padding: "11px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={() => onSave({ fecha: new Date().toISOString().slice(0, 10), resultados: [], nota: "", recordatorio: "" })} style={{ flex: 2, background: "linear-gradient(135deg, #6366f1, #818cf8)", border: "none", borderRadius: 10, color: "white", padding: "11px", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 12px #6366f133" }}>Confirmar ✓</button>
        </div>
      </div>
    </div>
  );
}
