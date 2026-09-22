import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import LoginScreen from "./components/portal/LoginScreen.jsx";
import PortalHome from "./components/portal/PortalHome.jsx";
import { useTheme } from "./context/ThemeContext.jsx"; // <-- Importamos el contexto global

export default function Portal() {
  const [session, setSession] = useState(undefined);
  const { darkMode, toggleDarkMode } = useTheme(); // <-- Consumimos el tema global de la app

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ color: "var(--sub)", fontSize: 14 }}>Cargando portal...</div>
    </div>
  );

  // Pasamos darkMode y toggleDarkMode usando el contexto global
  if (!session) return <LoginScreen dark={darkMode} onToggleDark={toggleDarkMode} />;
  return <PortalHome session={session} dark={darkMode} onToggleDark={toggleDarkMode} onLogout={() => supabase.auth.signOut()} />;
}