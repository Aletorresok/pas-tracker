import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from './supabase.js'

// ── IMPORTS: CONSTANTES
import { RESULTADOS_CONTACTO, ESTADOS_CASO, VISTAS_C, TIPOS_DOC, ESTADOS_HONORARIOS, EXTENSIONES_VALIDAS } from "./constants.js";

// ── IMPORTS: UTILIDADES
import { fmtDate, fmtMoney, primerNombre, cleanPhones, parsePAS, formatoFecha, diasDesde, waLink, getExtension, sanitizarNombre, verificarPermiso, sumarDias } from "./utils/formatters.js";
import { buildAgendaCaso, syncCasoToAgenda, deleteCasoFromAgenda, syncMasivoCasos } from "./utils/sync.js";
import { saveStorage, loadStorage, upsertPasManual, deletePasManual } from "./utils/storage.js";

// ── IMPORTS: HOOKS
import { usePASData } from "./hooks/usePASData.js";

// ── IMPORTS: COMPONENTES
import CasoDetalle from './CasoUnificado.jsx'
import ContactModal from './components/ContactModal.jsx'
import TabDashboard from './components/TabDashboard.jsx'
import TabClientes from './components/TabClientes.jsx'
import TabContactos from './components/TabContactos.jsx'
import TabContactados from './components/TabContactados.jsx'
import TabPortalUsuarios from './components/TabPortalUsuarios.jsx'
import PASCard from './components/PASCard.jsx'

// ── MAIN APP ──────────────────────────────────────────────────────────────────
const APP_PIN = "3934";

