import { useState, useMemo } from "react";
import { VISTAS_C } from "../constants.js";
import { cleanPhones } from "../utils/formatters.js";
import PASCard from "./PASCard.jsx";
import { alpha } from "../utils/theme.js";

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
  const [orden, setOrden] = useState("nombre");
  const PER_PAGE = 40;

  const subColor = "var(--sub)";
  const iStyle = {
    background: "var(--card2)",
    border: `1px solid ${"var(--border)"}`,
    borderRadius: 8,
    color: "var(--text)",
    padding: "9px 12px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  const noContactados = useMemo(() => pas.filter(p => !(historial[p.id]?.length > 0)), [pas, historial]);

  const filtered = useMemo(() => {
    const byVista = vista === "todos" ? noContactados : noContactados.filter(p => p.prioridad === vista);
    const base = byVista.filter(p => !descartados[p.id] && (
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.mail?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.telefonos?.join(" ").includes(busqueda)
    ));
    return [...base].sort((a, b) => {
      if (orden === "telefono") return (a.telefonos?.[0] || "").localeCompare(b.telefonos?.[0] || "");
      if (orden === "mail") return (a.mail || "").localeCompare(b.mail || "");
      return (a.nombre || "").localeCompare(b.nombre || "");
    });
  }, [vista, busqueda, noContactados, descartados, orden]);

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
              borderColor: vista === v.key ? v.color : "var(--border)",
              background: vista === v.key ? alpha(v.color, 13) : "var(--card2)",
              color: vista === v.key ? v.color : subColor,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {v.label}
            <br />
            <span style={{ fontSize: 13, fontWeight: 800 }}>
              {noContactados.filter(p => v.key === "todos" || p.prioridad === v.key).length.toLocaleString("es-AR")}
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
        placeholder="Buscar por nombre, mail o teléfono..."
        style={{ ...iStyle, marginBottom: 8 }}
      />

      <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
        {[
          { key: "nombre", label: "Nombre" },
          { key: "telefono", label: "Teléfono" },
          { key: "mail", label: "Mail" },
        ].map(o => (
          <button key={o.key} onClick={() => { setOrden(o.key); setPage(0); }} style={{
            flex: 1, padding: "5px 8px", borderRadius: 7, fontSize: 11, fontWeight: orden === o.key ? 700 : 500,
            border: `1px solid ${orden === o.key ? "var(--accent)" : "var(--border)"}`,
            background: orden === o.key ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "var(--card2)",
            color: orden === o.key ? "var(--accent)" : subColor,
            cursor: "pointer", transition: "all .15s",
          }}>
            {orden === o.key ? "↕ " : ""}{o.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: subColor, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
        <span>{filtered.length.toLocaleString("es-AR")} resultados</span>
        {totalPages > 1 && <span>Pág {page + 1} / {totalPages}</span>}
      </div>

      {paginated.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: subColor }}>
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
              border: `1px solid ${"var(--border)"}`,
              background: "var(--card2)",
              color: page === 0 ? "var(--border)" : "var(--sub)",
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
              border: `1px solid ${"var(--border)"}`,
              background: "var(--card2)",
              color: page >= totalPages - 1 ? "var(--border)" : "var(--sub)",
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