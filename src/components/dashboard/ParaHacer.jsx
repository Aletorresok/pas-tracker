import { useState } from "react";
import { fmtMoney, fechaLocalISO } from "../../utils/formatters.js";
import PlazoChip from "../ui/PlazoChip.jsx";
import { linkWhatsApp } from "../../utils/mensajes.js";
import { primerNombre } from "../../utils/formatters.js";

const TIPO = { accion: "Próxima acción", honorarios: "Honorarios", quieto: "Reclamo quieto", dormido: "PAS dormido" };

// Lista única de tareas ordenada por vencimiento. Clic en una tarea abre el caso.
export default function ParaHacer({ tareas, onAbrir, onReiterar }) {
  const [reiterando, setReiterando] = useState(null);
  const reiterar = async (t) => { setReiterando(t.id); await onReiterar?.(t.caso); setReiterando(null); };
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
          <div key={t.id} className="tarea"
            style={{
              display: "grid", gridTemplateColumns: "112px minmax(0, 1fr) auto", gap: 12, alignItems: "center",
              padding: "10px 4px", borderTop: i ? "1px solid var(--border)" : "none",
            }}>
            <span className="tarea-plazo">{t.vence ? <PlazoChip vence={t.vence} /> : <span style={{ fontSize: 11, color: "var(--muted)" }}>Sin plazo</span>}</span>
            <button type="button" onClick={() => onAbrir(t)} style={{ minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit" }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.titulo}</span>
              <span style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", fontSize: 13, color: "var(--sub)", overflow: "hidden", lineHeight: 1.4 }}>
                <span style={{ color: "var(--muted)" }}>{TIPO[t.tipo]} · </span>{t.detalle}
              </span>
            </button>
            {t.tipo === "quieto" && onReiterar
              ? <button type="button" onClick={() => reiterar(t)} disabled={reiterando === t.id} title="Registra en la bitácora que reiteraste el reclamo hoy y reinicia la cuenta"
                  style={{ font: "inherit", fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border2)", background: "var(--card)", color: "var(--text)", cursor: "pointer", whiteSpace: "nowrap" }}>
                  {reiterando === t.id ? "Guardando…" : "Reiteré hoy"}
                </button>
              : t.tipo === "dormido" && linkWhatsApp((t.pas.telefonos || [])[0], "x")
                ? <a href={linkWhatsApp(t.pas.telefonos[0], `Hola ${primerNombre(t.pas.nombre)}, ¿cómo estás? Hace un tiempo que no hablamos. ¿Cómo viene todo? Cualquier siniestro que tengas, acá estoy para darte una mano.`)} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border2)", background: "var(--card)", color: "var(--text)", textDecoration: "none", whiteSpace: "nowrap" }}>Escribirle</a>
                : <span className="num" style={{ fontSize: 13, color: "var(--sub)", whiteSpace: "nowrap" }}>{t.monto ? fmtMoney(t.monto) : ""}</span>}
          </div>
        ))}
      </div>

    </section>
  );
}
