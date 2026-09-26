import CampoMonto from "../ui/CampoMonto.jsx";

export default function SeccionMontos({ formData, onChange, Th, pctComision }) {
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: Th.text, marginBottom: 14 }}>Montos</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { k: "monto_reclamado", l: "Monto reclamado ($)" },
          { k: "monto_ofrecimiento", l: "Último ofrecimiento ($)" },
          { k: "monto_cobro_asegurado", l: "Lo que cobró el asegurado ($)" },
          { k: "monto_cobro_yo", l: "Mis honorarios ($)" },
          { k: "monto_comision_pas", l: "Comisión PAS ($)" },
        ].map(f => (
          <label key={f.k}>
            <span style={labelStyle}>{f.l}</span>
            <CampoMonto value={formData[f.k]} onChange={v => onChange(f.k, v)} />
            {f.k === "monto_comision_pas" && (
              <span style={{ display: "block", fontSize: 12, color: Th.muted, marginTop: 4 }}>
                {pctComision ? `${pctComision}% de tus honorarios: se calcula sola al cargarlos` : pctComision === 0 ? "Este PAS no cobra comisión" : "El % del PAS se carga en Clientes"}
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
