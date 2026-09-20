import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import LoginScreen from "./components/portal/LoginScreen.jsx";
import PortalHome from "./components/portal/PortalHome.jsx";

export default function Portal() {
  const [session, setSession] = useState(undefined);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return (
    <div style={{ minHeight: "100vh", background: "#10151F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ color: "#8D93A1", fontSize: 14 }}>Cargando portal...</div>
    </div>
  );

  if (!session) return <LoginScreen dark={dark} onToggleDark={() => setDark(d => !d)} />;
  return <PortalHome session={session} dark={dark} onToggleDark={() => setDark(d => !d)} onLogout={() => supabase.auth.signOut()} />;
}