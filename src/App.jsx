import { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { supabase } from './supabase.js'

// ── IMPORTS: CONTEXTO
import { useTheme } from "./context/ThemeContext.jsx";

// ── IMPORTS: UTILIDADES
import { parsePAS, fechaLocalISO } from "./utils/formatters.js";
import { RESULTADO_MAIL, RESULTADO_RECORDATORIO, esMailEnviado } from "./utils/mensajes.js";
import { copiaPendiente, descargarCopiaCompleta, ultimaCopia } from "./utils/copiaSeguridad.js";
import { saveStorage, upsertPasManual, insertHistorialEntry, deleteCaso, restaurarCaso } from "./utils/storage.js";
import AvisoDeshacer from "./components/ui/AvisoDeshacer.jsx";

// ── IMPORTS: HOOKS
import { usePASData } from "./hooks/usePASData.js";

// ── IMPORTS: COMPONENTES
import LoginGate from "./components/LoginGate.jsx";
import SidebarNav from "./components/SidebarNav.jsx";
import CasoDetalle from './CasoUnificado.jsx'
import ContactModal from './components/ContactModal.jsx'
import TabDashboard from './components/TabDashboard.jsx'
const TabAnalisis = lazy(() => import('./components/TabAnalisis.jsx'))
const TabClientes = lazy(() => import('./components/TabClientes.jsx'))
const TabProspeccion = lazy(() => import('./components/TabProspeccion.jsx'))
const TabCasos = lazy(() => import('./components/TabCasos.jsx'))
const TabExpedientes = lazy(() => import('./components/TabExpedientes.jsx'))
const TabRutina = lazy(() => import('./components/TabRutina.jsx'))
const TabFinanzas = lazy(() => import('./components/TabFinanzas.jsx'))
const TabHerramientas = lazy(() => import('./components/TabHerramientas.jsx'))
const TabCompanias = lazy(() => import('./components/TabCompanias.jsx'))
const CompaniaHost = lazy(() => import('./components/companias/FichaCompania.jsx').then(m => ({ default: m.CompaniaHost })))
import BuscadorGlobal from './components/BuscadorGlobal.jsx'
import CasoOverlay from './components/caso/CasoOverlay.jsx'
import { aplanarCasos } from './utils/metricas.js'
const PortalCliente = lazy(() => import('./components/portal/PortalCliente.jsx'));

// Vista pública del cliente (sin login) o la app, que primero pide cuenta + PIN.
// Los datos se cargan recién después de entrar (AppPrincipal).
export default function App() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("caso") || params.get("vista") === "cliente") return <Suspense fallback={null}><PortalCliente /></Suspense>;
  return <LoginGate><AppPrincipal /></LoginGate>;
}

