import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabase.js";
import { useRealtimeCasos } from "../../hooks/useRealtimeSync.js";
import { ESTADOS_CASO, fmtDate, fmtMoney, theme } from "./portalTheme.js";
import PortalCasoCard from "./PortalCasoCard.jsx";
import CambiarPasswordModal from "./CambiarPasswordModal.jsx";

const DEMO_CASO = {
  id: "demo",
  asegurado: "Ejemplo: García Juan (caso de demostración)",
  estado: "reclamado",
  fecha_derivacion: new Date().toISOString().slice(0, 10),
  fecha_contacto_asegurado: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
  fecha_inicio_reclamo: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
  fecha_ultimo_movimiento: new Date().toISOString().slice(0, 10),
  monto_ofrecimiento: "",
  monto_cobro_asegurado: "",
  monto_cobro_yo: "",
  monto_comision_pas: "",
  nota: "Este es un caso de ejemplo para que puedas ver cómo se verán tus casos reales.",
  notas_log: [
    { texto: "Se inició el reclamo ante la aseguradora del tercero.", fecha: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), ts: Date.now() - 200000 },
    { texto: "Tomé contacto con el asegurado. Nos envió la documentación.", fecha: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), ts: Date.now() - 300000 },
  ],
  _demo: true,
};

export default function PortalHome({ session, onLogout, dark, onToggleDark }) {
  const T = theme(dark);
  const [pasInfo, setPasInfo] = useState(null);
  const [casos,   setCasos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [cambPwd, setCambPwd] = useState(false);
  const [filtro,  setFiltro]  = useState("todos");
  const [pasId,   setPasId]   = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { data: link, error: linkErr } = await supabase.from("pas_portal_users").select("pas_id").eq("user_id", session.user.id).single();
      if (linkErr || !link) { setError("Tu usuario no está vinculado a ningún PAS. Contactá al administrador."); setLoading(false); return; }
      setPasId(link.pas_id);
      const { data: pas } = await supabase.from("pas_lista").select("nombre, mail, telefonos").eq("pas_id", link.pas_id).single();
      setPasInfo(pas);
      const { data: casosData } = await supabase.from("pas_casos").select("*").eq("pas_id", link.pas_id);
      if (casosData?.length) {
        const casoIds = casosData.map(c => c.id);
        const { data: accionesData } = await supabase.from("acciones").select("*").in("caso_id", casoIds).order("fecha", { ascending: false });
        const accionesPorCaso = {};
        (accionesData || []).forEach(a => {
          if (!accionesPorCaso[a.caso_id]) accionesPorCaso[a.caso_id] = [];
          accionesPorCaso[a.caso_id].push({ texto: a.descripcion, fecha: a.fecha, ts: new Date(a.fecha).getTime() });
        });
        const casosConAcciones = casosData.map(c => {
          const dbAcciones = accionesPorCaso[c.id] || [];
          const oldLog = (c.notas_log || []).filter(n =>
            !dbAcciones.some(a => a.texto === n.texto && a.fecha === n.fecha)
          );
          return { ...c, notas_log: [...dbAcciones, ...oldLog] };
        });
        setCasos(casosConAcciones);
      } else {
        setCasos([DEMO_CASO]);
      }
      setLoading(false);
    };
    loadData();
  }, [session]);

  const handleRealtimeUpdate = useCallback((casoActualizado) => {
    setCasos(prev => {
      const index = prev.findIndex(c => c.id === casoActualizado.id);
      if (index !== -1) {
        const nuevo = [...prev];
        nuevo[index] = casoActualizado;
        return nuevo;
      }
      return [...prev, casoActualizado];
    });
  }, []);

  useRealtimeCasos(pasId, handleRealtimeUpdate);

  const casosFiltrados = casos.filter(c => filtro === "todos" || c.estado === filtro);
  const casosCobrados  = casos.filter(c => c.estado === "cobrado");
  const comisionTotal  = casosCobrados.reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0);
  const totalCobrado   = casosCobrados.reduce((s, c) => s + (Number(c.monto_cobro_asegurado) || 0), 0);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: T.muted, fontSize: 14 }}>Cargando tus casos...</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: T.card, border: "1px solid #ef444444", borderRadius: 16, padding: 32, maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <div style={{ color: "#ef4444", fontSize: 14, marginBottom: 20 }}>{error}</div>
        <button onClick={onLogout} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.sub, padding: "8px 18px", cursor: "pointer", fontSize: 13 }}>Cerrar sesión</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, transition: "background .3s" }}>
      {/* Header */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: dark ? "none" : "0 1px 8px #00000010" }}>
        <div>
          <div style={{ fontSize: 10, color: "#6366f1", textTransform: "uppercase", letterSpacing: 2.5, fontWeight: 700 }}>PAS Tracker</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginTop: 1 }}>{pasInfo?.nombre || "Portal"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={onToggleDark} title={dark ? "Modo claro" : "Modo oscuro"} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 15 }}>
            {dark ? "☀️" : "🌙"}
          </button>
          <button onClick={() => setCambPwd(true)} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.sub, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🔒 Contraseña</button>
          <button onClick={onLogout} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.sub, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Salir</button>
        </div>
      </div>

      <div style={{ maxWidth: 660, margin: "0 auto", padding: "24px 16px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Casos totales",  value: casos.length, color: "#6366f1" },
            { label: "Cobrados",       value: casosCobrados.length, color: "#22c55e" },
            { label: "En proceso",     value: casos.filter(c => !["cobrado","iniciado","doc_pendiente","desistido"].includes(c.estado)).length, color: "#f97316" },
          ].map(s => (
            <div key={s.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 12px", textAlign: "center", boxShadow: dark ? "none" : "0 1px 4px #00000008" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 5, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Comisión */}
        {comisionTotal > 0 && (
          <div style={{ background: T.card, border: "1px solid #eab30844", borderRadius: 14, padding: "16px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: dark ? "none" : "0 1px 4px #00000008" }}>
            <div>
              <div style={{ fontSize: 11, color: "#eab308", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Tu comisión total cobrada</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#eab308", marginTop: 4 }}>{fmtMoney(comisionTotal)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>Asegurados cobrados</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#22c55e", marginTop: 2 }}>{fmtMoney(totalCobrado)}</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingBottom: 6, marginBottom: 18 }}>
          {[{ key: "todos", label: "Todos", emoji: "📂", color: "#64748b" }, ...ESTADOS_CASO].map(e => {
            const cnt = e.key === "todos" ? casos.length : casos.filter(c => c.estado === e.key).length;
            const active = filtro === e.key;
            return (
              <button key={e.key} onClick={() => setFiltro(e.key)} style={{
                flexShrink: 0,
                display: "flex", alignItems: "center", gap: 4,
                background: active ? e.color + "20" : T.card,
                border: `1px solid ${active ? e.color : T.border}`,
                borderRadius: 8,
                color: active ? e.color : T.muted,
                padding: "5px 10px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                transition: "all .15s",
                boxShadow: dark ? "none" : "0 1px 3px #00000008",
              }}>
                <span>{e.emoji}</span>
                <span>{e.label}</span>
                {cnt > 0 && <span style={{ background: active ? e.color + "30" : T.card2, color: active ? e.color : T.muted, borderRadius: 10, padding: "0 5px", fontSize: 10, fontWeight: 700 }}>{cnt}</span>}
              </button>
            );
          })}
        </div>

        {/* Casos */}
        {casos.length > 0 && casos[0]?._demo && (
          <div style={{ background: "#6366f118", border: "1px solid #6366f144", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#818cf8" }}>
            👋 Todavía no tenés casos asignados. Este es un ejemplo de cómo se verán.
          </div>
        )}
        {casosFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ color: T.muted, fontSize: 15 }}>No hay casos con ese filtro</div>
          </div>
        ) : (
          casosFiltrados
            .sort((a, b) => (b.fecha_derivacion || "").localeCompare(a.fecha_derivacion || ""))
            .map(c => <PortalCasoCard key={c.id} caso={c} dark={dark} />)
        )}
      </div>

      {cambPwd && <CambiarPasswordModal onClose={() => setCambPwd(false)} dark={dark} />}
    </div>
  );
}
