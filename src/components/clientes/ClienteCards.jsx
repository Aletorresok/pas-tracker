import { useState } from "react";
import { fmtMoney, fmtDate, diasDesde } from "../../utils/formatters.js";
import { ESTADOS_CASO } from "../../constants.js";

const estadoInfo = key => ESTADOS_CASO.find(e => e.key === key) || { label: key || "—", emoji: "📄", color: "#64748b" };

export function CasoCard({ caso, onDetalle, onDelete, darkMode }) {
  const [isHovered, setIsHovered] = useState(false);
  const ei = estadoInfo(caso.estado);
  const dias = caso.fecha_derivacion ? diasDesde(caso.fecha_derivacion) : null;
  const logOrdenado = [...(caso.notas_log || [])].sort((a, b) => b.ts - a.ts);
  const ultimaAccion = logOrdenado[0] || null;

  return (
    <div
      onClick={() => onDetalle(caso)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: darkMode ? "#0f172a" : "#fff",
        border: `1px solid ${isHovered ? ei.color + "88" : darkMode ? "#1e293b" : "#e2e8f0"}`,
        borderLeft: `3px solid ${ei.color}`,
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 8,
        cursor: "pointer",
        transition: "all .15s ease",
        boxShadow: isHovered ? `0 4px 12px ${ei.color}15` : "none",
      }}
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
            {caso.compania_aseguradora && (
              <span style={{ fontSize: 10, background: darkMode ? "#1e293b" : "#f1f5f9", color: darkMode ? "#94a3b8" : "#64748b", borderRadius: 6, padding: "2px 7px", border: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}` }}>
                {caso.compania_aseguradora}
              </span>
            )}
            {dias !== null && (
              <span style={{ fontSize: 10, color: darkMode ? "#64748b" : "#94a3b8" }}>
                {dias}d
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {caso.monto_acordado || caso.monto_ofrecimiento ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#C9A227" }}>{fmtMoney(Number(caso.monto_acordado) || Number(caso.monto_ofrecimiento))}</span>
          ) : null}
          <button
            onClick={e => { e.stopPropagation(); onDelete(caso.id); }}
            style={{ 
              background: "none", 
              border: "none", 
              color: darkMode ? "#f87171" : "#dc2626", 
              fontSize: 15, 
              cursor: "pointer", 
              padding: "2px 6px", 
              lineHeight: 1,
              opacity: isHovered ? 1 : 0,
              transition: "opacity 0.15s ease"
            }}
            title="Eliminar caso"
          >
            🗑️
          </button>
        </div>
      </div>
      {ultimaAccion && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#C9A227", flexShrink: 0 }} />
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
  const [isHoveredHeader, setIsHoveredHeader] = useState(false);
  const filtered = sortCasos(filtroEstado === "todos" ? casos : casos.filter(c => c.estado === filtroEstado), ordenCasos);
  const totalMonto = casos.reduce((s, c) => s + (Number(c.monto_acordado) || Number(c.monto_ofrecimiento) || 0), 0);
  const cobrados = casos.filter(c => c.estado === "cobrado").length;

  return (
    <div style={{ background: darkMode ? "#171E2B" : "#ffffff", border: `1px solid ${darkMode ? "#252D3D" : "#E4E2DC"}`, borderRadius: 12, marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "14px 18px" }}
        onClick={onToggle}
        onMouseEnter={() => setIsHoveredHeader(true)}
        onMouseLeave={() => setIsHoveredHeader(false)}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 700, color: darkMode ? "#E9E7E1" : "#1A1D24", fontSize: 15 }}>{pas.nombre}</div>
            {pas.manual && <span style={{ fontSize: 9, background: "#C9A22722", color: "#C9A227", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>manual</span>}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, color: darkMode ? "#8D93A1" : "#6B7180" }}>
            <span>{filtered.length} caso{filtered.length !== 1 ? "s" : ""}</span>
            {cobrados > 0 && <span style={{ color: "#2E7D53" }}>✓ {cobrados} cobrado{cobrados !== 1 ? "s" : ""}</span>}
            {totalMonto > 0 && <span style={{ color: "#C9A227" }}>{fmtMoney(totalMonto)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={e => { e.stopPropagation(); onAddCaso(); }}
            style={{ 
              background: isHoveredHeader ? "#C9A227" : "transparent", 
              border: `1px solid #C9A227`, 
              borderRadius: 8, 
              color: isHoveredHeader ? "#fff" : "#C9A227", 
              padding: "6px 12px", 
              fontSize: 12, 
              cursor: "pointer", 
              fontWeight: 700,
              transition: "all 0.15s ease"
            }}
          >
            + Caso
          </button>
          <span style={{ fontSize: 14, color: darkMode ? "#5A6273" : "#9CA3AF" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 18px 16px", borderTop: `1px solid ${darkMode ? "#252D3D" : "#E4E2DC"}`, paddingTop: 14, background: darkMode ? "#10151F" : "#F7F6F2" }}>
          {filtered.length === 0 ? (
            <div style={{ color: darkMode ? "#5A6273" : "#9CA3AF", fontSize: 12, textAlign: "center", padding: 20 }}>Sin casos{filtroEstado !== "todos" ? " con este filtro" : ""}</div>
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