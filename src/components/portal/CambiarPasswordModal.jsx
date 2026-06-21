import { useState } from "react";
import { supabase } from "../../supabase.js";
import { theme } from "./portalTheme.js";

export default function CambiarPasswordModal({ onClose, dark }) {
  const T = theme(dark);
  const [nueva,   setNueva]   = useState("");
  const [confirm, setConfirm] = useState("");
  const [load,    setLoad]    = useState(false);
  const [msg,     setMsg]     = useState("");
  const [error,   setError]   = useState("");

  const handleCambiar = async () => {
    if (nueva !== confirm) { setError("Las contraseñas no coinciden"); return; }
    if (nueva.length < 6)  { setError("Mínimo 6 caracteres"); return; }
    setLoad(true); setError(""); setMsg("");
    const { error: err } = await supabase.auth.updateUser({ password: nueva });
    setLoad(false);
    if (err) { setError("Error al cambiar la contraseña"); return; }
    setMsg("✅ Contraseña cambiada correctamente");
    setTimeout(onClose, 1500);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "28px 24px", width: "100%", maxWidth: 360, boxShadow: "0 20px 60px #0004" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: T.text, marginBottom: 20 }}>🔒 Cambiar contraseña</div>
        {[{ label: "Nueva contraseña", val: nueva, set: setNueva }, { label: "Confirmar contraseña", val: confirm, set: setConfirm }].map(f => (
          <label key={f.label} style={{ display: "block", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{f.label}</div>
            <input type="password" value={f.val} onChange={e => f.set(e.target.value)} style={T.input} />
          </label>
        ))}
        {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, background: "#ef444412", borderRadius: 8, padding: "8px 12px" }}>{error}</div>}
        {msg   && <div style={{ color: "#22c55e", fontSize: 13, marginBottom: 12, background: "#22c55e12", borderRadius: 8, padding: "8px 12px" }}>{msg}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.sub, padding: "10px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={handleCambiar} disabled={load} style={{ flex: 2, background: "#6366f1", border: "none", borderRadius: 10, color: "white", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>{load ? "Guardando..." : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}
