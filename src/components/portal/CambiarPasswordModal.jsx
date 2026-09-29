import { useState } from "react";
import { supabase } from "../../supabase.js";
import { theme } from "./portalTheme.js";

// También se usa al volver del mail de "Olvidé mi contraseña" (recuperacion): ahí es obligatorio elegir una nueva.
export default function CambiarPasswordModal({ onClose, dark, recuperacion = false }) {
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
    if (err) { setError(/same|different/i.test(err.message || "") ? "Tiene que ser distinta de la anterior" : "No se pudo cambiar la contraseña. Probá de nuevo."); return; }
    setMsg(recuperacion ? "Listo, ya podés usar tu nueva contraseña" : "Contraseña cambiada correctamente");
    setTimeout(onClose, 1500);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "var(--r-lg)", padding: "28px 24px", width: "100%", maxWidth: 360, boxShadow: "var(--shadow)" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: T.text, marginBottom: recuperacion ? 6 : 20 }}>{recuperacion ? "Elegí una contraseña nueva" : "Cambiar contraseña"}</div>
        {recuperacion && <div style={{ fontSize: 13, color: T.sub, marginBottom: 16, lineHeight: 1.45 }}>Entraste con el link del mail. Elegí la contraseña que vas a usar de ahora en más.</div>}
        {[{ label: "Nueva contraseña", val: nueva, set: setNueva }, { label: "Confirmar contraseña", val: confirm, set: setConfirm }].map(f => (
          <label key={f.label} style={{ display: "block", marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginBottom: 6 }}>{f.label}</div>
            <input type="password" autoComplete="new-password" value={f.val} onChange={e => f.set(e.target.value)} style={T.input} />
          </label>
        ))}
        {error && <div style={{ color: "var(--bad)", fontSize: 13, marginBottom: 12, background: "color-mix(in srgb, var(--bad) 7%, transparent)", borderRadius: "var(--r-sm)", padding: "8px 12px" }}>{error}</div>}
        {msg   && <div style={{ color: "var(--ok)", fontSize: 13, marginBottom: 12, background: "color-mix(in srgb, var(--ok) 7%, transparent)", borderRadius: "var(--r-sm)", padding: "8px 12px" }}>{msg}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          {!recuperacion && <button onClick={onClose} style={{ flex: 1, background: T.card2, border: `1px solid ${T.border}`, borderRadius: "var(--r-sm)", color: T.sub, padding: "10px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>}
          <button onClick={handleCambiar} disabled={load} style={{ flex: 2, background: "var(--accent)", border: "none", borderRadius: "var(--r-sm)", color: "var(--on-accent)", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>{load ? "Guardando..." : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}
