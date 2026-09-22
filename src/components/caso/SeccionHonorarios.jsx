import { diasDesde } from "../../utils/formatters.js";
import { ESTADOS_HONORARIOS } from "../../constants.js";

export default function SeccionHonorarios({ formData, onChange, Th }) {
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;
  const diasDesdeFactura = formData.fecha_factura ? diasDesde(formData.fecha_factura) : null;
  const honorariosVencidos = formData.estado_honorarios === "FACTURADO" && diasDesdeFactura && diasDesdeFactura > 30;

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>Honorarios (facturación)</div>
      <label style={{ marginBottom: 12, display: "block" }}>
        <span style={labelStyle}>Monto de honorarios ($)</span>
        <input type="number" value={formData.monto_honorarios} onChange={e => onChange("monto_honorarios", e.target.value)} style={inputStyle} />
      </label>
      <div style={{ marginBottom: 12 }}>
        <span style={labelStyle}>Estado</span>
        <div style={{ display: "flex", gap: 6 }}>
          {ESTADOS_HONORARIOS.map(e => (
            <button key={e} onClick={() => onChange("estado_honorarios", e)} style={{
              flex: 1, padding: "8px 6px", borderRadius: 6,
              border: `1px solid ${formData.estado_honorarios === e ? "var(--accent)" : Th.border}`,
              background: formData.estado_honorarios === e ? "color-mix(in srgb, var(--accent) 13%, transparent)" : "transparent",
              color: formData.estado_honorarios === e ? "var(--accent)" : Th.sub,
              cursor: "pointer", fontSize: 12, fontWeight: formData.estado_honorarios === e ? 700 : 400,
            }}>{e}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <label>
          <span style={labelStyle}>Fecha de factura</span>
          <input type="date" value={formData.fecha_factura} onChange={e => onChange("fecha_factura", e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Fecha cobro honorarios</span>
          <input type="date" value={formData.fecha_cobro_honorarios} onChange={e => onChange("fecha_cobro_honorarios", e.target.value)} style={inputStyle} />
        </label>
      </div>
      {formData.estado_honorarios === "FACTURADO" && diasDesdeFactura !== null && (
        <div style={{ fontSize: 12, color: "var(--warn)", background: "color-mix(in srgb, var(--warn) 7%, transparent)", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
          Facturado hace {diasDesdeFactura} días
        </div>
      )}
      {honorariosVencidos && (
        <div style={{ fontSize: 12, color: "var(--bad)", background: "color-mix(in srgb, var(--bad) 7%, transparent)", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
          Cobro de honorarios vencido
        </div>
      )}
    </div>
  );
}
