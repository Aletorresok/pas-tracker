import NuevoCasoModal from "./NuevoCasoModal.jsx";
import { useState, useEffect, useCallback, Component } from "react";
import { supabase } from "../../supabase.js";
import { useRealtimeCasos } from "../../hooks/useRealtimeSync.js";
import { ESTADOS_CASO, fmtDate, fmtMoney, theme } from "./portalTheme.js";
import PortalCasoCard from "./PortalCasoCard.jsx";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";
import CambiarPasswordModal from "./CambiarPasswordModal.jsx";
import { useInstalarApp } from "../../hooks/useInstalarApp.js";
import GraficoCompanias from "../GraficoCompanias.jsx";
import PreguntasDemo from "./PreguntasDemo.jsx";
import Logo from "../ui/Logo.jsx";
import Ilustracion from "../ui/Ilustracion.jsx";
import { plazosRespuesta, comisionPagada, comisionPorPagar } from "../../utils/metricas.js";
import { fechaPagoEstimada } from "../../utils/vistaCliente.js";
import { diaDeAccion, fechaLocalISO, fechaEnDias } from "../../utils/formatters.js";
import { linkWhatsApp, TELEFONO_ESTUDIO } from "../../utils/mensajes.js";
import { PAS_DEMO, TEXTO_ACCESO, casosDemo, eventosDemo, plazosDemo, filasDesdePlazos } from "./demoPortal.js";
import { cargarPlazosPublicos } from "../../utils/consultas.js";

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
  fecha_derivacion: fechaLocalISO(),
  fecha_contacto_asegurado: fechaEnDias(-3),
  fecha_inicio_reclamo: fechaEnDias(-2),
  fecha_ultimo_movimiento: fechaLocalISO(),
  monto_ofrecimiento: "",
  monto_cobro_asegurado: "",
  monto_cobro_yo: "",
  monto_comision_pas: "",
  nota: "Este es un caso de ejemplo.",
  mensaje_cliente: "El reclamo ya fue ingresado a la compañía.",
  movimientos: [],
  _demo: true,
};