function AppPrincipal() {
  const { darkMode, T } = useTheme();

  const {
    pas, setPas, agregarPas,
    totalContactos,
    historial, setHistorial,
    casos, setCasos,
    derivadores, setDerivadores,
    descartados, setDescartados,
    pasManuales, setPasManuales,
    loading,
    reloadAllData,
  } = usePASData();

  // ── STATE GLOBAL
  const [mainTab, setMainTab] = useState("dashboard");
  const [expedienteAbrir, setExpedienteAbrir] = useState(null); // id a abrir al ir a Expedientes desde Hoy o Rutina
  const abrirExpediente = useCallback(id => { setExpedienteAbrir(id); setMainTab("expedientes"); }, []);
  const [modalPas, setModalPas] = useState(null);
  const [appLoading, setAppLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [casoBuscado, setCasoBuscado] = useState(null); // { caso, pasId } abierto desde el buscador
  const [clienteFoco, setClienteFoco] = useState(null); // PAS a mostrar en Clientes
  const [autobackupFecha, setAutobackupFecha] = useState(() => localStorage.getItem('pastracker_autobackup_fecha') || null);

  // ── HANDLERS
  const autoBackup = useCallback((casosData) => {
    try {
      const backup = { version: 1, fecha: new Date().toISOString(), historial, casos: casosData, derivadores, descartados };
      localStorage.setItem('pastracker_autobackup', JSON.stringify(backup));
      const fecha = new Date().toISOString();
      localStorage.setItem('pastracker_autobackup_fecha', fecha);
      setAutobackupFecha(fecha);
    } catch (e) {
      console.warn('[autobackup] error:', e);
    }
  }, [historial, derivadores, descartados]);

  const handleFile = useCallback(e => {
    const file = e.target.files[0];
    if (!file) return;
    setAppLoading(true);
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1);
        const lista = parsePAS(rows);
        
        const inserts = lista.map(p => ({
          id: p.id.toString(), nombre: p.nombre, mail: p.mail, telefonos: p.telefonos.join(","),
          contacto: p.contacto, respuesta: p.respuesta, seguimiento: p.seguimiento, prioridad: p.prioridad,
        }));
        
        const { error } = await supabase.from("pas_contactos").upsert(inserts, { onConflict: "id" });
        if (error) console.error("[Excel] Error en Supabase:", error);
        
        await reloadAllData();
        setAppLoading(false);
      } catch (err) {
        console.error("[Excel] Error:", err);
        setAppLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [reloadAllData]);

  // Registra el contacto y, según cómo quedó, lo marca como derivador o descartado
  const handleSaveContacto = useCallback(async ({ fecha, resultados, nota, decision }) => {
    const id = modalPas.id;
    const entry = { fecha, resultados, nota, ts: Date.now() };
    setHistorial(prev => ({ ...prev, [id]: [...(prev[id] || []), entry] }));
    await insertHistorialEntry(id, entry);

    const quiereDerivador = decision === "deriva";
    const quiereDescartado = decision === "descarta";
    if (!!derivadores[id] !== quiereDerivador) {
      const upd = { ...derivadores, [id]: quiereDerivador };
      setDerivadores(upd);
      await saveStorage("pas_derivadores", upd);
    }
    if (!!descartados[id] !== quiereDescartado) {
      const upd = { ...descartados, [id]: quiereDescartado };
      setDescartados(upd);
      await saveStorage("pas_descartados", upd);
    }
    setModalPas(null);
  }, [modalPas, derivadores, descartados]);

  // Mail de presentación: al abrirlo queda registrado como contacto (sale de "Sin contactar")
  const handleMailEnviado = useCallback(async (p) => {
    const entry = { fecha: fechaLocalISO(), resultados: [RESULTADO_MAIL], nota: "Mail de presentación", ts: Date.now() };
    setHistorial(prev => ({ ...prev, [p.id]: [...(prev[p.id] || []), entry] }));
    await insertHistorialEntry(p.id, entry);
  }, []);
  // Recordatorio único a un PAS interesado (o "no mandar"): queda anotado y sale de "Para recordar"
  const handleRecordatorio = useCallback(async (p, { sinMandar } = {}) => {
    const entry = { fecha: fechaLocalISO(), resultados: [RESULTADO_RECORDATORIO], nota: sinMandar ? "Recordatorio descartado" : "Recordatorio a interesado", ts: Date.now() };
    setHistorial(prev => ({ ...prev, [p.id]: [...(prev[p.id] || []), entry] }));
    await insertHistorialEntry(p.id, entry);
  }, []);
  const hoyISO = fechaLocalISO();
  const mailsHoy = useMemo(() => Object.values(historial).reduce((n, lista) =>
    n + (lista || []).filter(e => esMailEnviado(e) && String(e.fecha).slice(0, 10) === hoyISO).length, 0), [historial, hoyISO]);

  // Actualiza (o agrega, si es nuevo) un caso en memoria; quien llama ya lo guardó en Supabase
  const handleCasoLocal = useCallback((pasId, caso) => {
    setCasos(prev => {
      const lista = prev[pasId] || [];
      const existe = lista.some(c => c.id === caso.id);
      const next = { ...prev, [pasId]: existe ? lista.map(c => (c.id === caso.id ? { ...c, ...caso } : c)) : [...lista, caso] };
      autoBackup(next);
      return next;
    });
  }, [setCasos, autoBackup]);

  // Buscador: Ctrl + K (o Cmd + K) desde cualquier pantalla
  useEffect(() => {
    const alTeclear = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setBuscando(true); }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);
  const todosLosPas = useMemo(() => [...pas, ...pasManuales], [pas, pasManuales]);
  const allCasos = useMemo(() => aplanarCasos(casos, todosLosPas), [casos, todosLosPas]);

  // Casos nuevos que llegan desde el portal mientras la app está abierta.
  // Un solo canal por montaje (nombre único): si se recrea con el mismo nombre antes de que el anterior
  // termine de cerrarse, Supabase tira error y se cae la pantalla.
  const casoLocalRef = useRef(handleCasoLocal);
  casoLocalRef.current = handleCasoLocal;
  useEffect(() => {
    const canal = supabase
      .channel(`admin-pas-casos-nuevos-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pas_casos" }, ({ new: caso }) => {
        if (caso?.id) casoLocalRef.current(String(caso.pas_id), caso);
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  // Saca un caso de memoria (quien llama ya lo borró de Supabase)
  const handleQuitarCaso = useCallback((pasId, id) => {
    setCasos(prev => {
      const next = { ...prev, [pasId]: (prev[pasId] || []).filter(c => c.id !== id) };
      autoBackup(next);
      return next;
    });
  }, [setCasos, autoBackup]);

  // Eliminar manda el caso a la papelera (30 días) y muestra "Deshacer". Devuelve true si se eliminó.
  const [casoEliminado, setCasoEliminado] = useState(null); // { papeleraId, nombre }
  const cerrarAvisoEliminado = useCallback(() => setCasoEliminado(null), []);
  const handleEliminarCaso = useCallback(async (caso, pasId) => {
    const nombre = caso.asegurado || "Sin nombre";
    if (!window.confirm(`¿Eliminar el caso de ${nombre}?\n\nVa a la papelera: lo podés recuperar durante 30 días.`)) return false;
    const { papeleraId, error } = await deleteCaso(caso.id);
    if (error) { window.alert(error); return false; }
    handleQuitarCaso(String(pasId), caso.id);
    setCasoEliminado({ papeleraId, nombre });
    return true;
  }, [handleQuitarCaso]);

  // Recupera de la papelera y lo vuelve a poner en memoria. Devuelve el caso o null.
  const handleRestaurarCaso = useCallback(async (papeleraId) => {
    const { caso, error } = await restaurarCaso(papeleraId);
    if (error) { window.alert(error); return null; }
    const { pas_id, ...resto } = caso;
    handleCasoLocal(String(pas_id), resto);
    return caso;
  }, [handleCasoLocal]);

  const handleToggleDerivador = useCallback(async (pasId) => {
    const updated = { ...derivadores, [pasId]: !derivadores[pasId] };
    setDerivadores(updated);
    await saveStorage("pas_derivadores", updated);
  }, [derivadores]);

  const handleToggleDescartado = useCallback(async (pasId) => {
    const updated = { ...descartados, [pasId]: !descartados[pasId] };
    setDescartados(updated);
    await saveStorage("pas_descartados", updated);
  }, [descartados]);

  const handleAddPasManual = useCallback(async (datos) => {
    // PAS nuevo: número libre en el rango de los manuales (el guardado pisa por id, así que no puede repetirse)
    let id = datos.id;
    if (id == null) {
      const usados = new Set([...pas, ...pasManuales].map(p => String(p.id)));
      do { id = 100000 + Math.floor(Math.random() * 1900000); } while (usados.has(String(id)));
    }
    const nuevoPas = { ...datos, id };
    const updated = [...pasManuales.filter(p => p.id !== nuevoPas.id), nuevoPas];
    setPasManuales(updated);
    await upsertPasManual(nuevoPas);
  }, [pas, pasManuales]);

  // Copia completa semanal: en la compu, la primera vez que abrís la app en la semana se descarga sola
  const [copiaFecha, setCopiaFecha] = useState(() => ultimaCopia());
  const [copiaAviso, setCopiaAviso] = useState(null); // { ok, texto }
  const hacerCopiaCompleta = useCallback(async () => {
    setCopiaAviso({ ok: true, texto: "Armando la copia de seguridad completa…" });
    const r = await descargarCopiaCompleta();
    setCopiaFecha(ultimaCopia());
    setCopiaAviso(r.ok
      ? { ok: true, texto: `Copia de seguridad descargada (${r.filas.toLocaleString("es-AR")} registros). Guardala en un lugar seguro.` }
      : { ok: false, texto: `No se pudo hacer la copia de seguridad: ${r.error}. Se vuelve a intentar la próxima vez que abras la app.` });
    setTimeout(() => setCopiaAviso(null), 8000);
  }, []);
  useEffect(() => {
    if (loading || !totalContactos) return;
    const enCompu = typeof window !== "undefined" && window.matchMedia("(min-width: 901px)").matches;
    if (enCompu && copiaPendiente()) hacerCopiaCompleta();
  }, [loading, totalContactos, hacerCopiaCompleta]);

  const handleBackup = useCallback(() => {
    const backup = { version: 1, fecha: new Date().toISOString(), historial, casos, derivadores, descartados };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pastracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }, [historial, casos, derivadores, descartados]);

  const handleRestore = useCallback(async (file) => {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.version === 1) {
      setHistorial(data.historial || {}); setCasos(data.casos || {}); setDerivadores(data.derivadores || {});
      setDescartados(data.descartados || {});
      await Promise.all([
        saveStorage("pas_historial", data.historial || {}), saveStorage("pas_casos", data.casos || {}),
        saveStorage("pas_derivadores", data.derivadores || {}), saveStorage("pas_descartados", data.descartados || {}),
      ]);
    }
  }, []);

  // ── RENDER
  return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100vh", display: "flex" }}>
      {/* SIDEBAR DE NAVEGACIÓN */}
      <SidebarNav
        pasCount={totalContactos}
        mainTab={mainTab}
        setMainTab={setMainTab}
        autobackupFecha={autobackupFecha}
        onBackup={handleBackup}
        onCopiaCompleta={hacerCopiaCompleta}
        copiaFecha={copiaFecha}
        onRestore={handleRestore}
        onBuscar={() => setBuscando(true)}
      />

      <Suspense fallback={null}><CompaniaHost allCasos={allCasos} onAbrirCaso={c => setCasoBuscado({ caso: c, pasId: c._pasId })} /></Suspense>
      <BuscadorGlobal abierto={buscando} onCerrar={() => setBuscando(false)}
        allCasos={allCasos} pas={pas} pasManuales={pasManuales} derivadores={derivadores}
        onAbrirCaso={c => setCasoBuscado({ caso: c, pasId: c._pasId })}
        onAbrirCliente={p => { setMainTab("clientes"); setClienteFoco({ id: p.id, nombre: p.nombre, t: Date.now() }); }}
        onContactar={(p, remoto) => { if (remoto) agregarPas(p); setModalPas(p); }} />

      {casoBuscado && (
        <CasoOverlay caso={casoBuscado.caso} pasId={casoBuscado.pasId} casos={casos} todosLosPas={todosLosPas}
          onCasoLocal={handleCasoLocal} darkMode={darkMode}
          onCambio={updated => setCasoBuscado(b => ({ ...b, caso: { ...updated, _pasId: b.pasId } }))}
          onEliminarCaso={handleEliminarCaso}
          onClose={() => setCasoBuscado(null)} />
      )}

      {/* CONTENIDO PRINCIPAL CON MARGEN IZQUIERDO PARA EL SIDEBAR Y ANCHO MÁXIMO AMPLIADO */}
      <main className="app-main">
        <div className="app-content">
          {!loading && totalContactos === 0 && !appLoading && (
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", border: `2px dashed ${T.border}`, borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: "48px 20px", cursor: "pointer", gap: 10, marginBottom: 20, background: T.card, transition: "border-color .2s" }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>Cargar listado_productores.xlsx</div>
              <div style={{ fontSize: 13, color: T.muted }}>Hacé clic o arrastrá el archivo</div>
              <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
            </label>
          )}
          
          {loading && !appLoading && (
            <div style={{ textAlign: "center", padding: 64, color: T.muted }}>Cargando…</div>
          )}

          {appLoading && (
            <div style={{ textAlign: "center", padding: 64, color: T.muted }}>
                            <div>Procesando el archivo...</div>
            </div>
          )}

          {!loading && !appLoading && totalContactos === 0 && (
            <div style={{ textAlign: "center", padding: 80 }}>
                            <div style={{ fontSize: 16, color: T.sub, fontWeight: 500 }}>Cargá el archivo Excel para comenzar</div>
              <div style={{ fontSize: 13, marginTop: 6, color: T.muted }}>Tu seguimiento se guarda automáticamente</div>
            </div>
          )}

          {/* TABS CONTENT · cada pestaña se descarga recién cuando se abre */}
          <Suspense fallback={<div className="cargando-tab" aria-busy="true">Cargando…</div>}>
          {!appLoading && !loading && totalContactos > 0 && mainTab === "dashboard" && <TabDashboard pas={pas} casos={casos} derivadores={derivadores} descartados={descartados} historial={historial} darkMode={darkMode} pasManuales={pasManuales} onCasoLocal={handleCasoLocal} onIrA={setMainTab} onAbrirExpediente={abrirExpediente} />}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "rutina" && <TabRutina pas={pas} casos={casos} pasManuales={pasManuales} historial={historial} darkMode={darkMode} onCasoLocal={handleCasoLocal} onIrA={setMainTab} onAbrirExpediente={abrirExpediente} />}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "finanzas" && <TabFinanzas pas={pas} casos={casos} pasManuales={pasManuales} darkMode={darkMode} onCasoLocal={handleCasoLocal} />}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "analisis" && <TabAnalisis pas={pas} casos={casos} darkMode={darkMode} pasManuales={pasManuales} onCasoLocal={handleCasoLocal} onIrA={setMainTab} />}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "casos" && <TabCasos pas={pas} casos={casos} onEliminarCaso={handleEliminarCaso} onRestaurarCaso={handleRestaurarCaso} onCasoLocal={handleCasoLocal} darkMode={darkMode} pasManuales={pasManuales} />}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "expedientes" && <TabExpedientes abrirId={expedienteAbrir} onAbierto={() => setExpedienteAbrir(null)} />}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "companias" && <TabCompanias allCasos={allCasos} />}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "herramientas" && <TabHerramientas casos={casos} todosLosPas={todosLosPas} />}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "prospeccion" && <TabProspeccion pas={pas} historial={historial} derivadores={derivadores} descartados={descartados} darkMode={darkMode} onContactar={setModalPas} onToggleDerivador={handleToggleDerivador} onToggleDescartado={handleToggleDescartado} onAgregarPas={agregarPas} onMailEnviado={handleMailEnviado} onRecordatorio={handleRecordatorio} mailsHoy={mailsHoy} />}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "clientes" && <TabClientes foco={clienteFoco} pas={pas} casos={casos} derivadores={derivadores} onCasoLocal={handleCasoLocal} darkMode={darkMode} pasManuales={pasManuales} onAddPasManual={handleAddPasManual} />}
          </Suspense>
        </div>
      </main>

      {copiaAviso && (
        <div role="status" style={{ position: "fixed", right: 16, bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", zIndex: 400, maxWidth: 360, background: "var(--card)", border: `1px solid ${copiaAviso.ok ? "var(--border)" : "var(--bad)"}`, borderRadius: "var(--r-sm)", padding: "10px 14px", fontSize: 13, lineHeight: 1.45, color: copiaAviso.ok ? "var(--text)" : "var(--bad)", boxShadow: "var(--shadow)" }}>
          {copiaAviso.texto}
        </div>
      )}

      {casoEliminado && (
        <AvisoDeshacer key={casoEliminado.papeleraId} texto={`Caso de ${casoEliminado.nombre} eliminado`}
          onDeshacer={() => handleRestaurarCaso(casoEliminado.papeleraId)} onCerrar={cerrarAvisoEliminado} />
      )}

      {/* MODALES */}
      {modalPas && <ContactModal pas={modalPas} esDerivador={!!derivadores[modalPas.id]} esDescartado={!!descartados[modalPas.id]} onClose={() => setModalPas(null)} onSave={handleSaveContacto} />}
    </div>
  );
}