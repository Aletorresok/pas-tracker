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
import CasoDetalle from './CasoDetalle.jsx'
import ContactModal from './components/ContactModal.jsx'
import TabDashboard from './components/TabDashboard.jsx'
import TabClientes from './components/TabClientes.jsx'
import TabContactos from './components/TabContactos.jsx'
import TabContactados from './components/TabContactados.jsx'
import TabPortalUsuarios from './components/TabPortalUsuarios.jsx'
import PASCard from './components/PASCard.jsx'

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
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
  const [darkMode, setDarkMode] = useState(true);
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
    { k: "dashboard", l: "📊 Dashboard" },
    { k: "contactos", l: "📞 Contactos" },
    { k: "contactados", l: "✓ Contactados" },
    { k: "clientes", l: "🔐 Clientes" },
    { k: "portal", l: "🌐 Portal" },
  ];

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
  return (
    <div style={{ background: darkMode ? "#111827" : "#f8fafc", color: darkMode ? "#f1f5f9" : "#0f172a", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {/* NAVBAR */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 14px 0", borderBottom: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`, position: "sticky", top: 0, background: darkMode ? "#111827" : "#f8fafc", zIndex: 100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>🏢 PAS Tracker</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => setDarkMode(m => !m)} style={{ background: "transparent", border: "1px solid", borderColor: darkMode ? "#2d3f55" : "#e2e8f0", borderRadius: 8, color: subColor, padding: "6px 10px", cursor: "pointer", fontSize: 13 }}>{darkMode ? "☀️" : "🌙"}</button>
            <div style={{ position: "relative" }}>
              <button onClick={() => { }} style={{ background: "transparent", border: "1px solid", borderColor: darkMode ? "#2d3f55" : "#e2e8f0", borderRadius: 8, color: subColor, padding: "6px 10px", cursor: "pointer", fontSize: 13 }}>⚙️</button>
            </div>
          </div>
        </div>

        {/* BACKUP BUTTONS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <label style={{ flex: 1, position: "relative" }}>
            <input type="file" accept=".json" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRestore(f); e.target.value = ""; }} style={{ display: "none" }} />
            <button onClick={(e) => e.currentTarget.previousElementSibling.click()} style={{ width: "100%", background: darkMode ? "#1e293b" : "#f1f5f9", border: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}`, borderRadius: 8, color: subColor, padding: "8px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📥 Restaurar</button>
          </label>
          <button onClick={handleBackup} style={{ flex: 1, background: darkMode ? "#1e293b" : "#f1f5f9", border: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}`, borderRadius: 8, color: subColor, padding: "8px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>💾 Backup</button>
          {autobackupFecha && <div style={{ fontSize: 10, color: "#6b7280", padding: "8px 10px" }}>Auto: {new Date(autobackupFecha).toLocaleDateString("es-AR", { year: "2-digit", month: "2-digit", day: "2-digit" })}</div>}
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginBottom: pas.length > 0 ? 12 : 0 }}>
          {TABS.map(t => (
            <button
              key={t.k}
              onClick={() => setMainTab(t.k)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: mainTab === t.k ? "#6366f1" : darkMode ? "#1e293b" : "#e2e8f0",
                background: mainTab === t.k ? "#6366f133" : darkMode ? "#0a0f1e" : "#f8fafc",
                color: mainTab === t.k ? "#818cf8" : subColor,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all .15s",
              }}
            >
              {t.l}
            </button>
          ))}
        </div>

        {/* FILE UPLOAD */}
        {pas.length === 0 && (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", border: `2px dashed ${darkMode ? "#1e3a5f" : "#cbd5e1"}`, borderRadius: 12, padding: "22px 16px", cursor: "pointer", gap: 8, marginTop: 12 }}>
            <div style={{ fontSize: 28 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>Cargar listado_productores.xlsx</div>
            <div style={{ fontSize: 12, color: "#475569" }}>Hacé clic o arrastrá el archivo</div>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
          </label>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 14px 48px" }}>
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
          <TabDashboard pas={pas} historial={historial} casos={casos} derivadores={derivadores} recordatorios={recordatorios} darkMode={darkMode} pasManuales={pasManuales} onGoToClientes={() => setMainTab("clientes")} />
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