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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <label>
          <span style={labelStyle}>Fecha de factura</span>
          <input type="date" value={formData.fecha_factura || ""} onChange={e => onChange("fecha_factura", e.target.value)} style={Th.input} />
        </label>
        {"nro_factura" in formData
          ? <label>
              <span style={labelStyle}>Número de factura</span>
              <input value={formData.nro_factura || ""} onChange={e => onChange("nro_factura", e.target.value)} placeholder="Ej: 0001-00000123" style={Th.input} />
            </label>
          : <span style={{ fontSize: 12, color: Th.muted, alignSelf: "end" }}>Para cargar el número de factura falta correr el SQL 28.</span>}
      </div>
    </div>
  );
}
