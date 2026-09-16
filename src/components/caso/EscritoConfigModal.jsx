import React, { useState } from "react";
import { generarEscrito } from "../../utils/generarEscrito";

export function EscritoConfigModal({ caso, dni, dirHandle, onClose, onSuccess, onError }) {
  const [opcionesDoc, setOpcionesDoc] = useState({
    licencia: true,
    presupuesto: true,
    estudiosMedicos: false,
    cartaFranquicia: false,
  });

  const toggleOption = (key) => {
    setOpcionesDoc((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = () => {
    generarEscrito({ caso, dni, dirHandle, opcionesDoc, onSuccess, onError });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "420px", padding: "20px" }}>
        <h3>Configurar Escrito Extrajudicial</h3>
        <p style={{ fontSize: "0.85rem", color: "#666" }}>
          Seleccioná los ítems opcionales a incluir en este reclamo:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "15px 0" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={opcionesDoc.licencia}
              onChange={() => toggleOption("licencia")}
            />
            Licencia de conducir
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={opcionesDoc.presupuesto}
              onChange={() => toggleOption("presupuesto")}
            />
            Presupuesto
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={opcionesDoc.estudiosMedicos}
              onChange={() => toggleOption("estudiosMedicos")}
            />
            Estudios médicos / Constancia de atención
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={opcionesDoc.cartaFranquicia}
              onChange={() => toggleOption("cartaFranquicia")}
            />
            Carta de franquicia
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={onClose}>Cancelar</button>
          <button onClick={handleConfirm} style={{ fontWeight: "bold" }}>
            Generar PDF
          </button>
        </div>
      </div>
    </div>
  );
}