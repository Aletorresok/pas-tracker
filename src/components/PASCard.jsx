import { fmtDate, waLink, diasDesde } from "../utils/formatters.js";
import { alpha } from "../utils/theme.js";
import Icono from "./ui/Icono.jsx";
import Boton from "./ui/Boton.jsx";


function Etiqueta({ color, children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", padding: "1px 8px 1px 6px", borderRadius: 999, color: "var(--text)", background: alpha(color, 14) }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />{children}
    </span>
  );
}

function Interruptor({ activo, label, detalle, onClick }) {
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", textAlign: "left", font: "inherit", flex: "1 1 220px" }}>
      <span style={{ width: 32, height: 18, borderRadius: 999, background: activo ? "var(--accent)" : "var(--border2)", position: "relative", flex: "none" }}>
        <span style={{ position: "absolute", top: 2, left: activo ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "var(--card)" }} />
      </span>
      <span>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{detalle}</span>
      </span>
    </button>
  );
}

// Fila de un PAS en Prospección: resumen en una línea, detalle al tocar
export default function PASCard({ pas, historial, derivadores, onContactar, onToggleDerivador, onToggleDescartado, descartados, expanded, onToggle }) {
  const contactos = historial[pas.id] || [];
  const ultimo = contactos[contactos.length - 1];
  const esDerivador = !!derivadores[pas.id];
  const esDescartado = !!descartados?.[pas.id];
  const telefonos = pas.telefonos || [];
  const hace = ultimo?.fecha ? diasDesde(ultimo.fecha) : null;

  return (
    <div style={{ borderBottom: "1px solid var(--border)", background: expanded ? "var(--card2)" : "transparent", opacity: esDescartado ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
        <button type="button" onClick={onToggle} aria-expanded={expanded}
          style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", font: "inherit", color: "var(--text)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{pas.nombre || "Sin nombre"}</span>
            {esDerivador && <Etiqueta color="var(--accent)">derivador</Etiqueta>}
            {esDescartado && <Etiqueta color="var(--muted)">descartado</Etiqueta>}
          </span>
          <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 3, fontSize: 12, color: "var(--sub)" }}>
            <span className="num">{telefonos.length === 1 ? telefonos[0] : telefonos.length > 1 ? `${telefonos.length} teléfonos` : "Sin teléfono"}</span>
            {ultimo && <span style={{ color: "var(--muted)" }}>contactado {hace === 0 ? "hoy" : hace !== null ? `hace ${hace} d` : fmtDate(ultimo.fecha)}{contactos.length > 1 ? ` · ${contactos.length} veces` : ""}</span>}
          </span>
        </button>
        {telefonos[0] && (
          <a href={waLink(telefonos[0], pas.nombre)} target="_blank" rel="noreferrer" className="btn-wa" aria-label={`Escribir por WhatsApp a ${pas.nombre}`} title="WhatsApp">
            <Icono nombre="mensaje" size={18} />
          </a>
        )}
      </div>

      {expanded && (
        <div style={{ padding: "4px 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Interruptor activo={esDerivador} label="Deriva casos" detalle="Aparece en Clientes" onClick={() => onToggleDerivador(pas.id)} />
            {onToggleDescartado && <Interruptor activo={esDescartado} label="Descartado" detalle={esDescartado ? "Tocá para recuperarlo" : "Lo saca de la lista"} onClick={() => onToggleDescartado(pas.id)} />}
          </div>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
            {pas.mail && (
              <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Mail</div><span style={{ color: "var(--text)", wordBreak: "break-all" }}>{pas.mail}</span></div>
            )}
            {telefonos.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Teléfonos</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {telefonos.map(t => (
                    <span key={t} style={{ display: "inline-flex", gap: 4 }}>
                      <a href={`tel:${t.replace(/\D/g, "")}`} className="num" style={{ color: "var(--text)", fontSize: 13, border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", textDecoration: "none", background: "var(--card)" }}>{t}</a>
                      <a href={waLink(t, pas.nombre)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--sub)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", textDecoration: "none", background: "var(--card)" }}>WhatsApp</a>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {contactos.length > 0 && (
            <div style={{ fontSize: 13, color: "var(--sub)" }}>
              <span style={{ color: "var(--muted)" }}>Contactos: </span>
              <span className="num">{[...contactos].reverse().map(c => fmtDate(c.fecha)).join(" · ")}</span>
            </div>
          )}

          <div><Boton variante="primario" icono="agregar" onClick={() => onContactar(pas)}>Registrar contacto</Boton></div>
        </div>
      )}
    </div>
  );
}
