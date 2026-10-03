import CampoMonto from "../ui/CampoMonto.jsx";
import { TIPOS_RECLAMO, CULPA_CONCURRENCIA } from "../../constants.js";

export default function SeccionMontos({ formData, onChange, Th, pctComision }) {
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: Th.text, marginBottom: 14 }}>Montos</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { k: "monto_reclamado", l: "Monto reclamado ($)" },
          { k: "monto_cobro_asegurado", l: "Lo que cobró el asegurado ($)" },
          { k: "monto_cobro_yo", l: "Mis honorarios ($)" },
          { k: "monto_comision_pas", l: "Comisión PAS ($)" },
        ].map(f => (
          <label key={f.k}>
            <span style={labelStyle}>{f.l}</span>
            <CampoMonto value={formData[f.k]} onChange={v => onChange(f.k, v)} />
            {f.k === "monto_reclamado" && !(Number(formData.monto_reclamado) > 0) && formData.estado !== "doc_pendiente" && (
              <span style={{ display: "block", fontSize: 12, color: "var(--warn)", fontWeight: 600, marginTop: 4 }}>Falta cargarlo: se usa para comparar con el ofrecimiento.</span>
            )}
            {f.k === "monto_comision_pas" && (
              <span style={{ display: "block", fontSize: 12, color: Th.muted, marginTop: 4 }}>
                {pctComision ? `${pctComision}% de tus honorarios: se calcula sola al cargarlos` : pctComision === 0 ? "Este PAS no cobra comisión" : "El % del PAS se carga en Clientes"}
              </span>
            )}
          </label>
        ))}
      </div>
      {/* Tipo de reclamo (SQL 45): Análisis mide la concurrencia sobre la parte del tercero y deja la franquicia fuera de los % */}
      {"tipo_reclamo" in formData && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <label>
            <span style={labelStyle}>Tipo de reclamo</span>
            <select value={formData.tipo_reclamo || "culpa_tercero"} onChange={e => onChange("tipo_reclamo", e.target.value)} style={inputStyle}>
              {TIPOS_RECLAMO.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            {formData.tipo_reclamo === "franquicia" && (
              <span style={{ display: "block", fontSize: 12, color: Th.muted, marginTop: 4 }}>Se paga entera: no entra en el % ofrecido ni cobrado de la compañía.</span>
            )}
          </label>
          {formData.tipo_reclamo === "concurrencia" && (
            <label>
              <span style={labelStyle}>Culpa a cargo del tercero (%)</span>
              <input type="number" min={1} max={100} value={formData.porcentaje_culpa ?? ""} placeholder={String(CULPA_CONCURRENCIA)}
                onChange={e => onChange("porcentaje_culpa", e.target.value === "" ? "" : Math.min(100, Math.max(1, Number(e.target.value))))} style={inputStyle} />
              <span style={{ display: "block", fontSize: 12, color: Th.muted, marginTop: 4 }}>Lo ofrecido se mide sobre esta parte del reclamo.</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
