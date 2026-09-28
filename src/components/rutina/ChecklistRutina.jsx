import { bloquesDelDia, ahoraToca, prioridad, acceso as accesoDe, hhmm, DIAS_SEMANA } from "../../utils/rutina.js";
import Icono from "../ui/Icono.jsx";

const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 };

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

// Checklist de un período: el día (por bloques con horario), la semana o el mes
export default function ChecklistRutina({ frecuencia, items, escuela, hecho, onTildar, onIrA }) {
  if (frecuencia !== "diaria") {
    const hechos = items.filter(hecho).length;
    return (
      <section style={{ ...tarjeta, padding: "12px 16px" }}>
        <Encabezado titulo={frecuencia === "semanal" ? "Esta semana" : "Este mes"} hechos={hechos} total={items.length} />
        {!items.length && <Vacio />}
        {items.map((it, i) => (
          <div key={it.id} style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
            <FilaItem item={it} hecho={hecho(it)} onTildar={onTildar} onIrA={onIrA}
              extra={[it.bloque, it.dia ? (frecuencia === "semanal" ? `desde el ${DIAS_SEMANA[it.dia].toLowerCase()}` : it.dia === 0 ? "último día del mes" : `desde el día ${it.dia}`) : null].filter(Boolean).join(" · ")} />
          </div>
        ))}
      </section>
    );
  }

  const { bloques, postergados } = bloquesDelDia(items, escuela);
  const ahora = ahoraToca(bloques);
  const hechos = items.filter(hecho).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Encabezado titulo="Hoy" hechos={hechos} total={items.length - postergados.length} suelto />
      {escuela && (
        <div style={{ ...tarjeta, padding: "10px 14px", fontSize: 13, color: "var(--sub)", display: "flex", gap: 8, alignItems: "center" }}>
          <Icono nombre="calendario" size={16} />
          Día de escuela: {hhmm(escuela.hora_entrada)} a {hhmm(escuela.hora_salida)}. La rutina se reacomodó según la prioridad.
        </div>
      )}
      {!items.length && <section style={{ ...tarjeta, padding: 16 }}><Vacio /></section>}
      {bloques.map(b => {
        const actual = ahora?.enCurso && ahora.bloque === b;
        const listos = b.items.every(hecho);
        return (
          <section key={`${b.bloque}|${b.hora_inicio}`} style={{ ...tarjeta, padding: "12px 16px", borderColor: actual ? "var(--accent)" : "var(--border)", boxShadow: actual ? "0 0 0 1px var(--accent)" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: listos ? "var(--muted)" : "var(--text)" }}>
                {b.bloque}{actual && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "var(--accent-ink)", textTransform: "uppercase", letterSpacing: 0.4 }}>Ahora</span>}
              </h3>
              {b.hora_inicio && <span className="num" style={{ fontSize: 13, color: "var(--sub)" }}>{hhmm(b.hora_inicio)}{b.hora_fin ? ` a ${hhmm(b.hora_fin)}` : ""}</span>}
            </div>
            {b.aviso && <div style={{ fontSize: 12, color: "var(--warn)", fontWeight: 600, marginTop: 2 }}>{b.aviso}</div>}
            {b.items.map((it, i) => (
              <div key={it.id} style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
                <FilaItem item={it} hecho={hecho(it)} onTildar={onTildar} onIrA={onIrA} />
              </div>
            ))}
          </section>
        );
      })}
      {postergados.length > 0 && (
        <details style={{ ...tarjeta, padding: "10px 16px" }}>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--sub)" }}>Hoy no, por la escuela ({postergados.length})</summary>
          {postergados.map(it => <FilaItem key={it.id} item={it} hecho={hecho(it)} onTildar={onTildar} onIrA={onIrA} extra={it.bloque} />)}
        </details>
      )}
    </div>
  );
}

function Encabezado({ titulo, hechos, total, suelto }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: suelto ? 0 : 4 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{titulo}</h2>
      {total > 0 && <span className="num" style={{ fontSize: 13, color: hechos >= total ? "var(--ok)" : "var(--muted)", fontWeight: 600 }}>{hechos} de {total}</span>}
    </div>
  );
}

const Vacio = () => <div style={{ fontSize: 13, color: "var(--muted)", padding: "6px 0" }}>Nada cargado para este período. Sumalo en "Editar rutina".</div>;
