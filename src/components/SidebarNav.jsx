import { useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";

export default function SidebarNav({
  pasCount,
  mainTab,
  setMainTab,
  autobackupFecha,
  onBackup,
  onRestore,
}) {
  const { darkMode, toggleDarkMode, T, COLORES } = useTheme();
  const [showBackupMenu, setShowBackupMenu] = useState(false);

  const TABS = [
    { k: "dashboard", l: "Dashboard", icon: "📊" },
    { k: "casos", l: "Casos", icon: "📂" },
    { k: "contactos", l: "Contactos", icon: "📞" },
    { k: "contactados", l: "Contactados", icon: "✓" },
    { k: "clientes", l: "Clientes", icon: "🏠" },
    { k: "portal", l: "Portal", icon: "🌐" },
  ];

  return (
    <aside style={{
      width: 240,
      background: T.card,
      borderRight: `1px solid ${T.border}`,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      position: "fixed",
      top: 0,
      bottom: 0,
      left: 0,
      zIndex: 100,
      padding: "20px 16px",
    }}>
      {/* SECCIÓN SUPERIOR: Logo y Navegación */}
      <div>
        {/* LOGO */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, paddingLeft: 4 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: COLORES.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff" }}>📋</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, color: T.text }}>PAS Tracker</div>
            {pasCount > 0 && <div style={{ fontSize: 11, color: T.muted, marginTop: -1 }}>{pasCount.toLocaleString()} contactos</div>}
          </div>
        </div>

        {/* TABS / MENÚ LATERAL */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {TABS.map(t => {
            const active = mainTab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setMainTab(t.k)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: active ? T.card2 : "transparent",
                  color: active ? COLORES.brand : T.sub,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all .15s ease",
                }}
              >
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                {t.l}
              </button>
            );
          })}
        </nav>
      </div>

      {/* SECCIÓN INFERIOR: Utilidades (Backup y DarkMode) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
        {/* BOTÓN BACKUP */}
        <div style={{ position: "relative" }}>
          <button 
            onClick={() => setShowBackupMenu(v => !v)} 
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: T.card2, border: "none", borderRadius: 8, color: T.sub, padding: "9px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
          >
            <span>💾</span> Copia de seguridad
          </button>
          {showBackupMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setShowBackupMenu(false)} />
              <div style={{ position: "absolute", left: 0, bottom: "100%", marginBottom: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 6, zIndex: 99, boxShadow: "0 8px 24px #0003", minWidth: 180 }}>
                <button onClick={() => { onBackup(); setShowBackupMenu(false); }} style={{ width: "100%", background: "none", border: "none", color: T.text, padding: "8px 12px", cursor: "pointer", fontSize: 12, textAlign: "left", borderRadius: 6 }}>💾 Descargar backup</button>
                <label style={{ display: "block" }}>
                  <input type="file" accept=".json" onChange={(e) => { const f = e.target.files?.[0]; if (f) onRestore(f); e.target.value = ""; setShowBackupMenu(false); }} style={{ display: "none" }} />
                  <div style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12, color: T.text, borderRadius: 6 }} onMouseEnter={e => e.currentTarget.style.background = T.card2} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>📥 Restaurar backup</div>
                </label>
                {autobackupFecha && <div style={{ fontSize: 10, color: T.muted, padding: "4px 12px", borderTop: `1px solid ${T.border}`, marginTop: 4, paddingTop: 8 }}>Auto: {new Date(autobackupFecha).toLocaleDateString("es-AR")}</div>}
              </div>
            </>
          )}
        </div>

        {/* BOTÓN MODO OSCURO / CLARO */}
        <button 
          onClick={toggleDarkMode} 
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: T.card2, border: "none", borderRadius: 8, color: T.sub, padding: "9px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
        >
          <span>{darkMode ? "☀️" : "🌙"}</span> {darkMode ? "Modo Claro" : "Modo Oscuro"}
        </button>
      </div>
    </aside>
  );
}