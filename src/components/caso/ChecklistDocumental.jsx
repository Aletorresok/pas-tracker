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
        background: listoParaReclamo ? "#22c55e15" : "#ef444415",
        border: `1px solid ${listoParaReclamo ? "#22c55e44" : "#ef444444"}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>{listoParaReclamo ? "✅" : "⚠️"}</span>
        <div style={{ flex: 1 }}>
          {listoParaReclamo ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>
              Listo para iniciar reclamo
            </span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
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
                border: `1px solid ${tiene ? "#22c55e66" : esRequerido ? "#ef444444" : Th.border}`,
                borderRadius: 8,
                padding: "8px 10px",
                background: tiene ? "#22c55e0d" : esRequerido ? "#ef44440d" : "transparent",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 11, color: Th.muted, minWidth: 14, textAlign: "right", flexShrink: 0 }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: tiene ? "#22c55e" : esRequerido ? "#ef4444" : Th.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tipo}
                </div>
                {tiene && cantidad > 1 && (
                  <div style={{ fontSize: 10, color: Th.muted }}>{cantidad} archivos</div>
                )}
              </div>
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {tiene ? "✅" : esRequerido ? "❌" : "○"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}