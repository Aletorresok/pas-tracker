import { useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import Icono from "./ui/Icono.jsx";
import { cerrarSesion } from "./LoginGate.jsx";
import { useInstalarApp } from "../hooks/useInstalarApp.js";
import { useNotificaciones } from "../utils/push.js";
import Logo from "./ui/Logo.jsx";

const TABS = [
  { k: "dashboard", l: "Hoy", icon: "inicio" },
  { k: "casos", l: "Casos", icon: "casos" },
  { k: "prospeccion", l: "Contactos", icon: "telefono" },
  { k: "clientes", l: "Clientes", icon: "clientes" },
  { k: "analisis", l: "Análisis", icon: "grafico" },
];

// En celular entran 4 pestañas + "Más"
const TABS_MOVIL = ["dashboard", "casos", "prospeccion", "clientes"];

function SelectorAcento() {
  const { acento, setAcento, ACENTOS } = useTheme();
  return (
    <div role="group" aria-label="Color de acento" style={{ display: "flex", gap: 8, padding: "4px 12px" }}>
      {ACENTOS.map(a => (
        <button
          key={a.key || "dorado"}
          type="button"
          onClick={() => setAcento(a.key)}
          title={a.label}
          aria-label={`Color ${a.label}`}
          aria-pressed={acento === a.key}
          style={{
            width: 22, height: 22, borderRadius: "50%", background: a.muestra, cursor: "pointer", padding: 0,
            border: "2px solid var(--card)",
            boxShadow: acento === a.key ? "0 0 0 2px var(--text)" : "0 0 0 1px var(--border2)",
          }}
        />
      ))}
    </div>
  );
}

function MenuUtilidades({ autobackupFecha, onBackup, onRestore, onCopiaCompleta, copiaFecha, onClose }) {
  const { darkMode, toggleDarkMode, T } = useTheme();
  const app = useInstalarApp();
  const push = useNotificaciones();
  const item = { width: "100%", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", color: T.text, padding: "10px 12px", cursor: "pointer", fontSize: 14, textAlign: "left", borderRadius: 6 };
  return (
    <>
      {app.puede && <>
        <button type="button" onClick={() => { app.instalar(); onClose(); }} style={{ ...item, fontWeight: 600 }}><Icono nombre="instalar" size={16} />Instalar app</button>
        <div style={{ borderTop: `1px solid ${T.border}`, margin: "4px 0" }} />
      </>}
      {push.estado !== "no-soportado" && push.estado !== "cargando" && <>
        <div style={{ fontSize: 12, color: T.muted, padding: "6px 12px 2px" }}>Notificaciones en este dispositivo</div>
        {push.estado === "activo" ? <>
          <div style={{ ...item, cursor: "default", color: "var(--ok)", fontWeight: 600 }}><Icono nombre="campana" size={16} />Activadas</div>
          <button type="button" onClick={push.probar} style={item}><Icono nombre="check" size={16} />Mandar una de prueba</button>
          <button type="button" onClick={push.resumen} style={item}><Icono nombre="campana" size={16} />Mandar el resumen de hoy</button>
          <button type="button" onClick={push.desactivar} style={{ ...item, color: T.sub }}><Icono nombre="cerrar" size={16} />Desactivar</button>
        </> : push.estado === "bloqueado"
          ? <div style={{ fontSize: 12, color: "var(--warn)", padding: "4px 12px 8px", lineHeight: 1.4 }}>Bloqueadas en el navegador. Habilitalas desde el candado de la barra de direcciones.</div>
          : <button type="button" onClick={push.activar} style={{ ...item, fontWeight: 600 }}><Icono nombre="campana" size={16} />Activar notificaciones</button>}
        {push.aviso && <div style={{ fontSize: 12, color: "var(--ok)", padding: "2px 12px 6px", lineHeight: 1.4 }}>{push.aviso}</div>}
        {push.error && <div style={{ fontSize: 12, color: "var(--bad)", padding: "2px 12px 6px", lineHeight: 1.4 }}>{push.error}</div>}
        <div style={{ borderTop: `1px solid ${T.border}`, margin: "4px 0" }} />
      </>}
      <button type="button" onClick={() => { onCopiaCompleta?.(); onClose(); }} style={{ ...item, fontWeight: 600 }}><Icono nombre="guardar" size={16} />Copia de seguridad completa</button>
      <div style={{ fontSize: 12, color: T.muted, padding: "0 12px 6px 38px", lineHeight: 1.4 }}>
        {copiaFecha ? `Última: ${new Date(copiaFecha + "T12:00:00").toLocaleDateString("es-AR")} · ` : ""}se descarga sola cada semana en la compu
      </div>
      <button type="button" onClick={() => { onBackup(); onClose(); }} style={item}><Icono nombre="guardar" size={16} />Descargar backup</button>
      <label style={{ ...item, margin: 0 }}>
        <input type="file" accept=".json" onChange={(e) => { const f = e.target.files?.[0]; if (f) onRestore(f); e.target.value = ""; onClose(); }} style={{ display: "none" }} />
        <Icono nombre="recargar" size={16} />Restaurar backup
      </label>
      {autobackupFecha && <div style={{ fontSize: 12, color: T.muted, padding: "2px 12px 8px" }}>Último autoguardado: {new Date(autobackupFecha).toLocaleDateString("es-AR")}</div>}
      <div style={{ borderTop: `1px solid ${T.border}`, margin: "4px 0" }} />
      <button type="button" onClick={toggleDarkMode} style={item}><Icono nombre={darkMode ? "sol" : "luna"} size={16} />{darkMode ? "Modo claro" : "Modo oscuro"}</button>
      <div style={{ fontSize: 12, color: T.muted, padding: "6px 12px 2px" }}>Color</div>
      <SelectorAcento />
      <div style={{ borderTop: `1px solid ${T.border}`, margin: "4px 0" }} />
      <button type="button" onClick={() => { if (window.confirm("¿Cerrar sesión en este navegador? La próxima vez te va a pedir mail y contraseña.")) cerrarSesion(); }} style={item}><Icono nombre="salir" size={16} />Cerrar sesión</button>
    </>
  );
}

export default function SidebarNav({ pasCount, mainTab, setMainTab, autobackupFecha, onBackup, onRestore, onBuscar, onCopiaCompleta, copiaFecha }) {
  const { T } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [showMas, setShowMas] = useState(false);

  const utilidades = { autobackupFecha, onBackup, onRestore, onCopiaCompleta, copiaFecha };

  return (
    <>
      {/* ── MENÚ LATERAL (compu) ── */}
      <aside className="sidebar" style={{
        width: 232, background: T.card, borderRight: `1px solid ${T.border}`,
        flexDirection: "column", justifyContent: "space-between",
        position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 100, padding: "20px 12px",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingLeft: 8 }}>
            <Logo alto={24} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2, color: T.text }}>ATG Lex</div>
              {pasCount > 0 && <div style={{ fontSize: 12, color: T.muted }}>{pasCount.toLocaleString("es-AR")} contactos</div>}
            </div>
          </div>

          <button type="button" onClick={onBuscar}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 12, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, color: T.muted, fontSize: 14, cursor: "pointer", textAlign: "left", font: "inherit" }}>
            <Icono nombre="buscar" size={16} /><span style={{ flex: 1 }}>Buscar</span>
            <span style={{ fontSize: 11, border: `1px solid ${T.border2 || T.border}`, borderRadius: 4, padding: "0 5px" }}>Ctrl K</span>
          </button>

          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {TABS.map(t => {
              const active = mainTab === t.k;
              return (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => setMainTab(t.k)}
                  aria-current={active ? "page" : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "9px 10px",
                    borderRadius: 8, border: "none", background: active ? T.card2 : "transparent",
                    color: active ? T.text : T.sub, fontSize: 14, fontWeight: active ? 600 : 500,
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{ color: active ? T.accent : "inherit", display: "flex" }}><Icono nombre={t.icon} /></span>
                  {t.l}
                </button>
              );
            })}
          </nav>
        </div>

        <div style={{ position: "relative", borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
          <button
            type="button"
            onClick={() => setShowMenu(v => !v)}
            aria-expanded={showMenu}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: "transparent", border: "none", borderRadius: 8, color: T.sub, padding: "9px 10px", cursor: "pointer", fontSize: 14, fontWeight: 500 }}
          >
            <Icono nombre="paleta" /> Apariencia y backup
          </button>
          {showMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setShowMenu(false)} />
              <div style={{ position: "absolute", left: 0, right: 0, bottom: "100%", marginBottom: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 6, zIndex: 99, boxShadow: T.shadow }}>
                <MenuUtilidades {...utilidades} onClose={() => setShowMenu(false)} />
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ── BUSCAR (celular) ── */}
      <button type="button" className="buscar-movil" onClick={onBuscar} aria-label="Buscar">
        <Icono nombre="buscar" size={20} />
      </button>

      {/* ── BARRA INFERIOR (celular) ── */}
      <nav className="bottom-nav" aria-label="Navegación">
        {TABS.filter(t => TABS_MOVIL.includes(t.k)).map(t => {
          const active = mainTab === t.k;
          return (
            <button key={t.k} type="button" onClick={() => { setMainTab(t.k); setShowMas(false); }} aria-current={active ? "page" : undefined}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", padding: "4px 0", cursor: "pointer", color: active ? T.accentInk : T.muted, fontSize: 11, fontWeight: active ? 600 : 500 }}>
              <Icono nombre={t.icon} size={20} />{t.l}
            </button>
          );
        })}
        <button type="button" onClick={() => setShowMas(v => !v)} aria-expanded={showMas}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", padding: "4px 0", cursor: "pointer", color: mainTab === "analisis" || showMas ? T.accentInk : T.muted, fontSize: 11, fontWeight: 500 }}>
          <Icono nombre="mas" size={20} />Más
        </button>
      </nav>

      {showMas && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 140, background: "color-mix(in srgb, #000 35%, transparent)" }} onClick={() => setShowMas(false)} />
          <div style={{ position: "fixed", left: 8, right: 8, bottom: "calc(70px + env(safe-area-inset-bottom, 0px))", zIndex: 145, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 8, boxShadow: T.shadow }}>
            {TABS.filter(t => !TABS_MOVIL.includes(t.k)).map(t => (
              <button key={t.k} type="button" onClick={() => { setMainTab(t.k); setShowMas(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: mainTab === t.k ? T.card2 : "none", border: "none", color: T.text, padding: "12px", cursor: "pointer", fontSize: 15, textAlign: "left", borderRadius: 8 }}>
                <Icono nombre={t.icon} />{t.l}
              </button>
            ))}
            <div style={{ borderTop: `1px solid ${T.border}`, margin: "4px 0" }} />
            <MenuUtilidades {...utilidades} onClose={() => setShowMas(false)} />
          </div>
        </>
      )}
    </>
  );
}
