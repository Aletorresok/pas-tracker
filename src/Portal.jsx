import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import LoginScreen from "./components/portal/LoginScreen.jsx";
import PortalHome from "./components/portal/PortalHome.jsx";
import CambiarPasswordModal from "./components/portal/CambiarPasswordModal.jsx";
import { useTheme } from "./context/ThemeContext.jsx"; // <-- Importamos el contexto global

export default function Portal() {
  const [session, setSession] = useState(undefined);
  // Volvió del mail de "Olvidé mi contraseña": entra con sesión temporal y tiene que elegir una nueva
  const [recuperando, setRecuperando] = useState(() => typeof window !== "undefined" && (/type=recovery/.test(window.location.hash) || new URLSearchParams(window.location.search).has("recuperar")));
  const { darkMode, toggleDarkMode } = useTheme(); // <-- Consumimos el tema global de la app

  // /portal/demo: demostración con casos inventados, sin cuenta (para mostrarle el portal a un PAS)
  const demo = typeof window !== "undefined" && /^\/portal\/demo\/?$/.test(window.location.pathname);

  useEffect(() => {
    if (demo) return;
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === "PASSWORD_RECOVERY") setRecuperando(true);
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, [demo]);

  if (demo) return <PortalHome demo dark={darkMode} onToggleDark={toggleDarkMode} onLogout={() => { window.location.href = "/portal/"; }} />;

  if (session === undefined) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ color: "var(--sub)", fontSize: 14 }}>Cargando portal...</div>
    </div>
  );

  // Pasamos darkMode y toggleDarkMode usando el contexto global
  if (!session) return <LoginScreen dark={darkMode} onToggleDark={toggleDarkMode} />;
  return (
    <>
      <PortalHome session={session} dark={darkMode} onToggleDark={toggleDarkMode} onLogout={() => supabase.auth.signOut()} />
      {recuperando && <CambiarPasswordModal recuperacion dark={darkMode} onClose={() => { setRecuperando(false); window.history.replaceState(null, "", window.location.pathname); }} />}
    </>
  );
}