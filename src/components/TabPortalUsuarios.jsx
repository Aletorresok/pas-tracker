import { useState, useEffect } from "react";
import { supabase } from "../supabase.js";

export default function TabPortalUsuarios({ pas, derivadores, darkMode }) {
  const [portalUsers, setPortalUsers] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);
  const [email, setEmail]             = useState("");
  const [pwd, setPwd]                 = useState("");
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState("");
  const [error, setError]             = useState("");

  const iStyle = darkMode
    ? { background: "#0f1e35", border: "1px solid #1e3a5f", borderRadius: 10, color: "#f1f5f9", padding: "9px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" }
    : { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, color: "#1e293b", padding: "9px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" };

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
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 0" }}>
      <div style={{ background: darkMode ? "#0a1628" : "#f0f4ff", border: `1px solid ${darkMode ? "#1e3a5f" : "#c7d7fe"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "#6366f1", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>URL del portal para PAS</div>
          <div style={{ fontSize: 13, color: darkMode ? "#94a3b8" : "#475569", fontFamily: "monospace" }}>{portalUrl}</div>
        </div>
        <button onClick={() => navigator.clipboard.writeText(portalUrl)} style={{ background: "#6366f122", border: "1px solid #6366f144", borderRadius: 8, color: "#818cf8", padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
          📋 Copiar
        </button>
      </div>

      <div style={{ fontSize: 11, color: darkMode ? "#475569" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
        Derivadores ({derivadoresList.length}) — {withUser.size} con acceso al portal
      </div>

      {derivadoresList.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 20px", color: darkMode ? "#334155" : "#94a3b8" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🤝</div>
          <div>No tenés derivadores marcados aún</div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 24, color: darkMode ? "#475569" : "#94a3b8" }}>Cargando...</div>
      ) : (
        derivadoresList.map(p => {
          const tieneAcceso = withUser.has(Number(p.id));
          return (
            <div key={p.id} style={{ background: darkMode ? "#0a1628" : "#f8fafc", border: `1px solid ${tieneAcceso ? "#22c55e44" : darkMode ? "#1a2f4a" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#f1f5f9" : "#1e293b" }}>{p.nombre}</div>
                <div style={{ fontSize: 12, color: darkMode ? "#475569" : "#94a3b8" }}>{p.mail}</div>
              </div>
              <div>
                {tieneAcceso ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, background: "#22c55e22", color: "#22c55e", borderRadius: 6, padding: "3px 8px", fontWeight: 700 }}>✅ Con acceso</span>
                    <button onClick={() => handleEliminar(p.id)} style={{ background: "#ef444422", border: "1px solid #ef444444", borderRadius: 6, color: "#ef4444", padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>Revocar</button>
                  </div>
                ) : (
                  <button onClick={() => { setModal({ pas_id: p.id, nombre: p.nombre }); setEmail(p.mail || ""); setPwd(""); setMsg(""); setError(""); }} style={{ background: "#6366f122", border: "1px solid #6366f144", borderRadius: 8, color: "#818cf8", padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                    + Dar acceso
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: darkMode ? "#0c1424" : "#fff", border: `1px solid ${darkMode ? "#1e3a5f" : "#e2e8f0"}`, borderRadius: 16, padding: "28px 24px", width: "100%", maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 700, color: darkMode ? "#f1f5f9" : "#1e293b", marginBottom: 4 }}>🔑 Dar acceso al portal</div>
            <div style={{ fontSize: 13, color: darkMode ? "#475569" : "#94a3b8", marginBottom: 20 }}>{modal.nombre}</div>
            
            <label style={{ display: "block", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: darkMode ? "#475569" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Email de acceso</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mail del PAS" style={iStyle} />
            </label>
            
            <label style={{ display: "block", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: darkMode ? "#475569" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Contraseña inicial</div>
              <input type="text" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Mínimo 6 caracteres" style={iStyle} />
              <div style={{ fontSize: 11, color: darkMode ? "#334155" : "#94a3b8", marginTop: 5 }}>El PAS podrá cambiarla desde el portal</div>
            </label>
            
            {error && <div style={{ background: "#ef444422", border: "1px solid #ef444466", borderRadius: 8, padding: "8px 12px", color: "#ef4444", fontSize: 13, marginBottom: 14 }}>{error}</div>}
            {msg   && <div style={{ background: "#22c55e22", border: "1px solid #22c55e66", borderRadius: 8, padding: "8px 12px", color: "#22c55e", fontSize: 13, marginBottom: 14 }}>{msg}</div>}
            
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, background: darkMode ? "#1e293b" : "#f1f5f9", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 10, color: darkMode ? "#94a3b8" : "#64748b", padding: "10px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
              <button onClick={handleCrear} disabled={saving || !email.trim() || pwd.length < 6} style={{ flex: 2, background: saving ? "#334155" : "#6366f1", border: "none", borderRadius: 10, color: "white", padding: "10px", cursor: saving ? "default" : "pointer", fontSize: 14, fontWeight: 700 }}>
                {saving ? "Creando..." : "Crear acceso"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
