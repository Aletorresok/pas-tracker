import { TIPOS_DOC, DOCS_REQUERIDOS_RECLAMO } from "../../constants.js";
import { fechaLocalISO, fmtDate } from "../../utils/formatters.js";

const NOMBRES = {
  DNI: "DNI", LICENCIA: "Licencia", CEDULA: "Cédula", FOTOS: "Fotos", ESCRITO: "Escrito",
  DENUNCIA: "Denuncia", CERTIFICADO: "Certificado de cobertura", PRESUPUESTO: "Presupuesto", "INFO TERCERO": "Info del tercero",
};

// Checklist manual: tildás lo que ya tenés. Se guarda en el caso (columna `documentacion`: tipo → fecha).
// `documentacion` undefined = la columna todavía no existe en la base (falta el SQL).
export default function ChecklistDocumental({ documentacion, onChange, Th }) {
  if (documentacion === undefined) {
    return <div style={{ fontSize: 13, color: "var(--warn)" }}>Para tildar la documentación falta correr el SQL del checklist (sql/2026-09-24_12_checklist_manual.sql).</div>;
  }
  const tiene = t => Boolean(documentacion?.[t]);
  const faltan = DOCS_REQUERIDOS_RECLAMO.filter(t => !tiene(t));
  const listo = faltan.length === 0;

  const alternar = (t) => {
    const nuevo = { ...(documentacion || {}) };
    if (nuevo[t]) delete nuevo[t]; else nuevo[t] = fechaLocalISO();
    onChange(nuevo);
  };

  return (
    <div>
      <div style={{
        borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10,
        background: listo ? "color-mix(in srgb, var(--ok) 8%, transparent)" : "color-mix(in srgb, var(--warn) 8%, transparent)",
        border: `1px solid ${listo ? "color-mix(in srgb, var(--ok) 27%, transparent)" : "color-mix(in srgb, var(--warn) 30%, transparent)"}`,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: listo ? "var(--ok)" : "var(--warn)" }}>{listo ? "✓" : "!"}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: listo ? "var(--ok)" : "var(--warn)" }}>
          {listo ? "Listo para iniciar reclamo" : <>Faltan para el reclamo: <span style={{ fontWeight: 400 }}>{faltan.map(t => NOMBRES[t] || t).join(", ")}</span></>}
        </span>
      </div>

      <div className="checklist-docs" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {TIPOS_DOC.map(t => {
          const ok = tiene(t);
          const requerido = DOCS_REQUERIDOS_RECLAMO.includes(t);
          return (
            <label key={t} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, cursor: "pointer", minWidth: 0,
              border: `1px solid ${ok ? "color-mix(in srgb, var(--ok) 40%, transparent)" : Th.border}`,
              background: ok ? "color-mix(in srgb, var(--ok) 6%, var(--card))" : "var(--card)",
            }}>
              <input type="checkbox" checked={ok} onChange={() => alternar(t)} style={{ width: 17, height: 17, accentColor: "var(--ok)", flex: "none", margin: 0 }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: Th.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {NOMBRES[t] || t}{requerido && !ok && <span style={{ color: "var(--warn)" }}> *</span>}
                </span>
                <span style={{ display: "block", fontSize: 11, color: ok ? "var(--ok)" : Th.muted }}>{ok ? `Lo tengo · ${fmtDate(documentacion[t])}` : requerido ? "Necesario para el reclamo" : "Pendiente"}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
