import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../supabase.js";
import Boton from "../ui/Boton.jsx";

// Cliente aparte para crear usuarios del portal: así el alta no reemplaza tu sesión de administrador
const clienteAltas = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, storageKey: "pas_altas_portal" },
});

export const urlPortal = () => (typeof window !== "undefined" ? window.location.origin + "/portal" : "");

// Ids de PAS con usuario en el portal (Set de strings). `null` mientras carga.
export function usePortalUsers() {
  const [ids, setIds] = useState(null);
  const recargar = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("pas_portal_users").select("pas_id");
      if (error) throw error;
      setIds(new Set((data || []).map(u => String(u.pas_id))));
    } catch (e) {
      console.error("[portal] usuarios:", e);
      setIds(new Set());
    }
  }, []);
  useEffect(() => { recargar(); }, [recargar]);
  return { ids, recargar };
}

// Chip + acción dentro de la fila desplegada de un cliente: "Dar acceso al portal" o "Con acceso · Quitar"
export default function AccesoPortal({ pas, tieneAcceso, onCambio }) {
  const [abierto, setAbierto] = useState(false);
  const [quitando, setQuitando] = useState(false);

  const quitar = async () => {
    if (!confirm(`¿Quitarle el acceso al portal a ${pas.nombre}?`)) return;
    setQuitando(true);
    const { error } = await supabase.from("pas_portal_users").delete().eq("pas_id", pas.id);
    setQuitando(false);
    if (error) { alert("No se pudo quitar el acceso: " + error.message); return; }
    onCambio();
  };

  return (
    <>
      {tieneAcceso ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ok)", background: "color-mix(in srgb, var(--ok) 13%, transparent)", borderRadius: 6, padding: "3px 8px" }}>Con acceso al portal</span>
          <Boton tamaño="sm" variante="fantasma" onClick={quitar} disabled={quitando}>{quitando ? "Quitando…" : "Quitar"}</Boton>
        </span>
      ) : (
        <Boton tamaño="sm" icono="portal" onClick={() => setAbierto(true)}>Dar acceso al portal</Boton>
      )}
      {abierto && <ModalAcceso pas={pas} onClose={() => setAbierto(false)} onCreado={() => { setAbierto(false); onCambio(); }} />}
    </>
  );
}

function ModalAcceso({ pas, onClose, onCreado }) {
  const [email, setEmail] = useState(pas.mail || "");
  const [pwd, setPwd] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  const crear = async () => {
    if (!email.trim() || pwd.length < 6) return;
    setGuardando(true); setError("");
    try {
      const { data, error: errAlta } = await clienteAltas.auth.signUp({ email: email.trim(), password: pwd });
      if (errAlta) throw new Error("Error al crear el usuario: " + errAlta.message);
      const userId = data?.user?.id;
      if (!userId) throw new Error("No se pudo obtener el ID del usuario");
      const { error: errLink } = await supabase.from("pas_portal_users").insert({ user_id: userId, pas_id: pas.id });
      if (errLink) throw new Error("Error al vincular: " + errLink.message);
      setListo(true);
      setTimeout(onCreado, 1200);
    } catch (e) {
      setError(e.message || "Error inesperado");
      setGuardando(false);
    }
  };

  const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sub)", marginBottom: 6 };
  const campo = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 18, width: "100%", maxWidth: 420, padding: "28px 24px", boxShadow: "0 20px 60px #0004" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Dar acceso al portal</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>{pas.nombre}</div>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={etiqueta}>Mail de acceso</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mail del PAS" style={campo} />
        </label>
        <label style={{ display: "block", marginBottom: 18 }}>
          <span style={etiqueta}>Contraseña inicial</span>
          <input type="text" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Mínimo 6 caracteres" style={campo} />
          <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 5 }}>El PAS la puede cambiar desde el portal. Entra en {urlPortal()}</span>
        </label>

        {error && <div role="alert" style={{ color: "var(--bad)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {listo && <div style={{ color: "var(--ok)", fontSize: 13, marginBottom: 12 }}>Acceso creado.</div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Boton variante="fantasma" onClick={onClose}>Cancelar</Boton>
          <Boton variante="primario" onClick={crear} disabled={guardando || listo || !email.trim() || pwd.length < 6}>{guardando ? "Creando…" : "Crear acceso"}</Boton>
        </div>
      </div>
    </div>
  );
}