function LoginGate({ darkMode, onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === APP_PIN) {
      sessionStorage.setItem("pas_unlocked", "1");
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: darkMode ? "#0b1121" : "#f0f4f8",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: darkMode ? "#1e293b" : "#fff",
        border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`,
        borderRadius: 16, padding: "40px 32px", textAlign: "center",
        boxShadow: "0 8px 32px #0002", maxWidth: 340, width: "100%",
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: darkMode ? "#f1f5f9" : "#0f172a", marginBottom: 4 }}>PAS Tracker</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 24 }}>Ingresá tu clave para continuar</div>
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          placeholder="Clave"
          autoFocus
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "12px 16px", fontSize: 16, textAlign: "center",
            letterSpacing: 8,
            background: darkMode ? "#0f172a" : "#f1f5f9",
            border: `2px solid ${error ? "#ef4444" : darkMode ? "#334155" : "#e2e8f0"}`,
            borderRadius: 10, color: darkMode ? "#f1f5f9" : "#0f172a",
            outline: "none", fontFamily: "inherit",
            transition: "border-color .2s",
          }}
        />
        {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>Clave incorrecta</div>}
        <button type="submit" style={{
          marginTop: 16, width: "100%", padding: "12px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          border: "none", borderRadius: 10, color: "#fff",
          fontSize: 14, fontWeight: 700, cursor: "pointer",
          transition: "opacity .2s",
        }}>Ingresar →</button>
      </form>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("pas_unlocked") === "1");
  const [darkMode, setDarkMode] = useState(true);

  const {
    pas, setPas,
    historial, setHistorial,
    casos, setCasos,
    derivadores, setDerivadores,
    recordatorios, setRecordatorios,
    descartados, setDescartados,
    pasManuales, setPasManuales,
    loading,
    reloadAllData,
  } = usePASData();

  // ── STATE GLOBAL
  const [mainTab, setMainTab] = useState("dashboard");
  const [modalPas, setModalPas] = useState(null);
  const [casosDetalleModal, setCasosDetalleModal] = useState(null);
  const [appLoading, setAppLoading] = useState(false);
  const [autobackupFecha, setAutobackupFecha] = useState(() => localStorage.getItem('pastracker_autobackup_fecha') || null);

  // ── COLORES Y ESTILOS
  const subColor = darkMode ? "#94a3b8" : "#475569";
  const iStyle = {
    background: darkMode ? "#1e293b" : "#f1f5f9",
    border: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}`,
    borderRadius: 8,
    color: darkMode ? "#f1f5f9" : "#0f172a",
    padding: "9px 12px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  const TABS = [
    { k: "dashboard", l: "Dashboard", icon: "📊" },
    { k: "contactos", l: "Contactos", icon: "📞" },
    { k: "contactados", l: "Contactados", icon: "✓" },
    { k: "clientes", l: "Clientes", icon: "🏠" },
    { k: "portal", l: "Portal", icon: "🌐" },
  ];
  const [showBackupMenu, setShowBackupMenu] = useState(false);

  // ── HANDLERS

  const autoBackup = useCallback((casosData) => {
    try {
      const backup = {
        version: 1,
        fecha: new Date().toISOString(),
        historial,
        casos: casosData,
        derivadores,
        recordatorios,
        descartados,
      };
      localStorage.setItem('pastracker_autobackup', JSON.stringify(backup));
      const fecha = new Date().toISOString();
      localStorage.setItem('pastracker_autobackup_fecha', fecha);
      setAutobackupFecha(fecha);
    } catch (e) {
      console.warn('[autobackup] error:', e);
    }
  }, [historial, derivadores, recordatorios, descartados]);

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
        
        // Guardar en Supabase
        const inserts = lista.map(p => ({
          id: p.id.toString(),
          nombre: p.nombre,
          mail: p.mail,
          telefonos: p.telefonos.join(","),
          contacto: p.contacto,
          respuesta: p.respuesta,
          seguimiento: p.seguimiento,
          prioridad: p.prioridad,
        }));
        
        const { error } = await supabase
          .from("pas_contactos")
          .upsert(inserts, { onConflict: "id" });
        
        if (error) console.error("[Excel] Error en Supabase:", error);
        
        // Recargar todos los datos
        await reloadAllData();
        
        setAppLoading(false);
      } catch (err) {
        console.error("[Excel] Error:", err);
        setAppLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [reloadAllData]);

  const handleSaveContacto = useCallback(async ({ fecha, resultados, nota, recordatorio }) => {
    const entry = { fecha, resultados, nota, ts: Date.now() };
    const updated = { ...historial, [modalPas.id]: [...(historial[modalPas.id] || []), entry] };
    setHistorial(updated);
    console.log("[handleSaveContacto] pasId:", modalPas.id, "entries:", updated[modalPas.id]?.length);
    await saveStorage("pas_historial", updated);

    if (recordatorio && resultados.includes("volver_contactar")) {
      const updatedRec = { ...recordatorios, [modalPas.id]: recordatorio };
      setRecordatorios(updatedRec);
      await saveStorage("pas_recordatorios", updatedRec);
    }
    setModalPas(null);
  }, [historial, modalPas, recordatorios]);

  const handleSaveCasos = useCallback(async (pasId, list, pasNombre) => {
    const updated = { ...casos, [pasId]: list };
    setCasos(updated);
    await saveStorage("pas_casos", updated);
    autoBackup(updated);

    const nombre = pasNombre || (pas.find(p => p.id === pasId)?.nombre) || "";
    await Promise.all(list.map(c => syncCasoToAgenda(c, nombre)));
  }, [casos, pas, autoBackup]);

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

  const handleAddPasManual = useCallback(async (nuevoPas) => {
    const updated = [...pasManuales.filter(p => p.id !== nuevoPas.id), nuevoPas];
    setPasManuales(updated);
    await upsertPasManual(nuevoPas);
  }, [pasManuales]);

  const handleDeletePasManual = useCallback(async (id) => {
    setPasManuales(prev => prev.filter(p => p.id !== id));
    await deletePasManual(id);
    const updated = { ...casos };
    delete updated[id];
    setCasos(updated);
    await saveStorage("pas_casos", updated);
  }, [pasManuales, casos]);

  const handleBackup = useCallback(() => {
    const backup = {
      version: 1,
      fecha: new Date().toISOString(),
      historial,
      casos,
      derivadores,
      recordatorios,
      descartados,
    };
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pastracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [historial, casos, derivadores, recordatorios, descartados]);

  const handleRestore = useCallback(async (file) => {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.version === 1) {
      setHistorial(data.historial || {});
      setCasos(data.casos || {});
      setDerivadores(data.derivadores || {});
      setRecordatorios(data.recordatorios || {});
      setDescartados(data.descartados || {});
      await Promise.all([
        saveStorage("pas_historial", data.historial || {}),
        saveStorage("pas_casos", data.casos || {}),
        saveStorage("pas_derivadores", data.derivadores || {}),
        saveStorage("pas_recordatorios", data.recordatorios || {}),
        saveStorage("pas_descartados", data.descartados || {}),
      ]);
    }
  }, []);

  // ── RENDER
  if (!unlocked) return <LoginGate darkMode={darkMode} onUnlock={() => setUnlocked(true)} />;

  return (
    <div style={{ background: darkMode ? "#0b1121" : "#f0f4f8", color: darkMode ? "#f1f5f9" : "#0f172a", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* HEADER */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: darkMode ? "rgba(11,17,33,.92)" : "rgba(240,244,248,.92)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${darkMode ? "#1e293b44" : "#e2e8f044"}`,
      }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "12px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📋</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>PAS Tracker</div>
                {pas.length > 0 && <div style={{ fontSize: 10, color: darkMode ? "#475569" : "#94a3b8", marginTop: -1 }}>{pas.length.toLocaleString()} contactos</div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowBackupMenu(v => !v)} style={{ background: darkMode ? "#1e293b" : "#e2e8f0", border: "none", borderRadius: 8, color: subColor, padding: "7px 10px", cursor: "pointer", fontSize: 13 }}>💾</button>
                {showBackupMenu && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setShowBackupMenu(false)} />
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 6, background: darkMode ? "#1e293b" : "#fff", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 10, padding: 6, zIndex: 99, boxShadow: "0 8px 24px #0003", minWidth: 160 }}>
                      <button onClick={() => { handleBackup(); setShowBackupMenu(false); }} style={{ width: "100%", background: "none", border: "none", color: darkMode ? "#f1f5f9" : "#0f172a", padding: "8px 12px", cursor: "pointer", fontSize: 12, textAlign: "left", borderRadius: 6 }}>💾 Descargar backup</button>
                      <label style={{ display: "block" }}>
                        <input type="file" accept=".json" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRestore(f); e.target.value = ""; setShowBackupMenu(false); }} style={{ display: "none" }} />
                        <div style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12, color: darkMode ? "#f1f5f9" : "#0f172a", borderRadius: 6 }} onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#334155" : "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>📥 Restaurar backup</div>
                      </label>
                      {autobackupFecha && <div style={{ fontSize: 10, color: "#64748b", padding: "4px 12px", borderTop: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, marginTop: 4, paddingTop: 8 }}>Auto: {new Date(autobackupFecha).toLocaleDateString("es-AR")}</div>}
                    </div>
                  </>
                )}
              </div>
              <button onClick={() => setDarkMode(m => !m)} style={{ background: darkMode ? "#1e293b" : "#e2e8f0", border: "none", borderRadius: 8, color: subColor, padding: "7px 10px", cursor: "pointer", fontSize: 13 }}>{darkMode ? "☀️" : "🌙"}</button>
            </div>
          </div>

          {/* TABS */}
          <div style={{ display: "flex", gap: 2, background: darkMode ? "#0f172a" : "#e2e8f0", borderRadius: 10, padding: 3 }}>
            {TABS.map(t => {
              const active = mainTab === t.k;
              return (
                <button
                  key={t.k}
                  onClick={() => setMainTab(t.k)}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    borderRadius: 8,
                    border: "none",
                    background: active ? (darkMode ? "#1e293b" : "#fff") : "transparent",
                    color: active ? "#818cf8" : darkMode ? "#64748b" : "#94a3b8",
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    transition: "all .2s",
                    boxShadow: active ? (darkMode ? "0 1px 4px #0004" : "0 1px 3px #0001") : "none",
                  }}
                >
                  <span style={{ fontSize: 13, display: "block", marginBottom: 1 }}>{t.icon}</span>
                  {t.l}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 20px 60px" }}>
        {/* FILE UPLOAD */}
        {pas.length === 0 && !appLoading && (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", border: `2px dashed ${darkMode ? "#1e3a5f" : "#cbd5e1"}`, borderRadius: 16, padding: "32px 20px", cursor: "pointer", gap: 10, marginBottom: 20, background: darkMode ? "#0f172a44" : "#fff", transition: "border-color .2s" }}>
            <div style={{ fontSize: 32 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: darkMode ? "#94a3b8" : "#64748b" }}>Cargar listado_productores.xlsx</div>
            <div style={{ fontSize: 12, color: darkMode ? "#475569" : "#94a3b8" }}>Hacé clic o arrastrá el archivo</div>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
          </label>
        )}
        {appLoading && (
          <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div>Procesando el archivo...</div>
          </div>
        )}

        {!appLoading && pas.length === 0 && (
          <div style={{ textAlign: "center", padding: 64 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, color: "#475569" }}>Cargá el archivo Excel para comenzar</div>
            <div style={{ fontSize: 12, marginTop: 6, color: "#334155" }}>Tu seguimiento se guarda automáticamente</div>
          </div>
        )}

        {/* TABS CONTENT */}
        {!appLoading && pas.length > 0 && mainTab === "dashboard" && (
          <TabDashboard pas={pas} casos={casos} derivadores={derivadores} darkMode={darkMode} pasManuales={pasManuales} onGoToClientes={() => setMainTab("clientes")} />
        )}

        {!appLoading && pas.length > 0 && mainTab === "contactos" && (
          <TabContactos
            pas={pas}
            historial={historial}
            derivadores={derivadores}
            recordatorios={recordatorios}
            descartados={descartados}
            darkMode={darkMode}
            onContactar={setModalPas}
            onToggleDerivador={handleToggleDerivador}
            onToggleDescartado={handleToggleDescartado}
          />
        )}

        {!appLoading && pas.length > 0 && mainTab === "contactados" && (
          <TabContactados
            pas={pas}
            historial={historial}
            derivadores={derivadores}
            descartados={descartados}
            darkMode={darkMode}
            onContactar={setModalPas}
            onToggleDerivador={handleToggleDerivador}
            onToggleDescartado={handleToggleDescartado}
          />
        )}

        {!appLoading && pas.length > 0 && mainTab === "clientes" && (
          <TabClientes
            pas={pas}
            casos={casos}
            derivadores={derivadores}
            onSaveCasos={handleSaveCasos}
            darkMode={darkMode}
            pasManuales={pasManuales}
            onAddPasManual={handleAddPasManual}
            onEditPasManual={handleAddPasManual}
            onDeletePasManual={handleDeletePasManual}
          />
        )}

        {mainTab === "portal" && (
          <TabPortalUsuarios pas={pas} derivadores={derivadores} darkMode={darkMode} />
        )}
      </div>

      {/* MODALES */}
      {modalPas && (
        <ContactModal
          pas={modalPas}
          onClose={() => setModalPas(null)}
          onSave={handleSaveContacto}
          darkMode={darkMode}
        />
      )}

      {casosDetalleModal && (
        <CasoDetalle
          caso={casosDetalleModal.caso}
          pasId={casosDetalleModal.pasId}
          darkMode={darkMode}
          onUpdate={(updatedCaso) => {
            console.log("Caso actualizado:", updatedCaso);
            setCasosDetalleModal(null);
          }}
          onClose={() => setCasosDetalleModal(null)}
        />
      )}
    </div>
  );
}