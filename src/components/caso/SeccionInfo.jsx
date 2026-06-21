import EstadoSelector from "./EstadoSelector.jsx";
import CompaniaSelector from "./CompaniaSelector.jsx";

export default function SeccionInfo({ formData, onChange, darkMode, Th, companias, onAgregarCompania }) {
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>📋 Información del caso</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <label>
          <span style={labelStyle}>Asegurado *</span>
          <input type="text" value={formData.asegurado} onChange={e => onChange("asegurado", e.target.value)} style={inputStyle} />
        </label>
        <div>
          <span style={labelStyle}>Compañía aseguradora</span>
          <CompaniaSelector value={formData.compania_aseguradora || formData.compania || ""} onChange={v => { onChange("compania_aseguradora", v); onChange("compania", v); }} companias={companias || []} onAgregar={onAgregarCompania || (() => {})} darkMode={darkMode} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span style={labelStyle}>Fecha del siniestro</span>
          <input type="date" value={formData.fecha_siniestro} onChange={e => onChange("fecha_siniestro", e.target.value)} style={inputStyle} />
        </label>
        <div>
          <span style={labelStyle}>Estado del caso</span>
          <div style={{ marginTop: 6 }}>
            <EstadoSelector value={formData.estado} onChange={v => onChange("estado", v)} darkMode={darkMode} />
          </div>
        </div>
      </div>
    </div>
  );
}
