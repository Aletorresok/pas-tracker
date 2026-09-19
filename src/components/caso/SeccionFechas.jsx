import React from "react";

export default function SeccionFechas({ formData, onChange, Th }) {
  const camposFechas = [
    ["Derivación", "fecha_derivacion"],
    ["Inicio de reclamo", "fecha_inicio_reclamo"],
    ["Ofrecimiento", "fecha_ofrecimiento"],
    ["Aceptación", "fecha_aceptacion"],
    ["Fecha de pago", "fecha_pago"],
    ["Cobro", "fecha_cobro"],
    ["Mediación", "fecha_mediacion"],
    ["Inicio de juicio", "fecha_inicio_juicio"]
  ];

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: Th.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        📅 Fechas del expediente
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
      </div>
    </div>
  );
}