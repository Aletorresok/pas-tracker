import { useState } from "react";
import { supabase } from "../../supabase.js";
import { theme } from "./portalTheme.js";
import Icono from "../ui/Icono.jsx";
import Logo from "../ui/Logo.jsx";
import { linkWhatsApp, TELEFONO_ESTUDIO } from "../../utils/mensajes.js";

export default function LoginScreen({ dark, onToggleDark }) {
  const T = theme(dark);
  const [email, setEmail] = useState("");
  const [pwd,   setPwd]   = useState("");
  const [error, setError] = useState("");
  const [load,  setLoad]  = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !pwd.trim()) return;
    setLoad(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pwd });
    setLoad(false);
    if (err) setError("Usuario o contraseña incorrectos");
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, transition: "background .3s" }}>
      <button type="button" onClick={onToggleDark} aria-label={dark ? "Modo claro" : "Modo oscuro"} style={{ position: "absolute", top: 16, right: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16, color: T.sub }}>
        <Icono nombre={dark ? "sol" : "luna"} size={16} />
      </button>
      <form onSubmit={handleLogin} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: "clamp(28px, 7vw, 40px) clamp(20px, 6vw, 36px)", width: "100%", maxWidth: 400, boxShadow: "var(--shadow)", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Logo alto={44} style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>ATG Lex Solutions</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>Portal de productores</h1>
          <div style={{ fontSize: 14, color: T.muted, marginTop: 8 }}>Ingresá para ver el estado de tus casos</div>
        </div>
        <label style={{ display: "block", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: T.text, marginBottom: 6, fontWeight: 600 }}>Mail</div>
          <input type="email" autoComplete="username" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@mail.com" style={T.input} />
        </label>
        <label style={{ display: "block", marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: T.text, marginBottom: 6, fontWeight: 600 }}>Contraseña</div>
          <input type="password" autoComplete="current-password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="••••••••" style={T.input} />
        </label>
        {error && <div style={{ background: "color-mix(in srgb, var(--bad) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--bad) 20%, transparent)", borderRadius: 10, padding: "10px 14px", color: "var(--bad)", fontSize: 13, marginBottom: 18, textAlign: "center" }}>{error}</div>}
        <button type="submit" disabled={load || !email.trim() || !pwd.trim()} style={{ width: "100%", background: (load || !email.trim() || !pwd.trim()) ? ("var(--border)") : "var(--accent)", border: "none", borderRadius: 12, color: (load || !email.trim() || !pwd.trim()) ? T.muted : "var(--on-accent)", padding: "13px", cursor: (load || !email.trim() || !pwd.trim()) ? "default" : "pointer", fontSize: 15, fontWeight: 800, transition: "all .2s", letterSpacing: 0.3 }}>
          {load ? "Ingresando…" : "Ingresar"}
        </button>
        <div style={{ fontSize: 13, color: T.muted, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
          ¿Olvidaste la contraseña o todavía no tenés acceso?{" "}
          <a href={linkWhatsApp(TELEFONO_ESTUDIO, "Hola Alexis, necesito ayuda para entrar al portal de productores.")} target="_blank" rel="noreferrer" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>Escribinos por WhatsApp</a>
        </div>
      </form>
    </div>
  );
}
