import { RESULTADOS_CONTACTO } from "../constants.js";
import { fmtDate, waLink } from "../utils/formatters.js";

function Badge({ color, children, small }) {
  return <span style={{ background: color + "18", color, border: `1px solid ${color}33`, borderRadius: 20, padding: small ? "2px 8px" : "3px 10px", fontSize: small ? 10 : 11, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>;
}

function ActionToggle({ active, color, icon, label, sub, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, background: active ? color + "10" : "transparent", border: `1px solid ${active ? color + "44" : "#1e293b44"}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", transition: "all .2s" }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${active ? color : "#475569"}`, background: active ? color : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {active && <span style={{ color: "white", fontSize: 11, fontWeight: 900, lineHeight: 1 }}>{icon}</span>}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: active ? color : "#94a3b8" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
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

  const statusColor = !contactos.length ? "#334155" : ultimosResultados.length ? (RESULTADOS_CONTACTO.find(r => r.key === ultimosResultados[0])?.color || "#94a3b8") : "#94a3b8";

  return (
    <div style={{
      background: esDerivador ? (darkMode ? "#0d1f14" : "#f0fdf4") : (darkMode ? "#111827" : "#fff"),
      border: `1px solid ${expanded ? "#6366f144" : recVencido ? "#ef444444" : esDerivador ? "#22c55e33" : darkMode ? "#1e293b" : "#e2e8f0"}`,
      borderLeft: `3px solid ${esDerivador ? "#22c55e" : statusColor}`,
      borderRadius: 12,
      marginBottom: 8,
      overflow: "hidden",
      transition: "all .2s",
    }}>
      {/* Header */}
      <div style={{ padding: "13px 15px", display: "flex", alignItems: "center", gap: 11 }}>
        <div onClick={() => onToggleDerivador(pas.id)} title="Derivador" style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${esDerivador ? "#22c55e" : "#334155"}`, background: esDerivador ? "#22c55e" : "transparent", flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
          {esDerivador && <span style={{ color: "white", fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
        </div>

        <div onClick={onToggle} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#f1f5f9" : "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {pas.nombre || <span style={{ color: "#475569" }}>Sin nombre</span>}
            </span>
            {esDerivador && <Badge color="#22c55e" small>derivador</Badge>}
            {recHoy && <Badge color="#f97316" small>hoy!</Badge>}
            {recVencido && <Badge color="#ef4444" small>pendiente</Badge>}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 3, display: "flex", gap: 8, alignItems: "center" }}>
            <span>{pas.prioridad === "agendado" ? `📱 ${pas.telefonos[0]}` : pas.prioridad === "multi" ? `📱 ${pas.telefonos.length} números` : "Sin teléfono"}</span>
            {contactos.length > 0 && <span style={{ color: "#334155" }}>· {contactos.length} contacto{contactos.length > 1 ? "s" : ""}</span>}
            {recFuturo && <span style={{ color: "#f97316" }}>· rec. {fmtDate(rec)}</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {ultimosResultados.slice(0, 2).map(k => {
            const ri = RESULTADOS_CONTACTO.find(r => r.key === k);
            return ri ? <Badge key={k} color={ri.color} small>{fmtDate(ultimo.fecha)}</Badge> : null;
          })}
          {pas.prioridad === "agendado" && (
            <a href={waLink(pas.telefonos[0], pas.nombre)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              style={{ background: "#25d366", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 16, boxShadow: "0 2px 6px #25d36633" }}>💬</a>
          )}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`, padding: "14px 15px", background: darkMode ? "#0b112188" : "#fafbfc" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            <ActionToggle active={esDerivador} color="#22c55e" icon="✓" label="Va a derivar casos" sub="Aparece en la pestaña Clientes" onClick={() => onToggleDerivador(pas.id)} />
            {onToggleDescartado && (
              <ActionToggle active={esDescartado} color="#ef4444" icon="✕" label="Descartar" sub={esDescartado ? "Oculto · tocá para recuperar" : "Lo ocultás de la lista"} onClick={() => onToggleDescartado(pas.id)} />
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            {pas.mail && (
              <div>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Mail</div>
                <div style={{ fontSize: 12, color: darkMode ? "#94a3b8" : "#475569", wordBreak: "break-all" }}>{pas.mail}</div>
              </div>
            )}
            {pas.telefonos.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Teléfonos</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {pas.telefonos.map(t => <a key={t} href={waLink(t, pas.nombre)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#25d366", textDecoration: "none", background: "#25d36615", borderRadius: 6, padding: "3px 8px" }}>{t}</a>)}
                </div>
              </div>
            )}
          </div>

          {contactos.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Historial</div>
              {contactos.map((c, i) => {
                const keys = c.resultados || (c.resultado ? [c.resultado] : []);
                return (
                  <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 8, borderBottom: i < contactos.length - 1 ? `1px solid ${darkMode ? "#1e293b44" : "#f1f5f9"}` : "none", marginBottom: 6 }}>
                    <div style={{ fontSize: 11, color: "#475569", whiteSpace: "nowrap", marginTop: 2, fontWeight: 500 }}>{fmtDate(c.fecha)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: c.nota ? 4 : 0 }}>
                        {keys.map(k => { const ri = RESULTADOS_CONTACTO.find(r => r.key === k); return ri ? <Badge key={k} color={ri.color}>{ri.label}</Badge> : null; })}
                        {!keys.length && <Badge color="#94a3b8">Sin resultado</Badge>}
                      </div>
                      {c.nota && <div style={{ fontSize: 12, color: darkMode ? "#94a3b8" : "#475569", marginTop: 2 }}>{c.nota}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {ultimo && !ultimosResultados.length && (
              <button onClick={() => onContactar(pas)} style={{ flex: 1, background: "linear-gradient(135deg, #f97316, #fb923c)", border: "none", borderRadius: 10, color: "white", padding: "10px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>📬 Registrar respuesta</button>
            )}
            <button onClick={() => onContactar(pas)} style={{ flex: 1, background: "linear-gradient(135deg, #6366f1, #818cf8)", border: "none", borderRadius: 10, color: "white", padding: "10px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>+ Registrar contacto</button>
          </div>
        </div>
      )}
    </div>
  );
}
