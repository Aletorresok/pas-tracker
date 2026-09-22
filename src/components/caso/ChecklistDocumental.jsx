import { TIPOS_DOC, DOCS_REQUERIDOS_RECLAMO } from "../../utils/categorizarArchivo.js";

export default function ChecklistDocumental({ archivos, Th }) {
  const conteo = {};
  TIPOS_DOC.forEach(t => { conteo[t] = 0; });
  archivos.forEach(a => {
    const match = a.nombre.match(/^([^_]+(?:_[^_\d][^_]*)*)_\d+\.[a-z0-9]+$/i);
    const tipo = match ? match[1].toUpperCase() : null;
    if (tipo && conteo[tipo] !== undefined) conteo[tipo]++;
    if (a.tipo && conteo[a.tipo] !== undefined) conteo[a.tipo] = Math.max(conteo[a.tipo], 1);
  });

  const faltanRequeridos = DOCS_REQUERIDOS_RECLAMO.filter(t => conteo[t] === 0);
  const listoParaReclamo = faltanRequeridos.length === 0;

  return (
    <div>
      <div style={{
        borderRadius: 8,
        padding: "10px 14px",
        marginBottom: 14,
        background: listoParaReclamo ? "color-mix(in srgb, var(--ok) 8%, transparent)" : "color-mix(in srgb, var(--bad) 8%, transparent)",
        border: `1px solid ${listoParaReclamo ? "color-mix(in srgb, var(--ok) 27%, transparent)" : "color-mix(in srgb, var(--bad) 27%, transparent)"}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: listoParaReclamo ? "var(--ok)" : "var(--bad)" }}>{listoParaReclamo ? "✓" : "!"}</span>
        <div style={{ flex: 1 }}>
          {listoParaReclamo ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ok)" }}>
              Listo para iniciar reclamo
            </span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--bad)" }}>
              Faltan para el reclamo:{" "}
              <span style={{ fontWeight: 400 }}>{faltanRequeridos.join(", ")}</span>
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {TIPOS_DOC.map((tipo, idx) => {
          const cantidad = conteo[tipo];
          const tiene = cantidad > 0;
          const esRequerido = DOCS_REQUERIDOS_RECLAMO.includes(tipo);
          return (
            <div
              key={tipo}
              style={{
                border: `1px solid ${tiene ? "color-mix(in srgb, var(--ok) 40%, transparent)" : esRequerido ? "color-mix(in srgb, var(--bad) 27%, transparent)" : Th.border}`,
                borderRadius: 8,
                padding: "8px 10px",
                background: tiene ? "color-mix(in srgb, var(--ok) 5%, transparent)" : esRequerido ? "color-mix(in srgb, var(--bad) 5%, transparent)" : "transparent",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 11, color: Th.muted, minWidth: 14, textAlign: "right", flexShrink: 0 }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: tiene ? "var(--ok)" : esRequerido ? "var(--bad)" : Th.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tipo}
                </div>
                {tiene && cantidad > 1 && (
                  <div style={{ fontSize: 11, color: Th.muted }}>{cantidad} archivos</div>
                )}
              </div>
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {tiene ? "✓" : esRequerido ? "✕" : "○"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}