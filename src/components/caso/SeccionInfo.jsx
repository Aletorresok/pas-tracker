import CompaniaSelector from "./CompaniaSelector.jsx";

export default function SeccionInfo({ formData, onChange, darkMode, Th, companias, onAgregarCompania }) {
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: Th.text, marginBottom: 14 }}>Datos del siniestro</div>
      
      {/* GRILLA DE 3 COLUMNAS PARA INCLUIR LA PATENTE */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 12, marginBottom: 12 }}>
        <label>
          <span style={labelStyle}>Asegurado *</span>
          <input type="text" value={formData.asegurado || ""} onChange={e => onChange("asegurado", e.target.value)} style={inputStyle} />
        </label>
        
        <label>
          <span style={labelStyle}>Patente</span>
          <input 
            type="text" 
            value={formData.patente || ""} 
            onChange={e => {
              const val = e.target.value.toUpperCase();
              onChange("patente", val);
            }} 
            placeholder="Ej: AB123CD"
            style={{ ...inputStyle, textTransform: "uppercase", textAlign: "center" }} 
          />
        </label>

        <div>
          <span style={labelStyle}>Compañía aseguradora</span>
          <CompaniaSelector value={formData.compania_aseguradora || ""} onChange={v => onChange("compania_aseguradora", v)} companias={companias || []} onAgregar={onAgregarCompania || (() => {})} darkMode={darkMode} />
        </div>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span style={labelStyle}>Fecha del siniestro</span>
          <input type="date" value={formData.fecha_siniestro || ""} onChange={e => onChange("fecha_siniestro", e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>DNI del asegurado</span>
          <input type="text" inputMode="numeric" value={formData.dni_asegurado || ""} onChange={e => onChange("dni_asegurado", e.target.value)} placeholder="Ej: 25123456" style={inputStyle} />
          <span style={{ display: "block", fontSize: 12, color: Th.muted, marginTop: 4 }}>El cliente consulta su caso con la patente y los últimos 3 números.</span>
        </label>
      </div>


    </div>
  );
}