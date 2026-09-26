import React from "react";

export default function SeccionFechas({ formData, onChange, Th, plazoCompania }) {
  const camposFechas = [
    ["Derivación", "fecha_derivacion"],
    ["Inicio de reclamo", "fecha_inicio_reclamo"],
    ["Primer pedido de respuesta", "fecha_reclamo"],
    ["Ofrecimiento", "fecha_ofrecimiento"],
    ["Aceptación", "fecha_aceptacion"],
    ["Firma del convenio", "fecha_firma"],
    ["Fecha de pago", "fecha_pago"],
    ["Indemnización pagada", "fecha_cobro"],
    ["Mediación", "fecha_mediacion"],
    ["Inicio de juicio", "fecha_inicio_juicio"]
  ];

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: Th.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        Fechas del expediente
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {camposFechas.map(([label, key]) => (
          <div key={key}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: Th.sub, marginBottom: 6 }}>
              {label}
            </label>
            <input
              type="date"
              value={formData[key] || ""}
              onChange={(e) => onChange(key, e.target.value)}
              style={{
                width: "100%",
                background: Th.card2,
                border: `1px solid ${Th.border}`,
                borderRadius: 8,
                padding: "10px 12px",
                color: Th.text,
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>
        ))}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: Th.sub, marginBottom: 6 }}>
            Plazo de pago (días)
          </label>
          <input type="number" min={1} max={365} inputMode="numeric" value={formData.plazo_pago || ""} placeholder={plazoCompania ? String(plazoCompania) : "Ej: 15"}
            onChange={e => onChange("plazo_pago", e.target.value)}
            style={{ width: "100%", background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 8, padding: "10px 12px", color: Th.text, fontSize: 14, outline: "none" }} />
          <span style={{ display: "block", fontSize: 12, color: Th.muted, marginTop: 4 }}>
            Desde la firma (o la aceptación). {plazoCompania ? `La compañía suele tener ${plazoCompania} días.` : "Podés cargar el de cada compañía en Análisis → Compañías."}
          </span>
        </div>
      </div>
    </div>
  );
}