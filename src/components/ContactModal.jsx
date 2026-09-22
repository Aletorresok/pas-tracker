export default function ContactModal({ pas, onClose, onSave, darkMode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="slide-up" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: 18, width: "100%", maxWidth: 380, padding: "32px 28px", boxShadow: "0 24px 60px #000a", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>Registrar contacto</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 28 }}>{pas.nombre || "Sin nombre"}</div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "var(--card2)", border: `1px solid ${"var(--border)"}`, borderRadius: 10, color: "var(--sub)", padding: "11px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={() => onSave({ fecha: new Date().toISOString().slice(0, 10), resultados: [], nota: "", recordatorio: "" })} style={{ flex: 2, background: "linear-gradient(135deg, var(--accent), var(--accent))", border: "none", borderRadius: 10, color: "var(--on-accent)", padding: "11px", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 12px color-mix(in srgb, var(--accent) 20%, transparent)" }}>Confirmar ✓</button>
        </div>
      </div>
    </div>
  );
}
