export default function SeccionMontos({ formData, onChange, Th }) {
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>💰 Montos</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { k: "monto_reclamado", l: "Monto reclamado ($)" },
          { k: "monto_ofrecimiento", l: "Monto ofrecimiento ($)" },
          { k: "monto_cobro_asegurado", l: "Lo que cobró el asegurado ($)" },
          { k: "monto_cobro_yo", l: "Mis honorarios ($)" },
          { k: "monto_comision_pas", l: "Comisión PAS ($)" },
        ].map(f => (
          <label key={f.k}>
            <span style={labelStyle}>{f.l}</span>
            <input type="number" value={formData[f.k]} onChange={e => onChange(f.k, e.target.value)} style={inputStyle} />
          </label>
        ))}
      </div>
    </div>
  );
}
