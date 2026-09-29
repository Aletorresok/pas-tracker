import { useState } from "react";
import { fechaPagoEstimada } from "../../utils/vistaCliente.js";
import { fmtDate } from "../../utils/formatters.js";

// Etapa a la que pertenece cada fecha: se ven las de las etapas a las que llegó el caso y la siguiente.
// Mediación y juicio solo aparecen si el caso está (o estuvo) ahí.
const CAMPOS = [
  { k: "fecha_derivacion", l: "Derivación", etapa: 0 },
  { k: "fecha_inicio_reclamo", l: "Inicio de reclamo", etapa: 1 },
  { k: "fecha_reclamo", l: "Primer pedido de respuesta", etapa: 2 },
  { k: "fecha_ofrecimiento", l: "Ofrecimiento", etapa: 3 },
  { k: "fecha_mediacion", l: "Mediación", solo: ["en_mediacion", "en_juicio"] },
  { k: "fecha_inicio_juicio", l: "Inicio de juicio", solo: ["en_juicio"] },
  { k: "fecha_aceptacion", l: "Aceptación", etapa: 4 },
  { k: "fecha_firma", l: "Firma del convenio", etapa: 4 },
  { k: "fecha_pago", l: "Pago estimado (según el acuerdo)", etapa: 4, ayuda: "La fecha en que la compañía se comprometió a pagar." },
  { k: "fecha_cobro", l: "Cobro efectivo de la indemnización", etapa: 5, ayuda: "Cuándo se cobró de verdad. También se carga al tildar el pago en Montos → Pagos." },
];
const ETAPA = { doc_pendiente: 0, iniciado: 1, reclamado: 2, con_ofrecimiento: 3, en_mediacion: 3, en_juicio: 3, esperando_pago: 4, cobrado: 5, desistido: 5 };

export default function SeccionFechas({ formData, onChange, Th, plazoCompania }) {
  const [todas, setTodas] = useState(false);
  const etapa = ETAPA[formData.estado] ?? 0;
  const visible = c => todas || formData[c.k] || (c.solo ? c.solo.includes(formData.estado) : c.etapa <= etapa + 1);
  const campos = CAMPOS.filter(visible);
  const ocultas = CAMPOS.length - campos.length;
  const muestraPlazo = todas || formData.plazo_pago || etapa >= 3;
  const estimada = !formData.fecha_pago ? fechaPagoEstimada({ ...formData, fecha_pago: null }) : null;

  const etiqueta = { display: "block", fontSize: 13, fontWeight: 600, color: Th.sub, marginBottom: 6 };
  const campo = { width: "100%", boxSizing: "border-box", background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: "var(--r-sm)", padding: "10px 12px", color: Th.text, fontSize: 14, outline: "none", font: "inherit" };
  const ayuda = { display: "block", fontSize: 12, color: Th.muted, marginTop: 4 };
  const link = { background: "none", border: "none", padding: 0, font: "inherit", fontSize: 13, fontWeight: 600, color: "var(--accent-ink)", cursor: "pointer" };

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-md)", padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: Th.text }}>Fechas del expediente</span>
        {(ocultas > 0 || todas) && (
          <button type="button" onClick={() => setTodas(t => !t)} style={link}>
            {todas ? "Ver solo las de esta etapa" : `Ver todas las fechas (${ocultas} más, incluye mediación y juicio)`}
          </button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {campos.map(c => (
          <label key={c.k}>
            <span style={etiqueta}>{c.l}</span>
            <input type="date" value={formData[c.k] || ""} onChange={e => onChange(c.k, e.target.value)} style={campo} />
            {c.k === "fecha_pago" && estimada && (
              <span style={ayuda}>
                Según firma + plazo: {fmtDate(estimada)}.{" "}
                <button type="button" onClick={() => onChange("fecha_pago", estimada)} style={{ ...link, fontSize: 12 }}>Usar esta</button>
              </span>
            )}
            {c.ayuda && !(c.k === "fecha_pago" && estimada) && <span style={ayuda}>{c.ayuda}</span>}
          </label>
        ))}
        {muestraPlazo && (
          <label>
            <span style={etiqueta}>Plazo de pago (días)</span>
            <input type="number" min={1} max={365} inputMode="numeric" value={formData.plazo_pago || ""} placeholder={plazoCompania ? String(plazoCompania) : "Ej: 15"}
              onChange={e => onChange("plazo_pago", e.target.value)} style={campo} />
            <span style={ayuda}>
              Desde la firma (o la aceptación). {plazoCompania ? `La compañía suele tener ${plazoCompania} días.` : "Podés cargar el de cada compañía en Análisis → Compañías."}
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
