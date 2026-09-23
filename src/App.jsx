import { useState, useCallback, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { supabase } from './supabase.js'

// ── IMPORTS: CONTEXTO
import { useTheme } from "./context/ThemeContext.jsx";

// ── IMPORTS: UTILIDADES
import { parsePAS } from "./utils/formatters.js";
import { saveStorage, upsertPasManual, insertHistorialEntry } from "./utils/storage.js";

// ── IMPORTS: HOOKS
import { usePASData } from "./hooks/usePASData.js";

// ── IMPORTS: COMPONENTES
import LoginGate from "./components/LoginGate.jsx";
import SidebarNav from "./components/SidebarNav.jsx";
import CasoDetalle from './CasoUnificado.jsx'
import ContactModal from './components/ContactModal.jsx'
import TabDashboard from './components/TabDashboard.jsx'
import TabAnalisis from './components/TabAnalisis.jsx'
import TabClientes from './components/TabClientes.jsx'
import TabProspeccion from './components/TabProspeccion.jsx'
import TabPortalUsuarios from './components/TabPortalUsuarios.jsx'
import TabCasos from './components/TabCasos.jsx'
import BuscadorGlobal from './components/BuscadorGlobal.jsx'
import CasoOverlay from './components/caso/CasoOverlay.jsx'
import { aplanarCasos } from './utils/metricas.js'
import PortalCliente from './components/portal/PortalCliente.jsx';

// Vista pública del cliente (sin login) o la app, que primero pide cuenta + PIN.
// Los datos se cargan recién después de entrar (AppPrincipal).
export default function App() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("caso") || params.get("vista") === "cliente") return <PortalCliente />;
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

  // Casos nuevos que llegan desde el portal mientras la app está abierta
  useEffect(() => {
    const canal = supabase
      .channel("admin-pas-casos-nuevos")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pas_casos" }, ({ new: caso }) => {
        if (caso?.id) handleCasoLocal(String(caso.pas_id), caso);
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [handleCasoLocal]);

  // Saca un caso de memoria (quien llama ya lo borró de Supabase)
  const handleQuitarCaso = useCallback((pasId, id) => {
    setCasos(prev => {
      const next = { ...prev, [pasId]: (prev[pasId] || []).filter(c => c.id !== id) };
      autoBackup(next);
      return next;
    });
  }, [setCasos, autoBackup]);

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
        onRestore={handleRestore}
        onBuscar={() => setBuscando(true)}
      />

      <BuscadorGlobal abierto={buscando} onCerrar={() => setBuscando(false)}
        allCasos={allCasos} pas={pas} pasManuales={pasManuales} derivadores={derivadores}
        onAbrirCaso={c => setCasoBuscado({ caso: c, pasId: c._pasId })}
        onAbrirCliente={p => { setMainTab("clientes"); setClienteFoco({ id: p.id, nombre: p.nombre, t: Date.now() }); }}
        onContactar={(p, remoto) => { if (remoto) agregarPas(p); setModalPas(p); }} />

      {casoBuscado && (
        <CasoOverlay caso={casoBuscado.caso} pasId={casoBuscado.pasId} casos={casos} todosLosPas={todosLosPas}
          onCasoLocal={handleCasoLocal} darkMode={darkMode}
          onCambio={updated => setCasoBuscado(b => ({ ...b, caso: { ...updated, _pasId: b.pasId } }))}
          onClose={() => setCasoBuscado(null)} />
      )}

      {/* CONTENIDO PRINCIPAL CON MARGEN IZQUIERDO PARA EL SIDEBAR Y ANCHO MÁXIMO AMPLIADO */}
      <main className="app-main">
        <div className="app-content">
          {!loading && totalContactos === 0 && !appLoading && (
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", border: `2px dashed ${T.border}`, borderRadius: 16, padding: "48px 20px", cursor: "pointer", gap: 10, marginBottom: 20, background: T.card, transition: "border-color .2s" }}>
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

          {/* TABS CONTENT */}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "dashboard" && <TabDashboard pas={pas} casos={casos} derivadores={derivadores} darkMode={darkMode} pasManuales={pasManuales} onCasoLocal={handleCasoLocal} onIrA={setMainTab} onAbrirCliente={p => { setMainTab("clientes"); setClienteFoco({ id: p.id, nombre: p.nombre, t: Date.now() }); }} />}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "analisis" && <TabAnalisis pas={pas} casos={casos} darkMode={darkMode} pasManuales={pasManuales} />}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "casos" && <TabCasos pas={pas} casos={casos} onQuitarCaso={handleQuitarCaso} onCasoLocal={handleCasoLocal} darkMode={darkMode} pasManuales={pasManuales} />}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "prospeccion" && <TabProspeccion pas={pas} historial={historial} derivadores={derivadores} descartados={descartados} darkMode={darkMode} onContactar={setModalPas} onToggleDerivador={handleToggleDerivador} onToggleDescartado={handleToggleDescartado} onAgregarPas={agregarPas} />}
          {!appLoading && !loading && totalContactos > 0 && mainTab === "clientes" && <TabClientes foco={clienteFoco} pas={pas} casos={casos} derivadores={derivadores} onCasoLocal={handleCasoLocal} darkMode={darkMode} pasManuales={pasManuales} onAddPasManual={handleAddPasManual} />}
          {mainTab === "portal" && <TabPortalUsuarios pas={pas} derivadores={derivadores} darkMode={darkMode} />}
        </div>
      </main>

      {/* MODALES */}
      {modalPas && <ContactModal pas={modalPas} esDerivador={!!derivadores[modalPas.id]} esDescartado={!!descartados[modalPas.id]} onClose={() => setModalPas(null)} onSave={handleSaveContacto} />}
    </div>
  );
}