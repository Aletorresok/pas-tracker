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
  // Link del mail vencido o ya usado: Supabase vuelve con el error en la dirección
  const [error, setError] = useState(() => typeof window !== "undefined" && /error_code=|error=access_denied/.test(window.location.hash) ? "El link del mail venció o ya se usó. Pedí uno nuevo con \"Olvidé mi contraseña\"." : "");
  const [load,  setLoad]  = useState(false);
  const [modo,  setModo]  = useState("ingresar"); // ingresar | recuperar | enviado

  // "Olvidé mi contraseña": Supabase manda un mail con un link que vuelve al portal para elegir una nueva
  const pedirLink = async () => {
    if (!email.trim()) { setError("Escribí tu mail"); return; }
    setLoad(true); setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/portal?recuperar=1` });
    setLoad(false);
    if (err) { setError(/rate|limit|seconds/i.test(err.message || "") ? "Ya te mandamos un link hace un momento. Esperá un minuto y probá de nuevo." : "No se pudo mandar el mail. Probá de nuevo en un rato."); return; }
    setModo("enviado");
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (modo !== "ingresar") { pedirLink(); return; }
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
        {modo === "enviado" ? (
          <div role="status" style={{ fontSize: 14, color: T.text, lineHeight: 1.5, background: "color-mix(in srgb, var(--ok) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 25%, transparent)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            Si <b>{email.trim()}</b> tiene acceso al portal, te llega un mail con un link para elegir una contraseña nueva. Revisá también Spam o Promociones.
          </div>
        ) : <>
          {modo === "recuperar" && <div style={{ fontSize: 14, color: T.sub, marginBottom: 14, lineHeight: 1.45 }}>Escribí el mail con el que entrás y te mandamos un link para elegir una contraseña nueva.</div>}
          <label style={{ display: "block", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: T.text, marginBottom: 6, fontWeight: 600 }}>Mail</div>
            <input type="email" autoComplete="username" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@mail.com" style={T.input} />
          </label>
          {modo === "ingresar" && (
            <label style={{ display: "block", marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: T.text, marginBottom: 6, fontWeight: 600 }}>Contraseña</div>
              <input type="password" autoComplete="current-password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="••••••••" style={T.input} />
            </label>
          )}
          {modo === "ingresar" && (
            <div style={{ textAlign: "right", marginBottom: 20 }}>
              <button type="button" onClick={() => { setModo("recuperar"); setError(""); }} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontSize: 13, color: "var(--accent-ink)", fontWeight: 600, cursor: "pointer" }}>Olvidé mi contraseña</button>
            </div>
          )}
          {error && <div style={{ background: "color-mix(in srgb, var(--bad) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--bad) 20%, transparent)", borderRadius: 10, padding: "10px 14px", color: "var(--bad)", fontSize: 13, marginBottom: 18, textAlign: "center" }}>{error}</div>}
          {(() => {
            const deshabilitado = load || !email.trim() || (modo === "ingresar" && !pwd.trim());
            return (
              <button type="submit" disabled={deshabilitado} style={{ width: "100%", background: deshabilitado ? "var(--border)" : "var(--accent)", border: "none", borderRadius: 12, color: deshabilitado ? T.muted : "var(--on-accent)", padding: "13px", cursor: deshabilitado ? "default" : "pointer", fontSize: 15, fontWeight: 800, transition: "all .2s", letterSpacing: 0.3 }}>
                {modo === "recuperar" ? (load ? "Mandando…" : "Mandarme el link") : (load ? "Ingresando…" : "Ingresar")}
              </button>
            );
          })()}
        </>}
        {modo !== "ingresar" && (
          <button type="button" onClick={() => { setModo("ingresar"); setError(""); }} style={{ display: "block", margin: "14px auto 0", background: "none", border: "none", padding: 0, font: "inherit", fontSize: 13, color: "var(--accent-ink)", fontWeight: 600, cursor: "pointer" }}>Volver a ingresar</button>
        )}
        <div style={{ fontSize: 13, color: T.muted, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
          ¿Todavía no tenés acceso o no te llega el mail?{" "}
          <a href={linkWhatsApp(TELEFONO_ESTUDIO, "Hola Alexis, necesito ayuda para entrar al portal de productores.")} target="_blank" rel="noreferrer" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>Escribinos por WhatsApp</a>
        </div>
      </form>
    </div>
  );
}
