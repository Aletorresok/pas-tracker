import { fmtMoney, fmtDate, diasDesde } from "../../utils/formatters.js";
import { ESTADOS_CASO } from "../../constants.js";

const estadoInfo = key => ESTADOS_CASO.find(e => e.key === key) || { label: key || "—", emoji: "📄", color: "#64748b" };

export function CasoCard({ caso, onDetalle, onDelete, darkMode }) {
  const ei = estadoInfo(caso.estado);
  const dias = caso.fecha_derivacion ? diasDesde(caso.fecha_derivacion) : null;
  const logOrdenado = [...(caso.notas_log || [])].sort((a, b) => b.ts - a.ts);
  const ultimaAccion = logOrdenado[0] || null;

  return (
    <div
      onClick={() => onDetalle(caso)}
      style={{
        background: darkMode ? "#0f172a" : "#fff",
        border: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`,
        borderLeft: `3px solid ${ei.color}`,
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 8,
        cursor: "pointer",
        transition: "border-color .15s, box-shadow .15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = ei.color + "88"; e.currentTarget.style.boxShadow = `0 2px 8px ${ei.color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = darkMode ? "#1e293b" : "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, color: darkMode ? "#f1f5f9" : "#0f172a", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {caso.asegurado || "Sin nombre"}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            <span style={{ fontSize: 10, background: ei.color + "18", color: ei.color, border: `1px solid ${ei.color}33`, borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>
              {ei.emoji} {ei.label}
            </span>
            {caso.compania && (
              <span style={{ fontSize: 10, background: darkMode ? "#1e293b" : "#f1f5f9", color: darkMode ? "#94a3b8" : "#64748b", borderRadius: 6, padding: "2px 7px", border: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}` }}>
                {caso.compania}
              </span>
            )}
            {dias !== null && (
              <span style={{ fontSize: 10, color: darkMode ? "#64748b" : "#94a3b8" }}>
                {dias}d
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {caso.monto_acordado || caso.monto_ofrecimiento ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1" }}>{fmtMoney(Number(caso.monto_acordado) || Number(caso.monto_ofrecimiento))}</span>
          ) : null}
          <button
            onClick={e => { e.stopPropagation(); onDelete(caso.id); }}
            style={{ background: "none", border: "none", color: darkMode ? "#334155" : "#cbd5e1", fontSize: 16, cursor: "pointer", padding: "2px 4px", lineHeight: 1 }}
            title="Eliminar caso"
          >×</button>
        </div>
      </div>
      {ultimaAccion && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#6366f1", flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fmtDate(ultimaAccion.fecha)} — {ultimaAccion.texto}
          </div>
        </div>
      )}
    </div>
  );
}

const ESTADO_ORDEN = Object.fromEntries(ESTADOS_CASO.map((e, i) => [e.key, i]));

function sortCasos(list, orden) {
  const sorted = [...list];
  switch (orden) {
    case "ultimo_mov": {
      sorted.sort((a, b) => {
        const lastA = (a.notas_log || []).reduce((m, n) => Math.max(m, n.ts || 0), a.caso_id || 0);
        const lastB = (b.notas_log || []).reduce((m, n) => Math.max(m, n.ts || 0), b.caso_id || 0);
        return lastB - lastA;
      });
      break;
    }
    case "alfabetico":
      sorted.sort((a, b) => (a.asegurado || "").localeCompare(b.asegurado || ""));
      break;
    case "estado":
      sorted.sort((a, b) => (ESTADO_ORDEN[a.estado] ?? 99) - (ESTADO_ORDEN[b.estado] ?? 99));
      break;
    default:
      break;
  }
  return sorted;
}

export default function ClienteCard({ pas, casos, onAddCaso, onDeleteCaso, onDetalleCaso, expanded, onToggle, darkMode, filtroEstado, ordenCasos }) {
  const filtered = sortCasos(filtroEstado === "todos" ? casos : casos.filter(c => c.estado === filtroEstado), ordenCasos);
  const totalMonto = casos.reduce((s, c) => s + (Number(c.monto_acordado) || Number(c.monto_ofrecimiento) || 0), 0);
  const cobrados = casos.filter(c => c.estado === "cobrado").length;

  return (
    <div style={{ background: darkMode ? "#1e293b" : "#f8fafc", border: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "14px 16px" }}
        onClick={onToggle}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 700, color: darkMode ? "#f1f5f9" : "#0f172a", fontSize: 15 }}>{pas.nombre}</div>
            {pas.manual && <span style={{ fontSize: 9, background: "#6366f122", color: "#818cf8", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>manual</span>}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8" }}>
            <span>{filtered.length} caso{filtered.length !== 1 ? "s" : ""}</span>
            {cobrados > 0 && <span style={{ color: "#22c55e" }}>✓ {cobrados} cobrado{cobrados !== 1 ? "s" : ""}</span>}
            {totalMonto > 0 && <span style={{ color: "#6366f1" }}>{fmtMoney(totalMonto)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={e => { e.stopPropagation(); onAddCaso(); }}
            style={{ background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", padding: "7px 14px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}
          >+ Caso</button>
          <span style={{ fontSize: 16, color: darkMode ? "#475569" : "#94a3b8" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}`, paddingTop: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ color: darkMode ? "#475569" : "#94a3b8", fontSize: 12, textAlign: "center", padding: 20 }}>Sin casos{filtroEstado !== "todos" ? " con este filtro" : ""}</div>
          ) : (
            filtered.map(c => (
              <CasoCard key={c.id} caso={c} onDetalle={onDetalleCaso} onDelete={onDeleteCaso} darkMode={darkMode} />
            ))
          )}
        </div>
      )}
    </div>
  );
}