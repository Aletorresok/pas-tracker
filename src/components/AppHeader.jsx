import { useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";

export default function AppHeader({
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
    <div style={{
      position: "sticky", top: 0, zIndex: 100,
      background: darkMode ? "rgba(9, 9, 11, 0.92)" : "rgba(250, 250, 250, 0.92)",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "12px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORES.primaryGradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📋</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>PAS Tracker</div>
              {pasCount > 0 && <div style={{ fontSize: 10, color: T.muted, marginTop: -1 }}>{pasCount.toLocaleString()} contactos</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowBackupMenu(v => !v)} style={{ background: T.card2, border: "none", borderRadius: 8, color: T.sub, padding: "7px 10px", cursor: "pointer", fontSize: 13 }}>💾</button>
              {showBackupMenu && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setShowBackupMenu(false)} />
                  <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 6, zIndex: 99, boxShadow: "0 8px 24px #0003", minWidth: 160 }}>
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
            <button onClick={toggleDarkMode} style={{ background: T.card2, border: "none", borderRadius: 8, color: T.sub, padding: "7px 10px", cursor: "pointer", fontSize: 13 }}>{darkMode ? "☀️" : "🌙"}</button>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 2, background: T.card2, borderRadius: 10, padding: 3 }}>
          {TABS.map(t => {
            const active = mainTab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setMainTab(t.k)}
                style={{
                  flex: 1, padding: "8px 6px", borderRadius: 8, border: "none",
                  background: active ? T.card : "transparent",
                  color: active ? COLORES.primaryLight : T.sub,
                  fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all .2s",
                  boxShadow: active ? "0 1px 4px #0002" : "none",
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
  );
}