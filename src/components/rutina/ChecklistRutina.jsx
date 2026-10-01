// Fila de un ítem de la rutina (la usa Hoy → Mi día) y su acceso directo a una pestaña o a un sitio.
import { prioridad, acceso as accesoDe } from "../../utils/rutina.js";

export function BotonAcceso({ k, onIrA }) {
  const a = accesoDe(k);
  if (!a) return null;
  const estilo = { font: "inherit", flex: "none", fontSize: 12, fontWeight: 600, color: "var(--accent-ink)", background: "none", border: "none", padding: "2px 0", cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap" };
  return a.url
    ? <a href={a.url} target="_blank" rel="noreferrer" style={estilo}>{a.l} →</a>
    : <button type="button" onClick={() => onIrA?.(a.tab)} style={estilo}>{a.l} →</button>;
}

export function FilaItem({ item, hecho, onTildar, onIrA, extra }) {
  const p = prioridad(item.prioridad);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, cursor: "pointer" }}>
        <input type="checkbox" checked={hecho} onChange={e => onTildar(item, e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent)", flex: "none", margin: 0 }} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, color: hecho ? "var(--muted)" : "var(--text)", textDecoration: hecho ? "line-through" : "none", overflowWrap: "anywhere" }}>{item.titulo}</span>
          {(item.prioridad === "imprescindible" || extra) && (
            <span style={{ display: "block", fontSize: 11, color: item.prioridad === "imprescindible" ? p.color : "var(--muted)", fontWeight: 600 }}>
              {[item.prioridad === "imprescindible" && p.l, extra].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
      </label>
      <BotonAcceso k={item.acceso} onIrA={onIrA} />
    </div>
  );
}