// demo: /portal/demo, con casos inventados y sin base de datos (ver demoPortal.js)
export default function PortalHome({ session, onLogout, dark, onToggleDark, demo = false }) {
  const T = theme(dark);
  const [pasInfo, setPasInfo] = useState(demo ? PAS_DEMO : null);
  const [casos,   setCasos]   = useState(() => (demo ? casosDemo() : []));
  const [loading, setLoading] = useState(!demo);
  const [error,   setError]   = useState(null); // null | "sin_vinculo" | "carga"
  const [intento, setIntento] = useState(0); // "Reintentar" vuelve a cargar
  const [cambPwd, setCambPwd] = useState(false);
  const [modalNuevoCaso, setModalNuevoCaso] = useState(false);
  
  const [pasId,   setPasId]   = useState(null);
  const [todosLosCasos, setTodosLosCasos] = useState(() => (demo ? plazosDemo() : []));
  // Demo: si están las estadísticas reales del estudio (SQL 48), reemplazan a las inventadas
  const [estadisticasReales, setEstadisticasReales] = useState(false);
  useEffect(() => {
    if (!demo) return;
    cargarPlazosPublicos().then(l => { const filas = filasDesdePlazos(l); if (filas.length) { setTodosLosCasos(filas); setEstadisticasReales(true); } });
  }, [demo]);
  const [pestana, setPestana] = useState("curso"); // curso | cobrados | desistidos | todos
  const [estadoSel, setEstadoSel] = useState(null); // estado puntual dentro de la pestaña
  const [busqueda, setBusqueda] = useState("");
  const [eventos, setEventos] = useState(() => (demo ? eventosDemo() : {})); // caso_id → próxima mediación/audiencia
  const app = useInstalarApp();
  const [menu, setMenu] = useState(false);
  const [fabVisible, setFabVisible] = useState(true);
  useEffect(() => {
    let ultimo = window.scrollY;
    const alMover = () => {
      const y = window.scrollY;
      if (Math.abs(y - ultimo) < 8) return;
      setFabVisible(y < ultimo || y < 80);
      ultimo = y;
    };
    window.addEventListener("scroll", alMover, { passive: true });
    return () => window.removeEventListener("scroll", alMover);
  }, []);

  useEffect(() => {
    if (demo) return; // la demostración arranca con sus datos (estado inicial)
    const loadData = async () => {
      setLoading(true); setError(null);
      const { data: link, error: linkErr } = await supabase.from("pas_portal_users").select("pas_id").eq("user_id", session.user.id).maybeSingle();
      if (linkErr) throw linkErr;
      if (!link) { setError("sin_vinculo"); setLoading(false); return; }
      setPasId(link.pas_id);
      
      const { data: pas } = await supabase.from("pas_lista").select("nombre, mail, telefonos").eq("pas_id", link.pas_id).single();
      setPasInfo(pas);
      
      // El admin (tabla pas_admins) ve todos los casos; cada PAS, solo los suyos
      const { data: esAdmin } = await supabase.rpc("es_admin");
      let queryCasos = supabase.from("pas_casos").select("*");
      if (esAdmin !== true) {
        queryCasos = queryCasos.eq("pas_id", link.pas_id);
      } else {
        queryCasos = queryCasos.order("created_at", { ascending: false }); 
      }
      const { data: casosData, error: casosErr } = await queryCasos;
      if (casosErr) throw casosErr;

      if (casosData?.length) {
        const casoIds = casosData.map(c => c.id);
        const { data: accionesData } = await supabase.from("acciones").select("*").eq("visible_pas", true).in("caso_id", casoIds).order("fecha", { ascending: false });
        const accionesPorCaso = {};
        (accionesData || []).forEach(a => {
          if (!accionesPorCaso[a.caso_id]) accionesPorCaso[a.caso_id] = [];
          accionesPorCaso[a.caso_id].push({ texto: a.descripcion, fecha: diaDeAccion(a.fecha), ts: new Date(a.fecha).getTime() });
        });
        const casosConAcciones = casosData.map(c => ({ ...c, movimientos: accionesPorCaso[c.id] || [] }));
        setCasos(casosConAcciones);

        // Próxima mediación/audiencia de cada caso (si falta el permiso del SQL 13, simplemente no se muestra)
        const { data: evs } = await supabase.from("pas_eventos").select("caso_id, tipo, inicio")
          .in("caso_id", casoIds).in("tipo", ["mediacion", "audiencia"])
          .gte("inicio", new Date(Date.now() - 2 * 3600e3).toISOString()).order("inicio");
        const prox = {};
        (evs || []).forEach(e => { if (!prox[e.caso_id]) prox[e.caso_id] = e; });
        setEventos(prox);
      } else {
        setCasos([DEMO_CASO]);
      }
      setLoading(false);
    };
    // Si falla la conexión no se muestra "sin casos" (ni el caso de ejemplo): se avisa y se puede reintentar
    loadData().catch(err => {
      console.error("[PortalHome] carga:", err);
      setError("carga");
      setLoading(false);
    });

    // Datos de todas las compañías sin nombres ni patentes (función plazos_companias en Supabase)
    supabase.rpc("plazos_companias").then(({ data }) => {
      if (Array.isArray(data)) setTodosLosCasos(data);
    });
  }, [session, demo, intento]);

  const handleRealtimeUpdate = useCallback((casoActualizado, evento) => {
    if (!casoActualizado?.id) return;
    if (evento === "DELETE") { setCasos(prev => prev.filter(c => c.id !== casoActualizado.id)); return; }
    setCasos(prev => {
      const index = prev.findIndex(c => c.id === casoActualizado.id);
      if (index !== -1) {
        const nuevo = [...prev];
        nuevo[index] = { ...casoActualizado, movimientos: prev[index].movimientos };
        return nuevo;
      }
      return [...prev, casoActualizado];
    });
  }, []);

  useRealtimeCasos(pasId, handleRealtimeUpdate);

  const casosCobrados  = casos.filter(c => c.estado === "cobrado");
  const comisionTotal  = casos.filter(c => !c._demo && comisionPagada(c)).reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0);
  // Ya cobrada por el estudio y todavía no pagada al PAS
  const comisionPendiente = casos.filter(c => !c._demo && comisionPorPagar(c)).reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0);
  const totalCobrado   = casosCobrados.reduce((s, c) => s + (Number(c.monto_cobro_asegurado) || 0), 0);
  // Cuánto suele tardar cada compañía en ofrecer (datos de todo el estudio, sin nombres)
  const plazos = plazosRespuesta(todosLosCasos);
  const companiasUnicas = [...new Set(todosLosCasos.map(c => c.compania_aseguradora).filter(Boolean))].sort();

  // Fecha de pago: la misma que muestra la tarjeta (firma + plazo del convenio, o la fecha cargada)
  const pagosPendientes = casos
    .filter(c => c.estado === "esperando_pago" || (c.fecha_pago && c.estado !== "cobrado" && c.estado !== "desistido"))
    .map(c => ({ ...c, _fechaPago: fechaPagoEstimada(c) }))
    .sort((a, b) => (a._fechaPago || "2099-01-01").localeCompare(b._fechaPago || "2099-01-01"));

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
  const esDemo = casos[0]?._demo;

  if (loading) return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted }}>Cargando tus casos…</div>;
  if (error) return (
    <div role="alert" style={{ minHeight: "100vh", background: T.bg, color: T.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
      <Logo alto={30} />
      <div style={{ fontSize: 15, maxWidth: 360, lineHeight: 1.5 }}>{error === "sin_vinculo" ? "Tu usuario todavía no está vinculado a un productor. Escribinos y lo activamos." : "No pudimos cargar tus casos. Revisá la conexión y probá de nuevo."}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {error === "sin_vinculo"
          ? <a href={linkWhatsApp(TELEFONO_ESTUDIO, "Hola, entré al portal de productores y mi usuario no está vinculado.")} target="_blank" rel="noreferrer" className="btn-wa-grande" style={{ padding: "8px 14px", fontSize: 14 }}><Icono nombre="mensaje" size={15} /> Escribir al estudio</a>
          : <Boton variante="primario" onClick={() => setIntento(n => n + 1)}>Reintentar</Boton>}
        <Boton variante="fantasma" onClick={onLogout}>Salir</Boton>
      </div>
    </div>
  );

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
          <Logo alto={26} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Portal de productores</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pasInfo?.nombre || "Portal"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flex: "none" }}>
          <Boton variante="primario" icono="agregar" tamaño="sm" className="hide-mobile" onClick={() => setModalNuevoCaso(true)}>Derivar caso</Boton>
          <div style={{ position: "relative" }}>
            <Boton variante="fantasma" tamaño="sm" icono="clientes" onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-haspopup="menu">Cuenta</Boton>
            {menu && (
              <>
                <div onClick={() => setMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
                <div role="menu" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 31, minWidth: 210, background: T.card, border: `1px solid ${T.border}`, borderRadius: "var(--r-sm)", boxShadow: "var(--shadow)", padding: 6, display: "flex", flexDirection: "column" }}>
                  {[
                    app.puede && { l: "Instalar la app", icono: "instalar", f: app.instalar },
                    { l: dark ? "Modo claro" : "Modo oscuro", icono: dark ? "sol" : "luna", f: onToggleDark },
                    !demo && { l: "Cambiar contraseña", icono: "candado", f: () => setCambPwd(true) },
                    { l: demo ? "Salir de la demostración" : "Salir", icono: "salir", f: onLogout },
                  ].filter(Boolean).map(o => (
                    <button key={o.l} type="button" role="menuitem" onClick={() => { setMenu(false); o.f(); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", background: "none", border: "none", borderRadius: "var(--r-sm)", font: "inherit", fontSize: 14, color: T.text, cursor: "pointer", textAlign: "left" }}>
                      <Icono nombre={o.icono} size={16} />{o.l}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {demo && (
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "16px 16px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "color-mix(in srgb, var(--accent) 9%, var(--card))", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: "var(--r-sm)", padding: "12px 14px", fontSize: 14 }}>
              <span style={{ flex: "1 1 240px" }}><b>Demostración</b> con casos inventados: así vas a seguir los reclamos de tus clientes.</span>
              <a href={linkWhatsApp(TELEFONO_ESTUDIO, TEXTO_ACCESO)} target="_blank" rel="noreferrer" className="btn-wa-grande" style={{ padding: "8px 14px", fontSize: 14 }}><Icono nombre="mensaje" size={15} /> Quiero mi acceso</a>
            </div>
        </div>
      )}
      <div className="portal-grid" style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 24px 96px", display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
        {/* Resumen del PAS */}
        <aside className="portal-resumen" style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 84 }}>
          <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: "14px 16px" }}>
            {/* La comisión solo aparece cuando hay algo: cobrada o por pagarle. Un PAS sin comisión no ve ninguna referencia.
                Los próximos cobros van en su propia tarjeta (abajo). */}
            {comisionTotal > 0 && <>
              <div style={{ fontSize: 12, color: T.sub }}>Tu comisión cobrada</div>
              <div className="num" style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-ink)", letterSpacing: -0.5 }}>{fmtMoney(comisionTotal)}</div>
            </>}
            {comisionPendiente > 0 && <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{comisionTotal > 0 ? "Por pagarte" : "Tu comisión por pagarte"}: <b className="num" style={{ color: T.text }}>{fmtMoney(comisionPendiente)}</b></div>}
            <div className="stats-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", ...(comisionTotal > 0 || comisionPendiente > 0 ? { marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 10 } : {}) }}>
              {[["En curso", enCurso.length], ["Cobrados", casosCobrados.length], ["Total", casos.filter(c => !c._demo).length]].map(([l, n]) => (
                <div key={l}><div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{n}</div><div style={{ fontSize: 12, color: T.muted }}>{l}</div></div>
              ))}
            </div>
            {totalCobrado > 0 && <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>Tus asegurados cobraron <b className="num" style={{ color: T.text }}>{fmtMoney(totalCobrado)}</b></div>}
          </section>

          {pagosPendientes.length > 0 && (
            <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: "12px 16px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Próximos cobros</div>
              {/* Usa el alto que queda en la pantalla (la columna es fija al bajar) */}
              <div style={{ maxHeight: "max(240px, calc(100vh - 400px))", overflowY: "auto" }}>
                {pagosPendientes.map((p, i) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 0", borderTop: i ? `1px solid ${T.border}` : "none", fontSize: 13 }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.asegurado}</span>
                      <span style={{ color: T.muted, fontSize: 12 }}>{p._fechaPago ? fmtDate(p._fechaPago) : "Fecha a confirmar"}</span>
                    </span>
                    {/* Lo que cobra el cliente (acordado o, si no, el último ofrecimiento); debajo, la comisión si la hay */}
                    <span style={{ textAlign: "right", flex: "none" }}>
                      {Number(p.monto_acordado || p.monto_ofrecimiento) > 0 && <span className="num" style={{ display: "block", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtMoney(p.monto_acordado || p.monto_ofrecimiento)}</span>}
                      {Number(p.monto_comision_pas) > 0 && <span className="num" style={{ color: T.muted, fontSize: 12, whiteSpace: "nowrap" }}>tu comisión {fmtMoney(p.monto_comision_pas)}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>

        {/* Casos */}
        <main style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {esDemo && <div style={{ background: "color-mix(in srgb, var(--accent) 9%, var(--card))", borderRadius: "var(--r-sm)", padding: "12px 14px", fontSize: 14 }}>Todavía no tenés casos derivados. Así se va a ver cada uno cuando derives el primero.</div>}

          <div role="tablist" aria-label="Mis casos" style={{ display: "flex", gap: 20, borderBottom: `1px solid ${T.border}`, overflowX: "auto" }}>
            {pestanaBtn("curso", "En curso", enCurso.length)}
            {/* Sin casos, la pestaña no aparece (salvo que sea la elegida) */}
            {(casosCobrados.length > 0 || pestana === "cobrados") && pestanaBtn("cobrados", "Cobrados", casosCobrados.length)}
            {(casosDesistidos.length > 0 || pestana === "desistidos") && pestanaBtn("desistidos", "Desistidos", casosDesistidos.length)}
            {pestanaBtn("todos", "Todos", casos.length)}
          </div>

          {estadosPestana.length > 1 && (
            <div role="group" aria-label="Filtrar por estado" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
              {[{ key: null, label: "Todos los estados", n: baseLista.length }, ...estadosPestana].map(e => {
                const activo = estadoActivo === e.key;
                return (
                  <button key={e.key || "todos"} type="button" aria-pressed={activo} onClick={() => setEstadoSel(e.key)}
                    className="chip">
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
            <div style={{ textAlign: "center", padding: "32px 16px", color: T.sub, fontSize: 14 }}>
              <Ilustracion nombre="carpeta" size={88} style={{ margin: "0 auto 8px" }} />
              {q ? "Ningún caso coincide con la búsqueda." : { cobrados: "Todavía no hay casos cobrados.", desistidos: "No hay casos desistidos.", todos: "Todavía no hay casos." }[pestana] || "No hay casos en curso."}
            </div>
          ) : (
            lista.map(c => <PortalCasoCard key={c.id} demo={demo} caso={c} pasNombre={pasInfo?.nombre} proximoEvento={eventos[c.id]} plazoCia={plazos[c.compania_aseguradora]?.promedio} />)
          )}

          {(estadisticasReales ? todosLosCasos.length > 0 : Object.keys(plazos).length >= 3) && (
            <GraficoBoundary>
              <GraficoCompanias allCasos={todosLosCasos} darkMode={dark} cardBg={T.card} cardBorder={T.border} textColor={T.text} subColor={T.sub} mostrarCasos={false}
                aclaracion={demo ? (estadisticasReales ? "Promedios reales de los casos del estudio, solo de compañías con 3 casos o más. Los casos de arriba son de ejemplo." : "Datos inventados para la demostración. En tu portal vas a ver los promedios reales de los casos del estudio.") : null} />
            </GraficoBoundary>
          )}

          {demo && <PreguntasDemo T={T} />}
        </main>
      </div>

      {/* Botón fijo para derivar en celular */}
      <button type="button" className={`fab-derivar${fabVisible ? "" : " fab-oculto"}`} onClick={() => setModalNuevoCaso(true)}>
        <Icono nombre="agregar" size={18} /> Derivar caso
      </button>

      {cambPwd && <CambiarPasswordModal onClose={() => setCambPwd(false)} dark={dark} />}
      {modalNuevoCaso && <NuevoCasoModal demo={demo} pasId={pasId} pasNombre={pasInfo?.nombre} casos={casos} onClose={() => setModalNuevoCaso(false)} onCasoCreado={(nuevo) => setCasos(prev => [nuevo, ...prev.filter(c => !c._demo)])} dark={dark} companias={companiasUnicas} />}
    </div>
  );
}