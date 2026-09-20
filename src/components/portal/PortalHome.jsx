import NuevoCasoModal from "./NuevoCasoModal.jsx";
import { useState, useEffect, useCallback, Component } from "react";
import { supabase } from "../../supabase.js";
import { useRealtimeCasos } from "../../hooks/useRealtimeSync.js";
import { ESTADOS_CASO, fmtDate, fmtMoney, theme } from "./portalTheme.js";
import PortalCasoCard from "./PortalCasoCard.jsx";
import CambiarPasswordModal from "./CambiarPasswordModal.jsx";
import GraficoCompanias from "../GraficoCompanias.jsx";

class GraficoBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error ? null : this.props.children;
  }
}

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
  nota: "Este es un caso de ejemplo.",
  mensaje_cliente: "El reclamo ya fue ingresado a la compañía.",
  notas_log: [],
  _demo: true,
};

export default function PortalHome({ session, onLogout, dark, onToggleDark }) {
  const T = theme(dark);
  const [pasInfo, setPasInfo] = useState(null);
  const [casos,   setCasos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [cambPwd, setCambPwd] = useState(false);
  const [modalNuevoCaso, setModalNuevoCaso] = useState(false);
  
  const [filtrosEstados, setFiltrosEstados] = useState(() => ESTADOS_CASO.map(e => e.key));
  
  const [pasId,   setPasId]   = useState(null);
  const [todosLosCasos, setTodosLosCasos] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { data: link, error: linkErr } = await supabase.from("pas_portal_users").select("pas_id").eq("user_id", session.user.id).single();
      if (linkErr || !link) { setError("Tu usuario no está vinculado a ningún PAS."); setLoading(false); return; }
      setPasId(link.pas_id);
      
      const { data: pas } = await supabase.from("pas_lista").select("nombre, mail, telefonos").eq("pas_id", link.pas_id).single();
      setPasInfo(pas);
      
      let queryCasos = supabase.from("pas_casos").select("*");
      if (session.user.email !== "atglexsolutions@gmail.com") {
        queryCasos = queryCasos.eq("pas_id", link.pas_id);
      } else {
        queryCasos = queryCasos.order("created_at", { ascending: false }); 
      }
      const { data: casosData } = await queryCasos;

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
          const oldLog = (c.notas_log || []).filter(n => !dbAcciones.some(a => a.texto === n.texto && a.fecha === n.fecha));
          return { ...c, notas_log: [...dbAcciones, ...oldLog] };
        });
        setCasos(casosConAcciones);
      } else {
        setCasos([DEMO_CASO]);
      }
      setLoading(false);
    };
    loadData();

    supabase.from("pas_casos").select("compania,compania_aseguradora,fecha_inicio_reclamo,fecha_ofrecimiento,fecha_cobro,monto_cobro_asegurado,monto_reclamado").then(({ data }) => {
      if (data) setTodosLosCasos(data);
    });
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

  const toggleFiltroEstado = (key) => setFiltrosEstados(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const seleccionarTodosLosEstados = () => setFiltrosEstados(ESTADOS_CASO.map(e => e.key));
  const limpiarEstados = () => setFiltrosEstados([]);
  const seleccionarSoloActivos = () => setFiltrosEstados(ESTADOS_CASO.filter(e => !["cobrado", "desistido"].includes(e.key)).map(e => e.key));
  
  const todosSeleccionados = filtrosEstados.length === ESTADOS_CASO.length;
  const casosFiltrados = casos.filter(c => filtrosEstados.includes(c.estado));
  const casosCobrados  = casos.filter(c => c.estado === "cobrado");
  const comisionTotal  = casosCobrados.reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0);
  const totalCobrado   = casosCobrados.reduce((s, c) => s + (Number(c.monto_cobro_asegurado) || 0), 0);
  const companiasUnicas = [...new Set(todosLosCasos.map(c => c.compania_aseguradora || c.compania).filter(Boolean))].sort();

  const pagosPendientes = casos
    .filter(c => c.estado === "esperando_pago" || (c.fecha_pago && c.estado !== "cobrado" && c.estado !== "desistido"))
    .sort((a, b) => new Date(a.fecha_pago || "2099-01-01") - new Date(b.fecha_pago || "2099-01-01"));

  if (loading) return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted }}>Cargando tus casos...</div>;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, transition: "background .3s" }}>
      {/* Header */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: "#6366f1", textTransform: "uppercase", letterSpacing: 2.5, fontWeight: 700 }}>PAS Tracker</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginTop: 1 }}>{pasInfo?.nombre || "Portal"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setModalNuevoCaso(true)} style={{ background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>➕ Nuevo Caso</button>
          <button onClick={onToggleDark} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 15 }}>{dark ? "☀️" : "🌙"}</button>
          <button onClick={() => setCambPwd(true)} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.sub, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🔒 Contraseña</button>
          <button onClick={onLogout} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.sub, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Salir</button>
        </div>
      </div>

      {/* NUEVO LAYOUT: Ancho ampliado y doble columna lateral */}
      <div style={{ display: "flex", gap: 24, maxWidth: 1400, margin: "0 auto", padding: "24px 32px", alignItems: "flex-start" }}>
        
        {/* SIDEBAR DOBLE */}
        <div style={{ display: "flex", gap: 16, flexShrink: 0, position: "sticky", top: 88, height: "calc(100vh - 110px)" }}>
          
          {/* COLUMNA 1: FILTROS */}
          <div style={{ width: 220, display: "flex", flexDirection: "column" }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px", height: "100%", overflowY: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Filtrar Estado:</span>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                  <button onClick={seleccionarSoloActivos} style={{ background: "none", border: "none", color: "#C9A227", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: 0 }}>⚡ Activos</button>
                  <button onClick={todosSeleccionados ? limpiarEstados : seleccionarTodosLosEstados} style={{ background: "none", border: "none", color: "#3B6E9E", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: 0 }}>{todosSeleccionados ? "Ninguno" : "Todos"}</button>
                </div>
              </div>
              
              {/* Filtros apilados en 1 sola columna con etiquetas de texto */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {ESTADOS_CASO.map(e => {
                  const cnt = casos.filter(c => c.estado === e.key).length;
                  const active = filtrosEstados.includes(e.key);
                  return (
                    <button key={e.key} onClick={() => toggleFiltroEstado(e.key)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: active ? e.color + "28" : T.card2, border: `1px solid ${active ? e.color : T.border}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer", transition: "all .15s", opacity: active ? 1 : 0.45 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 16 }}>{e.emoji}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: active ? e.color : T.text }}>{e.label}</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: cnt > 0 ? e.color : T.muted }}>{cnt}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COLUMNA 2: FUTUROS PAGOS */}
          <div style={{ width: 260, display: "flex", flexDirection: "column" }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>📅 Futuros Pagos</div>
              <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4, flex: 1 }}>
                {pagosPendientes.length === 0 ? (
                   <div style={{ fontSize: 12, color: T.sub, textAlign: "center", padding: "20px 0" }}>No hay pagos programados.</div>
                ) : (
                  pagosPendientes.map(p => (
                    <div key={p.id} style={{ background: T.card2, borderRadius: 10, padding: "14px", border: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 6 }}>{p.asegurado}</div>
                      <div style={{ fontSize: 12, color: "#06b6d4", fontWeight: 700, marginBottom: 8 }}>{p.fecha_pago ? fmtDate(p.fecha_pago) : "Fecha a confirmar"}</div>
                      
                      {/* Montos Asegurado y PAS */}
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
                        <div>
                          <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Asegurado</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>{fmtMoney(p.monto_cobro_asegurado)}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Tu Comisión</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#eab308" }}>{fmtMoney(p.monto_comision_pas)}</div>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Casos totales",  value: casos.length, color: "#6366f1" },
              { label: "Cobrados",       value: casosCobrados.length, color: "#22c55e" },
              { label: "En proceso",     value: casos.filter(c => !["cobrado","desistido"].includes(c.estado)).length, color: "#f97316" },
            ].map(s => (
              <div key={s.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 8, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {comisionTotal > 0 && (
            <div style={{ background: T.card, border: "1px solid #eab30844", borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "#eab308", textTransform: "uppercase", letterSpacing: 1, fontWeight: 800 }}>Tu comisión total cobrada</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#eab308", marginTop: 4 }}>{fmtMoney(comisionTotal)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>Asegurados cobrados</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#22c55e", marginTop: 2 }}>{fmtMoney(totalCobrado)}</div>
              </div>
            </div>
          )}

          {casos.length > 0 && casos[0]?._demo && <div style={{ background: "#6366f118", border: "1px solid #6366f144", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#818cf8" }}>👋 Todavía no tenés casos asignados. Este es un ejemplo de cómo se verán.</div>}
          {casosFiltrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <div style={{ color: T.muted, fontSize: 16 }}>No hay casos con los filtros seleccionados</div>
            </div>
          ) : (
            casosFiltrados.sort((a, b) => (b.fecha_derivacion || "").localeCompare(a.fecha_derivacion || "")).map(c => <PortalCasoCard key={c.id} caso={c} dark={dark} />)
          )}

          {todosLosCasos.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <GraficoBoundary>
                <GraficoCompanias allCasos={todosLosCasos} darkMode={dark} cardBg={T.card} cardBorder={T.border} textColor={T.text} subColor={T.muted} mostrarCasos={false} />
              </GraficoBoundary>
            </div>
          )}
        </div>
      </div>

      {cambPwd && <CambiarPasswordModal onClose={() => setCambPwd(false)} dark={dark} />}
      {modalNuevoCaso && <NuevoCasoModal pasId={pasId} pasNombre={pasInfo?.nombre} onClose={() => setModalNuevoCaso(false)} onCasoCreado={(nuevo) => setCasos(prev => [nuevo, ...prev])} dark={dark} companias={companiasUnicas} />}
    </div>
  );
}