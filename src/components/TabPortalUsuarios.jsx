import { useState, useEffect } from "react";
import { supabase } from "../supabase.js";
import { THEME, COLORES } from "../utils/theme.js";

export default function TabPortalUsuarios({ pas, derivadores, darkMode }) {
  const T = THEME(darkMode);
  const [portalUsers, setPortalUsers] = useState([]);
  const [loading, setLoading]        = useState(true);
  const [modal, setModal]            = useState(null);
  const [email, setEmail]            = useState("");
  const [pwd, setPwd]                = useState("");
  const [saving, setSaving]          = useState(false);
  const [msg, setMsg]                = useState("");
  const [error, setError]            = useState("");

  useEffect(() => { 
    loadUsers(); 
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("pas_portal_users").select("*");
      setPortalUsers(data || []);
    } catch (err) {
      console.error("Error loading portal users:", err);
      setPortalUsers([]);
    }
    setLoading(false);
  };

  const withUser = new Set((portalUsers || []).map(u => Number(u.pas_id)));
  const derivadoresList = pas.filter(p => derivadores[p.id]);

  const handleCrear = async () => {
    if (!email.trim() || pwd.length < 6) return;
    setSaving(true);
    setMsg("");
    setError("");

    try {
      const { data: signData, error: signErr } = await supabase.auth.signUp({ 
        email: email.trim(), 
        password: pwd 
      });
      
      if (signErr) { 
        setError("Error al crear usuario: " + signErr.message); 
        setSaving(false); 
        return; 
      }

      const userId = signData?.user?.id;
      if (!userId) { 
        setError("No se pudo obtener el ID del usuario"); 
        setSaving(false); 
        return; 
      }

      const { error: linkErr } = await supabase.from("pas_portal_users").insert({ 
        user_id: userId, 
        pas_id: modal.pas_id 
      });

      if (linkErr) { 
        setError("Error al vincular: " + linkErr.message); 
        setSaving(false); 
        return; 
      }

      setMsg("✅ Usuario creado correctamente");
      setSaving(false);
      setEmail("");
      setPwd("");
      loadUsers();
      
      setTimeout(() => { 
        setModal(null); 
        setMsg(""); 
      }, 1500);
    } catch (err) {
      setError("Error inesperado: " + err.message);
      setSaving(false);
    }
  };

  const handleEliminar = async (pas_id) => {
    if (!confirm("¿Eliminar acceso al portal de este PAS?")) return;
    try {
      await supabase.from("pas_portal_users").delete().eq("pas_id", pas_id);
      loadUsers();
    } catch (err) {
      console.error("Error deleting portal access:", err);
    }
  };

  const portalUrl = typeof window !== "undefined" ? window.location.origin + "/portal" : "https://example.com/portal";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "10px 0" }}>
      {/* Banner de URL del portal */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        <div>
          <div style={{ fontSize: 11, color: COLORES.brand, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>URL del portal para PAS</div>
          <div style={{ fontSize: 13, color: T.sub, fontFamily: "monospace" }}>{portalUrl}</div>
        </div>
        <button onClick={() => navigator.clipboard.writeText(portalUrl)} style={{ background: darkMode ? "#1E2738" : "#EFEFEA", border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
          📋 Copiar
        </button>
      </div>

      <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, fontWeight: 700 }}>
        Derivadores ({derivadoresList.length}) — {withUser.size} con acceso al portal
      </div>

      {derivadoresList.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", background: T.card, borderRadius: 14, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🤝</div>
          <div style={{ color: T.sub, fontSize: 14 }}>No tenés derivadores marcados aún</div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 32, color: T.muted }}>Cargando...</div>
      ) : (
        derivadoresList.map(p => {
          const tieneAcceso = withUser.has(Number(p.id));
          return (
            <div key={p.id} style={{ background: T.card, border: `1px solid ${tieneAcceso ? COLORES.success + "66" : T.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{p.nombre}</div>
                <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{p.mail || "Sin mail registrado"}</div>
              </div>
              <div>
                {tieneAcceso ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, background: COLORES.success + "22", color: COLORES.success, borderRadius: 6, padding: "4px 10px", fontWeight: 700 }}>✅ Con acceso</span>
                    <button onClick={() => handleEliminar(p.id)} style={{ background: COLORES.danger + "22", border: `1px solid ${COLORES.danger}44`, borderRadius: 6, color: COLORES.danger, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Revocar</button>
                  </div>
                ) : (
                  <button onClick={() => { setModal({ pas_id: p.id, nombre: p.nombre }); setEmail(p.mail || ""); setPwd(""); setMsg(""); setError(""); }} style={{ background: "transparent", border: `1px solid ${COLORES.brand}`, borderRadius: 8, color: COLORES.brand, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                    + Dar acceso
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "28px 24px", width: "100%", maxWidth: 400, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 4 }}>🔑 Dar acceso al portal</div>
            <div style={{ fontSize: 13, color: T.sub, marginBottom: 20 }}>{modal.nombre}</div>
            
            <label style={{ display: "block", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Email de acceso</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mail del PAS" style={T.input} />
            </label>
            
            <label style={{ display: "block", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Contraseña inicial</div>
              <input type="text" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Mínimo 6 caracteres" style={T.input} />
              <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>El PAS podrá cambiarla desde el portal</div>
            </label>
            
            {error && <div style={{ background: COLORES.danger + "22", border: `1px solid ${COLORES.danger}66`, borderRadius: 8, padding: "8px 12px", color: COLORES.danger, fontSize: 13, marginBottom: 14 }}>{error}</div>}
            {msg   && <div style={{ background: COLORES.success + "22", border: `1px solid ${COLORES.success}66`, borderRadius: 8, padding: "8px 12px", color: COLORES.success, fontSize: 13, marginBottom: 14 }}>{msg}</div>}
            
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.sub, padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancelar</button>
              <button onClick={handleCrear} disabled={saving || !email.trim() || pwd.length < 6} style={{ flex: 2, background: saving ? T.muted : COLORES.brand, border: "none", borderRadius: 10, color: "#fff", padding: "10px", cursor: saving ? "default" : "pointer", fontSize: 14, fontWeight: 700 }}>
                {saving ? "Creando..." : "Crear acceso"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}