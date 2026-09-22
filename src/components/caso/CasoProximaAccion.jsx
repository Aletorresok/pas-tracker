import React from 'react';

export default function CasoProximaAccion({ formData, onChange, Th }) {
  return (
    <div style={{
      background: Th.card,
      border: `1px solid ${Th.border}`,
      borderLeft: `4px solid var(--warn)`, // Borde naranja para destacarlo como uso interno
      borderRadius: 12,
      padding: 16,
      marginBottom: 16
    }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 8 }}>
        Próxima Acción (Uso Interno)
      </label>
      <textarea
        value={formData.proxima_accion || ""}
        onChange={(e) => onChange("proxima_accion", e.target.value)}
        placeholder="Ej: Llamar a la compañía para apurar el pago..."
        style={{
          ...Th.input,
          width: "100%",
          minHeight: "60px",
          resize: "vertical"
        }}
      />
      <div style={{ fontSize: 11, color: Th.muted, marginTop: 6 }}>
        Esta nota solo es visible para la administración, no figura en reportes ni la ve el PAS.
      </div>
    </div>
  );
}