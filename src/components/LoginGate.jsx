import { useState, useEffect } from "react";
import { supabase } from "../supabase.js";
import Boton from "./ui/Boton.jsx";

const APP_PIN = "3934";
const MAIL_ADMIN = "atglexsolutions@gmail.com";
const INTENTOS_PIN = 5;
const CLAVE_DESBLOQUEO = "pas_unlocked";

const leerSesion = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const guardarSesion = (k, v) => { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch { /* sin storage */ } };

// Cierra la sesión de este navegador: la próxima vez pide mail y contraseña
export async function cerrarSesion() {
  guardarSesion(CLAVE_DESBLOQUEO, null);
  await supabase.auth.signOut();
  window.location.reload();
}

// Dos pasos para entrar:
// 1) una sola vez por navegador, tu cuenta de Supabase (mail + contraseña). Es lo que da acceso a los datos.
// 2) cada vez que abrís la app, el PIN de siempre. A los 5 PIN incorrectos se cierra la sesión.
export default function LoginGate({ children }) {
  const [paso, setPaso] = useState("cargando"); // cargando | cuenta | pin | adentro
  const [mail, setMail] = useState(MAIL_ADMIN);
  const [clave, setClave] = useState("");
  const [pin, setPin] = useState("");
  const [fallos, setFallos] = useState(0);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // ¿Hay sesión y es de un administrador?
  const verificar = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return "cuenta";
    const { data, error: err } = await supabase.rpc("es_admin");
    if (err) { console.error("[LoginGate] es_admin:", err); return "error"; }
    if (!data) { await supabase.auth.signOut(); return "no_admin"; }
    return leerSesion(CLAVE_DESBLOQUEO) === "1" ? "adentro" : "pin";
  };

  const mostrar = (r) => {
    if (r === "error") { setError("No se pudo verificar tu cuenta. Revisá la conexión y probá de nuevo."); setPaso("cuenta"); }
    else if (r === "no_admin") { setError("Esa cuenta no tiene acceso a la app."); setPaso("cuenta"); }
    else { setError(""); setPaso(r); }
  };

  useEffect(() => { verificar().then(mostrar); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const entrarConCuenta = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email: mail.trim(), password: clave });
    if (err) {
      setError(/invalid login/i.test(err.message || "") ? "Mail o contraseña incorrectos." : "No se pudo entrar. Revisá la conexión.");
      setEnviando(false);
      return;
    }
    const r = await verificar();
    setEnviando(false);
    setClave("");
    mostrar(r);
  };

  const entrarConPin = async (e) => {
    e.preventDefault();
    if (pin === APP_PIN) {
      guardarSesion(CLAVE_DESBLOQUEO, "1");
      setPaso("adentro");
      return;
    }
    const n = fallos + 1;
    setFallos(n);
    setPin("");
    if (n >= INTENTOS_PIN) {
      await supabase.auth.signOut();
      setFallos(0);
      setError("Demasiados intentos. Por seguridad, ingresá de nuevo con tu mail y contraseña.");
      setPaso("cuenta");
    } else {
      setError(`PIN incorrecto. Te quedan ${INTENTOS_PIN - n} intentos.`);
    }
  };

  if (paso === "adentro") return children;

  const campo = { background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text)", padding: "11px 12px", fontSize: 15, width: "100%", boxSizing: "border-box", fontFamily: "inherit", outline: "none" };
  const etiqueta = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "32px 24px", maxWidth: 360, width: "100%", boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)" }}>PT</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>PAS Tracker</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>ATG Lex Solutions</div>
          </div>
        </div>

        {paso === "cargando" && <div style={{ color: "var(--sub)", fontSize: 14 }}>Verificando…</div>}

        {paso === "cuenta" && (
          <form onSubmit={entrarConCuenta} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 14, color: "var(--sub)", lineHeight: 1.45 }}>Primera vez en este navegador: entrá con tu cuenta. Después solo te va a pedir el PIN.</div>
            <label>
              <span style={etiqueta}>Mail</span>
              <input type="email" value={mail} onChange={e => setMail(e.target.value)} autoComplete="username" style={campo} />
            </label>
            <label>
              <span style={etiqueta}>Contraseña</span>
              <input type="password" value={clave} onChange={e => setClave(e.target.value)} autoComplete="current-password" autoFocus style={campo} />
            </label>
            {error && <div role="alert" style={{ color: "var(--bad)", fontSize: 13, lineHeight: 1.4 }}>{error}</div>}
            <Boton variante="primario" type="submit" disabled={enviando || !mail.trim() || !clave} style={{ width: "100%", padding: 12, fontSize: 15 }}>
              {enviando ? "Entrando…" : "Entrar"}
            </Boton>
          </form>
        )}

        {paso === "pin" && (
          <form onSubmit={entrarConPin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label>
              <span style={{ ...etiqueta, textAlign: "center" }}>Ingresá tu PIN</span>
              <input type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} autoFocus aria-label="PIN"
                style={{ ...campo, textAlign: "center", letterSpacing: 8, fontSize: 20, borderColor: error ? "var(--bad)" : "var(--border2)" }} />
            </label>
            {error && <div role="alert" style={{ color: "var(--bad)", fontSize: 13, textAlign: "center" }}>{error}</div>}
            <Boton variante="primario" type="submit" disabled={!pin} style={{ width: "100%", padding: 12, fontSize: 15 }}>Entrar</Boton>
          </form>
        )}
      </div>
    </div>
  );
}
