import { diasDesde } from "../../utils/formatters.js";
import { estadoHonorarios } from "../../utils/metricas.js";

// Factura de tus honorarios. El monto es "Mis honorarios" (Montos) y el cobro se tilda en Pagos;
// el estado (sin facturar / facturado / cobrado) sale solo de las fechas.
export default function SeccionHonorarios({ formData, onChange, Th }) {
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const estado = estadoHonorarios(formData);
  const diasDesdeFactura = formData.fecha_factura ? diasDesde(formData.fecha_factura) : null;
  const vencidos = estado === "FACTURADO" && diasDesdeFactura > 30;
  const texto = { COBRADO: "Cobrados", FACTURADO: `Facturados${diasDesdeFactura !== null ? ` hace ${diasDesdeFactura} días` : ""}, sin cobrar`, NO_FACTURADO: "Sin facturar" }[estado];

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: Th.text }}>Factura de honorarios</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: vencidos ? "var(--bad)" : estado === "COBRADO" ? "var(--ok)" : Th.sub }}>
          {texto}{vencidos ? " · cobro vencido" : ""}
        </span>
      </div>
      <label style={{ display: "block", maxWidth: 240 }}>
        <span style={labelStyle}>Fecha de factura</span>
        <input type="date" value={formData.fecha_factura || ""} onChange={e => onChange("fecha_factura", e.target.value)} style={Th.input} />
      </label>
    </div>
  );
}
