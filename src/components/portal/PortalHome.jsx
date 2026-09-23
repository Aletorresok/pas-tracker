import NuevoCasoModal from "./NuevoCasoModal.jsx";
import { useState, useEffect, useCallback, Component } from "react";
import { supabase } from "../../supabase.js";
import { useRealtimeCasos } from "../../hooks/useRealtimeSync.js";
import { ESTADOS_CASO, fmtDate, fmtMoney, theme } from "./portalTheme.js";
import PortalCasoCard from "./PortalCasoCard.jsx";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";
import CambiarPasswordModal from "./CambiarPasswordModal.jsx";
import GraficoCompanias from "../GraficoCompanias.jsx";
import { alpha } from "../../utils/theme.js";

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
  
  const [pasId,   setPasId]   = useState(null);
  const [todosLosCasos, setTodosLosCasos] = useState([]);
  const [pestana, setPestana] = useState("curso"); // curso | cobrados | desistidos | todos
  const [estadoSel, setEstadoSel] = useState(null); // estado puntual dentro de la pestaña
  const [busqueda, setBusqueda] = useState("");

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

    // Datos de todas las compañías sin nombres ni patentes (función plazos_companias en Supabase)
    supabase.rpc("plazos_companias").then(({ data }) => {
      if (Array.isArray(data)) setTodosLosCasos(data);
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

  const casosCobrados  = casos.filter(c => c.estado === "cobrado");
  const comisionTotal  = casosCobrados.reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0);
  const totalCobrado   = casosCobrados.reduce((s, c) => s + (Number(c.monto_cobro_asegurado) || 0), 0);
  const companiasUnicas = [...new Set(todosLosCasos.map(c => c.compania_aseguradora).filter(Boolean))].sort();

  const pagosPendientes = casos
    .filter(c => c.estado === "esperando_pago" || (c.fecha_pago && c.estado !== "cobrado" && c.estado !== "desistido"))
    .sort((a, b) => new Date(a.fecha_pago || "2099-01-01") - new Date(b.fecha_pago || "2099-01-01"));

  const enCurso = casos.filter(c => !["cobrado", "desistido"].includes(c.estado));
  const casosDesistidos = casos.filter(c => c.estado === "desistido");
  const baseLista = { curso: enCurso, cobrados: casosCobrados, desistidos: casosDesistidos }[pestana] || casos;
  // Estados presentes en la pestaña, para filtrar por uno puntual (ej. "En juicio")
  const estadosPestana = ESTADOS_CASO
    .map(e => ({ ...e, n: baseLista.filter(c => c.estado === e.key).length }))
    .filter(e => e.n > 0);
  const estadoActivo = estadosPestana.some(e => e.key === estadoSel) ? estadoSel : null;
  const q = busqueda.trim().toLowerCase();
  const lista = baseLista
    .filter(c => !estadoActivo || c.estado === estadoActivo)
    .filter(c => !q || (c.asegurado || "").toLowerCase().includes(q) || (c.patente || "").toLowerCase().includes(q) || (c.compania_aseguradora || "").toLowerCase().includes(q))
    .sort((a, b) => (b.fecha_ultimo_movimiento || b.fecha_derivacion || "").localeCompare(a.fecha_ultimo_movimiento || a.fecha_derivacion || ""));
  const proximo = pagosPendientes[0];
  const esDemo = casos[0]?._demo;

  if (loading) return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted }}>Cargando tus casos…</div>;

  const pestanaBtn = (k, l, n) => {
    const activa = pestana === k;
    return (
      <button key={k} type="button" role="tab" aria-selected={activa} onClick={() => { setPestana(k); setEstadoSel(null); }}
        style={{ flex: "none", background: "none", border: "none", borderBottom: `2px solid ${activa ? "var(--accent)" : "transparent"}`, padding: "8px 0 10px", cursor: "pointer", font: "inherit", fontSize: 14, fontWeight: activa ? 600 : 500, color: activa ? T.text : T.sub }}>
        {l} <span className="num" style={{ color: T.muted, fontSize: 12 }}>{n}</span>
      </button>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
      {/* Encabezado */}
      <header style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "12px 16px", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: T.accent, color: T.onAccent, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, fontFamily: "var(--mono)", flex: "none" }}>ATG</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>ATG Lex Solutions · Portal de productores</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pasInfo?.nombre || "Portal"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flex: "none" }}>
          <Boton variante="primario" icono="agregar" tamaño="sm" className="hide-mobile" onClick={() => setModalNuevoCaso(true)}>Derivar caso</Boton>
          <Boton variante="fantasma" tamaño="sm" icono={dark ? "sol" : "luna"} onClick={onToggleDark} aria-label={dark ? "Modo claro" : "Modo oscuro"} />
          <Boton variante="fantasma" tamaño="sm" icono="candado" onClick={() => setCambPwd(true)} aria-label="Cambiar contraseña" />
          <Boton variante="fantasma" tamaño="sm" icono="salir" onClick={onLogout} aria-label="Salir" />
        </div>
      </header>

      <div className="portal-grid" style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 24px 96px", display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
        {/* Resumen del PAS */}
        <aside className="portal-resumen" style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 84 }}>
          <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, color: T.sub }}>Tu comisión cobrada</div>
            <div className="num" style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-ink)", letterSpacing: -0.5 }}>{fmtMoney(comisionTotal || 0)}</div>
            {proximo && (
              <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
                Próximo cobro: <b className="num" style={{ color: T.text }}>{Number(proximo.monto_comision_pas) > 0 ? fmtMoney(proximo.monto_comision_pas) : proximo.asegurado}</b>
                {proximo.fecha_pago ? ` · ${fmtDate(proximo.fecha_pago)}` : " · fecha a confirmar"}
              </div>
            )}
            <div className="stats-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
              {[["En curso", enCurso.length], ["Cobrados", casosCobrados.length], ["Total", casos.filter(c => !c._demo).length]].map(([l, n]) => (
                <div key={l}><div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{n}</div><div style={{ fontSize: 12, color: T.muted }}>{l}</div></div>
              ))}
            </div>
            {totalCobrado > 0 && <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>Tus asegurados cobraron <b className="num" style={{ color: T.text }}>{fmtMoney(totalCobrado)}</b></div>}
          </section>

          {pagosPendientes.length > 0 && (
            <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Próximos cobros</div>
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {pagosPendientes.map((p, i) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 0", borderTop: i ? `1px solid ${T.border}` : "none", fontSize: 13 }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.asegurado}</span>
                      <span style={{ color: T.muted, fontSize: 12 }}>{p.fecha_pago ? fmtDate(p.fecha_pago) : "Fecha a confirmar"}</span>
                    </span>
                    {Number(p.monto_comision_pas) > 0 && <span className="num" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{fmtMoney(p.monto_comision_pas)}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>

        {/* Casos */}
        <main style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {esDemo && <div style={{ background: "color-mix(in srgb, var(--accent) 9%, var(--card))", borderRadius: 10, padding: "12px 14px", fontSize: 14 }}>Todavía no tenés casos derivados. Así se va a ver cada uno cuando derives el primero.</div>}

          <div role="tablist" aria-label="Mis casos" style={{ display: "flex", gap: 20, borderBottom: `1px solid ${T.border}`, overflowX: "auto" }}>
            {pestanaBtn("curso", "En curso", enCurso.length)}
            {pestanaBtn("cobrados", "Cobrados", casosCobrados.length)}
            {pestanaBtn("desistidos", "Desistidos", casosDesistidos.length)}
            {pestanaBtn("todos", "Todos", casos.length)}
          </div>

          {estadosPestana.length > 1 && (
            <div role="group" aria-label="Filtrar por estado" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
              {[{ key: null, label: "Todos los estados", n: baseLista.length }, ...estadosPestana].map(e => {
                const activo = estadoActivo === e.key;
                return (
                  <button key={e.key || "todos"} type="button" aria-pressed={activo} onClick={() => setEstadoSel(e.key)}
                    style={{ font: "inherit", flex: "none", whiteSpace: "nowrap", padding: "5px 12px", borderRadius: 999, fontSize: 12, cursor: "pointer", fontWeight: activo ? 700 : 500,
                      border: `1px solid ${activo ? T.text : T.border}`, background: T.card, color: activo ? T.text : T.sub }}>
                    {e.key && <span aria-hidden="true" style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: e.color, marginRight: 6 }} />}
                    {e.label} <span className="num" style={{ fontWeight: 700, color: T.text }}>{e.n}</span>
                  </button>
                );
              })}
            </div>
          )}

          {casos.length > 5 && (
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por asegurado, patente o compañía…" aria-label="Buscar casos"
              style={{ ...T.input, padding: "10px 12px" }} />
          )}

          {lista.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", color: T.sub, fontSize: 14 }}>
              {q ? "Ningún caso coincide con la búsqueda." : { cobrados: "Todavía no hay casos cobrados.", desistidos: "No hay casos desistidos.", todos: "Todavía no hay casos." }[pestana] || "No hay casos en curso."}
            </div>
          ) : (
            lista.map(c => <PortalCasoCard key={c.id} caso={c} />)
          )}

          {todosLosCasos.length > 0 && (
            <GraficoBoundary>
              <GraficoCompanias allCasos={todosLosCasos} darkMode={dark} cardBg={T.card} cardBorder={T.border} textColor={T.text} subColor={T.sub} mostrarCasos={false} />
            </GraficoBoundary>
          )}
        </main>
      </div>

      {/* Botón fijo para derivar en celular */}
      <button type="button" className="fab-derivar" onClick={() => setModalNuevoCaso(true)}>
        <Icono nombre="agregar" size={18} /> Derivar caso
      </button>

      {cambPwd && <CambiarPasswordModal onClose={() => setCambPwd(false)} dark={dark} />}
      {modalNuevoCaso && <NuevoCasoModal pasId={pasId} pasNombre={pasInfo?.nombre} onClose={() => setModalNuevoCaso(false)} onCasoCreado={(nuevo) => setCasos(prev => [nuevo, ...prev.filter(c => !c._demo)])} dark={dark} companias={companiasUnicas} />}
    </div>
  );
}