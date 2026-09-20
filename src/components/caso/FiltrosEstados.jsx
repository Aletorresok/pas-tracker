import { ESTADOS_CASO } from "../../constants.js";

export default function FiltrosEstados({ filtrosEstados, setFiltrosEstados, allCasos, darkMode }) {
  const toggleFiltroEstado = (key) => {
    setFiltrosEstados(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const seleccionarTodosLosEstados = () => setFiltrosEstados(ESTADOS_CASO.map(e => e.key));
  const limpiarEstados = () => setFiltrosEstados([]);
  const seleccionarSoloActivos = () => {
    const activos = ESTADOS_CASO.filter(e => !["cobrado", "desistido"].includes(e.key)).map(e => e.key);
    setFiltrosEstados(activos);
  };

  const todosSeleccionados = filtrosEstados.length === ESTADOS_CASO.length;

  return (
    <div style={{ background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`, borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 11, color: darkMode ? "#8D93A1" : "#6B7180" }}>
        <span>Filtro múltiple por estado:</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={seleccionarSoloActivos} style={{ background: "none", border: "none", color: "#C9A227", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>⚡ Solo activos</button>
          <span>·</span>
          <button onClick={todosSeleccionados ? limpiarEstados : seleccionarTodosLosEstados} style={{ background: "none", border: "none", color: "#3B6E9E", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
            {todosSeleccionados ? "Ninguno" : "Todos"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {ESTADOS_CASO.map(e => {
          const cnt = allCasos.filter(c => c.estado === e.key).length;
          const active = filtrosEstados.includes(e.key);
          return (
            <button 
              key={e.key} 
              onClick={() => toggleFiltroEstado(e.key)} 
              style={{ 
                flex: 1, 
                minWidth: 58, 
                background: active ? e.color + "28" : darkMode ? "#0a0f1e" : "#fff", 
                border: `1px solid ${active ? e.color : darkMode ? "#1e293b" : "#e2e8f0"}`, 
                borderRadius: 8, 
                padding: "8px 4px", 
                textAlign: "center", 
                cursor: "pointer", 
                transition: "all .15s",
                opacity: active ? 1 : 0.45
              }}
            >
              <div style={{ fontSize: 14 }}>{e.emoji}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: cnt > 0 ? e.color : "#334155" }}>{cnt}</div>
              <div style={{ fontSize: 8, color: cnt > 0 ? e.color + "99" : "#334155", marginTop: 1, lineHeight: 1.2 }}>{e.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}