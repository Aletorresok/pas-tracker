import { useState } from "react";
import { supabase } from "../../supabase.js";
import { theme } from "./portalTheme.js";

export default function LoginScreen({ dark, onToggleDark }) {
  const T = theme(dark);
  const [email, setEmail] = useState("");
  const [pwd,   setPwd]   = useState("");
  const [error, setError] = useState("");
  const [load,  setLoad]  = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !pwd.trim()) return;
    setLoad(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pwd });
    setLoad(false);
    if (err) setError("Usuario o contraseña incorrectos");
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, transition: "background .3s" }}>
      <button onClick={onToggleDark} style={{ position: "absolute", top: 16, right: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16, color: T.sub }}>
        {dark ? "☀️" : "🌙"}
      </button>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 400, boxShadow: dark ? "0 24px 60px #0008" : "0 8px 40px #0000001a" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 11, color: "#6366f1", textTransform: "uppercase", letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>PAS Tracker</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.text, letterSpacing: -0.5 }}>Portal de Derivadores</div>
          <div style={{ fontSize: 14, color: T.muted, marginTop: 8 }}>Ingresá para ver el estado de tus casos</div>
        </div>
        <label style={{ display: "block", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 7, fontWeight: 600 }}>Email</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="tu@mail.com" style={T.input} />
        </label>
        <label style={{ display: "block", marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 7, fontWeight: 600 }}>Contraseña</div>
          <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="••••••••" style={T.input} />
        </label>
        {error && <div style={{ background: "#ef444415", border: "1px solid #ef444433", borderRadius: 10, padding: "10px 14px", color: "#ef4444", fontSize: 13, marginBottom: 18, textAlign: "center" }}>{error}</div>}
        <button onClick={handleLogin} disabled={load || !email.trim() || !pwd.trim()} style={{ width: "100%", background: (load || !email.trim() || !pwd.trim()) ? (dark ? "#334155" : "#e2e8f0") : "#6366f1", border: "none", borderRadius: 12, color: (load || !email.trim() || !pwd.trim()) ? T.muted : "white", padding: "13px", cursor: (load || !email.trim() || !pwd.trim()) ? "default" : "pointer", fontSize: 15, fontWeight: 800, transition: "all .2s", letterSpacing: 0.3 }}>
          {load ? "Ingresando..." : "Ingresar →"}
        </button>
      </div>
    </div>
  );
}
