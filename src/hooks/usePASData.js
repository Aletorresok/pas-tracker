import { useState, useMemo } from "react";
import { VISTAS_C } from "../constants.js";
import { cleanPhones } from "../utils/formatters.js";
import PASCard from "./PASCard.jsx";

export default function TabContactos({
  pas,
  historial,
  derivadores,
  recordatorios,
  descartados,
  darkMode,
  onContactar,
  onToggleDerivador,
  onToggleDescartado,
}) {
  const [vista, setVista] = useState("agendado");
  const [busqueda, setBusqueda] = useState("");
  const [expandedId, setExpandedId] = useState(null);
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
    const byVista = vista === "todos" ? pas : pas.filter(p => p.prioridad === vista);
    return byVista.filter(p => !descartados[p.id] && (
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.mail?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.telefonos?.join(" ").includes(busqueda)
    ));
  }, [vista, busqueda, pas, descartados]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <>
      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        {VISTAS_C.map(v => (
          <button
            key={v.key}
            onClick={() => {
              setVista(v.key);
              setPage(0);
              setBusqueda("");
            }}
            style={{
              flex: 1,
              padding: "6px 4px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: vista === v.key ? v.color : darkMode ? "#1e293b" : "#e2e8f0",
              background: vista === v.key ? v.color + "22" : darkMode ? "#0a0f1e" : "#f8fafc",
              color: vista === v.key ? v.color : subColor,
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {v.label}
            <br />
            <span style={{ fontSize: 13, fontWeight: 800 }}>
              {pas.filter(p => v.key === "todos" || p.prioridad === v.key).length.toLocaleString("es-AR")}
            </span>
          </button>
        ))}
      </div>

      <input
        value={busqueda}
        onChange={e => {
          setBusqueda(e.target.value);
          setPage(0);
        }}
        placeholder="🔍  Buscar por nombre, mail o teléfono..."
        style={{ ...iStyle, marginBottom: 8 }}
      />

      <div style={{ fontSize: 12, color: subColor, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
        <span>{filtered.length.toLocaleString("es-AR")} resultados</span>
        {totalPages > 1 && <span>Pág {page + 1} / {totalPages}</span>}
      </div>

      {paginated.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: subColor }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
          <div style={{ fontSize: 14 }}>No hay contactos disponibles</div>
        </div>
      )}

      {paginated.map(p => (
        <PASCard
          key={p.id}
          pas={p}
          historial={historial}
          derivadores={derivadores}
          recordatorios={recordatorios}
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
    </>
  );
}