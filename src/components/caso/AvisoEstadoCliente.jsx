import { estadoSugerido, textoEtapaCliente } from "../../utils/vistaCliente.js";

// Aviso cuando las fechas del caso muestran que avanzó más que su estado: el cliente ve la etapa según el estado.
export default function AvisoEstadoCliente({ caso, onCambiar }) {
  const s = estadoSugerido(caso);
  if (!s) return null;
  return (
    <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, lineHeight: 1.45, padding: "8px 12px", borderRadius: 8, color: "var(--text)", background: "color-mix(in srgb, var(--warn) 12%, var(--card))", border: "1px solid color-mix(in srgb, var(--warn) 35%, transparent)" }}>
      <span style={{ flex: "1 1 220px" }}>
        El caso sigue en <b>{s.actualLabel}</b>, pero ya tiene {s.motivo}. El cliente y el PAS lo ven atrasado.
      </span>
      <button type="button" onClick={() => onCambiar(s.estado)}
        style={{ flex: "none", font: "inherit", fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 6, cursor: "pointer", border: "1px solid var(--warn)", background: "var(--card)", color: "var(--text)" }}>
        Pasar a {s.label}
      </button>
    </div>
  );
}

// Etiqueta junto al título del campo "Mensaje para el cliente"
export function EtiquetaMensajeCliente() {
  return (
    <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "var(--warn)", background: "color-mix(in srgb, var(--warn) 13%, transparent)", borderRadius: 5, padding: "1px 7px", whiteSpace: "nowrap" }}>
      Lo leen el cliente y el PAS
    </span>
  );
}

// Debajo del campo: si está vacío, qué ve el cliente en su lugar
export function VistaPreviaMensaje({ caso }) {
  if (String(caso.mensaje_cliente || "").trim() || caso.estado === "desistido") return null;
  const texto = textoEtapaCliente(caso);
  if (!texto) return null;
  return (
    <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
      Vacío: el cliente ve el texto automático de la etapa: <i>“{texto}”</i>
    </div>
  );
}
