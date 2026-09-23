import { fmtMoney, fechaLocalISO } from "../../utils/formatters.js";
import PlazoChip from "../ui/PlazoChip.jsx";

const TIPO = { accion: "Próxima acción", honorarios: "Honorarios" };

// Lista única de tareas ordenada por vencimiento. Clic en una tarea abre el caso.
export default function ParaHacer({ tareas, onAbrir }) {
  const lista = tareas;
  const vencidas = tareas.filter(t => t.vence && t.vence < fechaLocalISO()).length;

  return (
    <section style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Para hacer</h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {tareas.length} {tareas.length === 1 ? "tarea" : "tareas"}{vencidas ? ` · ${vencidas} vencida${vencidas > 1 ? "s" : ""}` : ""}
        </span>
      </div>

      {tareas.length === 0 && (
        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--sub)", fontSize: 14 }}>
          Nada pendiente. Cargá una "Próxima acción" con plazo en un caso y aparece acá.
        </div>
      )}

      <div className="lista-scroll" style={{ maxHeight: 440, overflowY: "auto", marginRight: -8, paddingRight: 8 }}>
        {lista.map((t, i) => (
          <button key={t.id} type="button" onClick={() => onAbrir(t)} className="tarea"
            style={{
              width: "100%", display: "grid", gridTemplateColumns: "112px minmax(0, 1fr) auto", gap: 12, alignItems: "center",
              padding: "10px 4px", background: "none", border: "none", borderTop: i ? "1px solid var(--border)" : "none",
              textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit",
            }}>
            <span className="tarea-plazo">{t.vence ? <PlazoChip vence={t.vence} /> : <span style={{ fontSize: 11, color: "var(--muted)" }}>Sin plazo</span>}</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.titulo}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ color: "var(--muted)" }}>{TIPO[t.tipo]} · </span>{t.detalle}
              </span>
            </span>
            <span className="num" style={{ fontSize: 13, color: "var(--sub)", whiteSpace: "nowrap" }}>{t.monto ? fmtMoney(t.monto) : ""}</span>
          </button>
        ))}
      </div>

    </section>
  );
}
