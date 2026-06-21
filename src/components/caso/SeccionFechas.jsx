const FECHAS = [
  { k: "fecha_derivacion", l: "Derivación" },
  { k: "fecha_contacto_asegurado", l: "Contacto asegurado" },
  { k: "fecha_inicio_reclamo", l: "Inicio reclamo" },
  { k: "fecha_ultimo_movimiento", l: "Último movimiento" },
  { k: "fecha_carga", l: "Carga del caso" },
  { k: "fecha_reclamo", l: "Reclamo" },
  { k: "fecha_ultimo_reclamo", l: "Último reclamo" },
  { k: "fecha_ofrecimiento", l: "Ofrecimiento (auto)" },
  { k: "fecha_reconsideracion", l: "Reconsideración" },
  { k: "fecha_aceptacion", l: "Aceptación" },
  { k: "fecha_firma", l: "Firma acuerdo" },
  { k: "fecha_pago", l: "Pago" },
  { k: "fecha_cobro", l: "Cobro" },
  { k: "fecha_mediacion", l: "Mediación" },
  { k: "fecha_inicio_juicio", l: "Inicio de juicio" },
];

export default function SeccionFechas({ formData, onChange, Th }) {
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>📅 Fechas del expediente</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {FECHAS.map(f => (
          <label key={f.k}>
            <span style={labelStyle}>{f.l}</span>
            <input type="date" value={formData[f.k] || ""} onChange={e => onChange(f.k, e.target.value)} style={inputStyle} />
          </label>
        ))}
      </div>
    </div>
  );
}
