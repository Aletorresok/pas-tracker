import { RESULTADOS_CONTACTO } from "../constants.js";
import { fmtDate, waLink } from "../utils/formatters.js";

const LS = { fontSize: 11, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1, display: "block" };

function Badge({ color, children, small }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: small ? "1px 6px" : "2px 9px", fontSize: small ? 10 : 11, fontWeight: 600, fontFamily: "monospace", whiteSpace: "nowrap" }}>{children}</span>;
}

export default function PASCard({ pas, historial, derivadores, recordatorios, onContactar, onToggleDerivador, onToggleDescartado, descartados, expanded, onToggle, darkMode }) {
  const contactos = historial[pas.id] || [];
  const ultimo = contactos[contactos.length - 1];
  const esDerivador = derivadores[pas.id] || false;
  const esDescartado = descartados?.[pas.id] || false;
  const ultimosResultados = ultimo?.resultados || (ultimo?.resultado ? [ultimo.resultado] : []);
  const hoyStr = new Date().toISOString().slice(0, 10);
  const rec = recordatorios?.[pas.id];
  const recVencido = rec && rec < hoyStr;
  const recHoy = rec && rec === hoyStr;
  const recFuturo = rec && rec > hoyStr;

  return (
    <div style={{ background: esDerivador ? (darkMode ? "#0d1f14" : "#f0fdf4") : (darkMode ? "#0f172a" : "#fff"), border: `1px solid ${expanded ? "#6366f1" : recVencido ? "#ef444488" : recHoy ? "#f9741688" : esDerivador ? "#22c55e44" : darkMode ? "#1e293b" : "#e2e8f0"}`, borderRadius: 12, marginBottom: 8, overflow: "hidden", transition: "all .2s" }}>
      <div style={{ padding: "13px 15px", display: "flex", alignItems: "center", gap: 11 }}>
        <div onClick={() => onToggleDerivador(pas.id)} title="Va a derivar casos" style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${esDerivador ? "#22c55e" : "#334155"}`, background: esDerivador ? "#22c55e" : "transparent", flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
          {esDerivador && <span style={{ color: "white", fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: !contactos.length ? "#334155" : ultimosResultados.length ? (RESULTADOS_CONTACTO.find(r => r.key === ultimosResultados[0])?.color || "#94a3b8") : "#94a3b8" }} />
        <div onClick={onToggle} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: darkMode ? "#f1f5f9" : "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {pas.nombre || <span style={{ color: "#475569" }}>Sin nombre</span>}
            {esDerivador && <span style={{ marginLeft: 7, fontSize: 11, color: "#22c55e", fontWeight: 700 }}>🤝 derivador</span>}
            {recHoy && <span style={{ marginLeft: 7, fontSize: 11, color: "#f97316", fontWeight: 700 }}>⏰ hoy!</span>}
            {recVencido && <span style={{ marginLeft: 7, fontSize: 11, color: "#ef4444", fontWeight: 700 }}>⚠️ pendiente</span>}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 1 }}>
            {pas.prioridad === "agendado" ? `📱 ${pas.telefonos[0]}` : pas.prioridad === "multi" ? `📱 ${pas.telefonos.length} números` : "Sin teléfono"}
            {contactos.length > 0 && <span style={{ marginLeft: 8, color: "#334155" }}>· {contactos.length} contacto{contactos.length > 1 ? "s" : ""}</span>}
            {recFuturo && <span style={{ marginLeft: 8, color: "#f97316" }}>· rec. {fmtDate(rec)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
          {ultimosResultados.slice(0, 2).map(k => {
            const ri = RESULTADOS_CONTACTO.find(r => r.key === k);
            return ri ? <Badge key={k} color={ri.color} small>{fmtDate(ultimo.fecha)}</Badge> : null;
          })}
          {pas.prioridad === "agendado" && (
            <a href={waLink(pas.telefonos[0], pas.nombre)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              style={{ background: "#25d366", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 16 }}>💬</a>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`, padding: "13px 15px" }}>
          <div onClick={() => onToggleDerivador(pas.id)} style={{ display: "flex", alignItems: "center", gap: 10, background: esDerivador ? "#22c55e18" : darkMode ? "#1e293b" : "#f8fafc", border: `1px solid ${esDerivador ? "#22c55e44" : darkMode ? "#2d3f55" : "#e2e8f0"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 13, cursor: "pointer", transition: "all .2s" }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${esDerivador ? "#22c55e" : "#475569"}`, background: esDerivador ? "#22c55e" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {esDerivador && <span style={{ color: "white", fontSize: 12, fontWeight: 900 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: esDerivador ? "#22c55e" : "#94a3b8" }}>Va a derivar casos</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>Aparece en la pestaña Clientes</div>
            </div>
          </div>

          {onToggleDescartado && (
            <div onClick={() => onToggleDescartado(pas.id)} style={{ display: "flex", alignItems: "center", gap: 10, background: esDescartado ? "#ef444418" : darkMode ? "#1e293b" : "#f8fafc", border: `1px solid ${esDescartado ? "#ef444444" : darkMode ? "#2d3f55" : "#e2e8f0"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 13, cursor: "pointer", transition: "all .2s" }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${esDescartado ? "#ef4444" : "#475569"}`, background: esDescartado ? "#ef4444" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {esDescartado && <span style={{ color: "white", fontSize: 12, fontWeight: 900 }}>✕</span>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: esDescartado ? "#ef4444" : "#94a3b8" }}>Descartar — me dijo que no</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{esDescartado ? "Oculto en todas las pestañas · tocá para recuperar" : "Lo ocultás de la app hasta que lo recuperes"}</div>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 13 }}>
            {pas.mail && <div><span style={LS}>Mail</span><div style={{ fontSize: 12, color: darkMode ? "#94a3b8" : "#475569", wordBreak: "break-all" }}>{pas.mail}</div></div>}
            {pas.telefonos.length > 0 && (
              <div>
                <span style={LS}>Teléfonos</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                  {pas.telefonos.map(t => <a key={t} href={waLink(t, pas.nombre)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#25d366", textDecoration: "none", background: "#25d36622", borderRadius: 6, padding: "2px 8px" }}>{t}</a>)}
                </div>
              </div>
            )}
            {pas.respuesta && <div style={{ gridColumn: "1/-1" }}><span style={LS}>Respuesta anterior</span><div style={{ fontSize: 12, color: darkMode ? "#cbd5e1" : "#334155" }}>{pas.respuesta}</div></div>}
          </div>

          {contactos.length > 0 && (
            <div style={{ marginBottom: 13 }}>
              <span style={LS}>Historial de contactos</span>
              {contactos.map((c, i) => {
                const keys = c.resultados || (c.resultado ? [c.resultado] : []);
                return (
                  <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 8, borderBottom: i < contactos.length - 1 ? `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}` : "none", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", marginTop: 2 }}>{fmtDate(c.fecha)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: c.nota ? 4 : 0 }}>
                        {keys.map(k => { const ri = RESULTADOS_CONTACTO.find(r => r.key === k); return ri ? <Badge key={k} color={ri.color}>{ri.label}</Badge> : null; })}
                        {!keys.length && <Badge color={i === contactos.length - 1 ? "#f97316" : "#94a3b8"}>Sin resultado</Badge>}
                      </div>
                      {c.nota && <div style={{ fontSize: 12, color: darkMode ? "#94a3b8" : "#475569" }}>{c.nota}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {ultimo && !ultimosResultados.length && (
            <button onClick={() => onContactar(pas)} style={{ width: "100%", background: "#f97316", border: "none", borderRadius: 10, color: "white", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>📬 Registrar respuesta</button>
          )}
          <button onClick={() => onContactar(pas)} style={{ width: "100%", background: "#6366f1", border: "none", borderRadius: 10, color: "white", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>+ Registrar contacto</button>
        </div>
      )}
    </div>
  );
}