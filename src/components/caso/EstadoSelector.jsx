import { ESTADOS_CASO } from "../../constants.js";

export default function EstadoSelector({ value, onChange, darkMode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 5 }}>
      {ESTADOS_CASO.map(e => {
        const active = value === e.key;
        return (
          <button key={e.key} type="button" onClick={() => onChange(e.key)} style={{
            background: active ? e.color + "22" : darkMode ? "#1e293b" : "#f1f5f9",
            border: `2px solid ${active ? e.color : "transparent"}`,
            borderRadius: 8,
            padding: "8px 2px 6px",
            cursor: "pointer",
            textAlign: "center",
            transition: "all .15s",
          }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{e.emoji}</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: active ? e.color : darkMode ? "#94a3b8" : "#64748b", lineHeight: 1.2 }}>{e.label}</div>
          </button>
        );
      })}
    </div>
  );
}
