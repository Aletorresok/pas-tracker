import { RESULTADOS_CONTACTO } from "../constants.js";
import { fmtDate, waLink } from "../utils/formatters.js";
import { alpha } from "../utils/theme.js";

function Badge({ color, children, small }) {
  return <span style={{ background: alpha(color, 9), color, border: `1px solid ${alpha(color, 20)}`, borderRadius: 20, padding: small ? "2px 8px" : "3px 10px", fontSize: small ? 10 : 11, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>;
}

function ActionToggle({ active, color, icon, label, sub, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, background: active ? alpha(color, 6) : "transparent", border: `1px solid ${active ? alpha(color, 27) : "color-mix(in srgb, var(--border) 27%, transparent)"}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", transition: "all .2s" }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${active ? color : "var(--muted)"}`, background: active ? color : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {active && <span style={{ color: "var(--on-accent)", fontSize: 11, fontWeight: 900, lineHeight: 1 }}>{icon}</span>}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: active ? color : "var(--sub)" }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{sub}</div>
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

  const statusColor = !contactos.length ? "var(--border2)" : ultimosResultados.length ? (RESULTADOS_CONTACTO.find(r => r.key === ultimosResultados[0])?.color || "var(--sub)") : "var(--sub)";

  return (
    <div style={{
      background: esDerivador ? ("color-mix(in srgb, var(--ok) 8%, var(--card))") : ("var(--card)"),
      border: `1px solid ${expanded ? "color-mix(in srgb, var(--accent) 27%, transparent)" : recVencido ? "color-mix(in srgb, var(--bad) 27%, transparent)" : esDerivador ? "color-mix(in srgb, var(--ok) 20%, transparent)" : "var(--border)"}`,
      borderLeft: `3px solid ${esDerivador ? "var(--ok)" : statusColor}`,
      borderRadius: 12,
      marginBottom: 8,
      overflow: "hidden",
      transition: "all .2s",
    }}>
      {/* Header */}
      <div style={{ padding: "13px 15px", display: "flex", alignItems: "center", gap: 11 }}>
        <div onClick={() => onToggleDerivador(pas.id)} title="Derivador" style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${esDerivador ? "var(--ok)" : "var(--border2)"}`, background: esDerivador ? "var(--ok)" : "transparent", flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
          {esDerivador && <span style={{ color: "var(--on-accent)", fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
        </div>

        <div onClick={onToggle} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {pas.nombre || <span style={{ color: "var(--muted)" }}>Sin nombre</span>}
            </span>
            {esDerivador && <Badge color="var(--ok)" small>derivador</Badge>}
            {recHoy && <Badge color="var(--warn)" small>hoy!</Badge>}
            {recVencido && <Badge color="var(--bad)" small>pendiente</Badge>}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, display: "flex", gap: 8, alignItems: "center" }}>
            <span>{pas.prioridad === "agendado" ? `${pas.telefonos[0]}` : pas.prioridad === "multi" ? `${pas.telefonos.length} números` : "Sin teléfono"}</span>
            {contactos.length > 0 && <span style={{ color: "var(--border2)" }}>· {contactos.length} contacto{contactos.length > 1 ? "s" : ""}</span>}
            {recFuturo && <span style={{ color: "var(--warn)" }}>· rec. {fmtDate(rec)}</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {ultimosResultados.slice(0, 2).map(k => {
            const ri = RESULTADOS_CONTACTO.find(r => r.key === k);
            return ri ? <Badge key={k} color={ri.color} small>{fmtDate(ultimo.fecha)}</Badge> : null;
          })}
          {pas.prioridad === "agendado" && (
            <a href={waLink(pas.telefonos[0], pas.nombre)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              style={{ background: "#25d366", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 11, fontWeight: 700, color: "#fff", boxShadow: "0 2px 6px #25d36633" }} aria-label="Escribir por WhatsApp" title="WhatsApp">WA</a>
          )}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${"var(--border)"}`, padding: "14px 15px", background: "var(--card2)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            <ActionToggle active={esDerivador} color="var(--ok)" icon="✓" label="Va a derivar casos" sub="Aparece en la pestaña Clientes" onClick={() => onToggleDerivador(pas.id)} />
            {onToggleDescartado && (
              <ActionToggle active={esDescartado} color="var(--bad)" icon="✕" label="Descartar" sub={esDescartado ? "Oculto · tocá para recuperar" : "Lo ocultás de la lista"} onClick={() => onToggleDescartado(pas.id)} />
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            {pas.mail && (
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Mail</div>
                <div style={{ fontSize: 12, color: "var(--sub)", wordBreak: "break-all" }}>{pas.mail}</div>
              </div>
            )}
            {pas.telefonos.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Teléfonos</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {pas.telefonos.map(t => <a key={t} href={waLink(t, pas.nombre)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#25d366", textDecoration: "none", background: "#25d36615", borderRadius: 6, padding: "3px 8px" }}>{t}</a>)}
                </div>
              </div>
            )}
          </div>

          {contactos.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Historial</div>
              {contactos.map((c, i) => {
                const keys = c.resultados || (c.resultado ? [c.resultado] : []);
                return (
                  <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 8, borderBottom: i < contactos.length - 1 ? `1px solid ${"var(--card2)"}` : "none", marginBottom: 6 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", marginTop: 2, fontWeight: 500 }}>{fmtDate(c.fecha)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: c.nota ? 4 : 0 }}>
                        {keys.map(k => { const ri = RESULTADOS_CONTACTO.find(r => r.key === k); return ri ? <Badge key={k} color={ri.color}>{ri.label}</Badge> : null; })}
                        {!keys.length && <Badge color="var(--sub)">Sin resultado</Badge>}
                      </div>
                      {c.nota && <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 2 }}>{c.nota}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {ultimo && !ultimosResultados.length && (
              <button onClick={() => onContactar(pas)} style={{ flex: 1, background: "linear-gradient(135deg, var(--warn), var(--warn))", border: "none", borderRadius: 10, color: "var(--on-accent)", padding: "10px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Registrar respuesta</button>
            )}
            <button onClick={() => onContactar(pas)} style={{ flex: 1, background: "linear-gradient(135deg, var(--accent), var(--accent))", border: "none", borderRadius: 10, color: "var(--on-accent)", padding: "10px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>+ Registrar contacto</button>
          </div>
        </div>
      )}
    </div>
  );
}
