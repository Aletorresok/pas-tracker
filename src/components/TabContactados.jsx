import { useState, useMemo } from "react";
import { cleanPhones } from "../utils/formatters.js";
import PASCard from "./PASCard.jsx";

export default function TabContactados({
  pas,
  historial,
  derivadores,
  descartados,
  darkMode,
  onContactar,
  onToggleDerivador,
  onToggleDescartado,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroResp, setFiltroResp] = useState("todos");
  const [expandedId, setExpandedId] = useState(null);
  const [mostrarDescartados, setMostrarDescartados] = useState(false);
  const [page, setPage] = useState(0);
  const PER_PAGE = 40;

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

  const filtered = useMemo(() => {
    const conContacto = pas.filter(
      p => historial[p.id] && historial[p.id].length > 0 && !descartados[p.id]
    );

    const porFiltro = {
      todos: conContacto,
      positivo: conContacto.filter(p =>
        historial[p.id]?.some(e => e.resultados?.includes("positivo"))
      ),
      volver: conContacto.filter(p =>
        historial[p.id]?.some(e => e.resultados?.includes("volver_contactar"))
      ),
      negativo: conContacto.filter(p =>
        historial[p.id]?.some(e => e.resultados?.includes("negativo"))
      ),
      derivadores: conContacto.filter(p => derivadores[p.id]),
    };

    return (porFiltro[filtroResp] || []).filter(p =>
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.mail?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [filtroResp, busqueda, pas, historial, derivadores, descartados]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  // Mostrar descartados si el checkbox está activado
  const displayList = mostrarDescartados
    ? paginated
    : paginated.filter(p => !descartados[p.id]);

  return (
    <>
      <input
        value={busqueda}
        onChange={e => {
          setBusqueda(e.target.value);
          setPage(0);
        }}
        placeholder="🔍  Buscar contactado..."
        style={{ ...iStyle, marginBottom: 8 }}
      />

      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
        {[
          { k: "todos", l: "Todos" },
          { k: "positivo", l: "🟢 Positivos" },
          { k: "volver", l: "🔁 Volver a contactar" },
          { k: "negativo", l: "🔴 Negativos" },
          { k: "derivadores", l: "☑️ Derivadores" },
        ].map(f => (
          <button
            key={f.k}
            onClick={() => {
              setFiltroResp(f.k);
              setPage(0);
            }}
            style={{
              padding: "5px 11px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: filtroResp === f.k ? "#6366f1" : darkMode ? "#1e293b" : "#e2e8f0",
              background: filtroResp === f.k ? "#6366f122" : darkMode ? "#0a0f1e" : "#f8fafc",
              color: filtroResp === f.k ? "#818cf8" : subColor,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: subColor, marginBottom: 12, display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <span>{filtered.length.toLocaleString("es-AR")} contactados</span>
        {totalPages > 1 && <span>Pág {page + 1} / {totalPages}</span>}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: subColor }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14 }}>No hay contactados con ese filtro</div>
        </div>
      )}

      {displayList.map(p => (
        <PASCard
          key={p.id}
          pas={p}
          historial={historial}
          derivadores={derivadores}
          recordatorios={{}}
          onContactar={onContactar}
          onToggleDerivador={onToggleDerivador}
          onToggleDescartado={onToggleDescartado}
          descartados={descartados}
          expanded={expandedId === p.id}
          onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
          darkMode={darkMode}
        />
      ))}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`,
              background: darkMode ? "#0a0f1e" : "#f8fafc",
              color: page === 0 ? "#1e293b" : "#94a3b8",
              cursor: page === 0 ? "default" : "pointer",
            }}
          >
            ← Anterior
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`,
              background: darkMode ? "#0a0f1e" : "#f8fafc",
              color: page >= totalPages - 1 ? "#1e293b" : "#94a3b8",
              cursor: page >= totalPages - 1 ? "default" : "pointer",
            }}
          >
            Siguiente →
          </button>
        </div>
      )}

      {Object.values(descartados).filter(Boolean).length > 0 && (
        <button
          onClick={() => setMostrarDescartados(m => !m)}
          style={{
            width: "100%",
            marginTop: 16,
            background: "transparent",
            border: `1px dashed ${darkMode ? "#334155" : "#cbd5e1"}`,
            borderRadius: 10,
            color: darkMode ? "#475569" : "#94a3b8",
            padding: "10px",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {mostrarDescartados
            ? "🙈 Ocultar descartados"
            : `👁 Ver descartados (${Object.values(descartados).filter(Boolean).length})`}
        </button>
      )}
    </>
  );
}
