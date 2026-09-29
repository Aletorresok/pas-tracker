import { itemsDelDia, escuelaDelDia, reacomodar, agruparEnBloques, claveRegistro, hhmm } from "../../utils/rutina.js";
import { FilaItem, Barra, tarjeta } from "./comunes.jsx";
import PendientesAuto from "./PendientesAuto.jsx";

const fechaLarga = iso => { const t = new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }); return t.charAt(0).toUpperCase() + t.slice(1); };

// La rutina del día: bloques con horario (reacomodados si hay escuela), lo sin horario y lo que quedó para otro día
export default function RutinaHoy({ items, escuela, registro, onTildar, onIr, allCasos, hoy, ahora = new Date() }) {
  const delDia = itemsDelDia(items, hoy);
  const esc = escuelaDelDia(escuela, hoy);
  const { agenda, postergados, sinHora } = reacomodar(delDia, esc);
  const bloques = agruparEnBloques(agenda);
  const hecho = i => registro.has(`${i.id}|${claveRegistro(i, hoy)}`);
  const cuentan = [...agenda, ...sinHora];
  const minutoActual = ahora.getHours() * 60 + ahora.getMinutes();

  return (
    <div className="rutina-hoy" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{fechaLarga(hoy)}</span>
            {esc && <span style={{ fontSize: 13, color: "var(--warn)", fontWeight: 600 }}>Escuela de {String(esc.hora_entrada).slice(0, 5)} a {String(esc.hora_salida).slice(0, 5)}: la rutina se reacomodó</span>}
          </div>
          {cuentan.length ? <Barra hechos={cuentan.filter(hecho).length} total={cuentan.length} /> : <div style={{ fontSize: 14, color: "var(--muted)" }}>Hoy no hay nada en la rutina.</div>}
        </div>

        {bloques.map((b, n) => {
          const enCurso = minutoActual >= b.ini && minutoActual < b.fin;
          return (
            <div key={`${b.bloque}-${b.ini}-${n}`} style={{ ...tarjeta, padding: "12px 16px", borderColor: enCurso ? "var(--accent)" : "var(--border)", boxShadow: enCurso ? "0 0 0 1px var(--accent)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{b.bloque}</span>
                <span className="num" style={{ fontSize: 13, color: enCurso ? "var(--accent-ink)" : "var(--sub)", fontWeight: 600 }}>
                  {hhmm(b.ini)}–{hhmm(b.fin)}{enCurso ? " · ahora" : ""}{b.movido ? ` · antes ${b.items[0].antes}` : ""}{b.acortado ? " · acortado por la escuela" : ""}
                </span>
              </div>
              {b.items.map(i => <FilaItem key={i.id} item={i} hecho={hecho(i)} onTildar={(it, v) => onTildar(it, hoy, v)} onIr={onIr} />)}
            </div>
          );
        })}

        {sinHora.length > 0 && (
          <div style={{ ...tarjeta, padding: "12px 16px" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>En algún momento del día</div>
            {sinHora.map(i => <FilaItem key={i.id} item={i} hecho={hecho(i)} onTildar={(it, v) => onTildar(it, hoy, v)} onIr={onIr} />)}
          </div>
        )}

        {postergados.length > 0 && (
          <div style={{ ...tarjeta, padding: "12px 16px", borderStyle: "dashed" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Hoy no entra (por la escuela)</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Si te hacés un rato, tildalo igual.</div>
            {postergados.map(i => <FilaItem key={i.id} item={i} hecho={hecho(i)} onTildar={(it, v) => onTildar(it, hoy, v)} onIr={onIr}
              extra={<span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{String(i.hora_inicio).slice(0, 5)}</span>} />)}
          </div>
        )}
      </div>

      <PendientesAuto allCasos={allCasos} hoy={hoy} onIr={onIr} />
    </div>
  );
}
