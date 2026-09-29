import { useMemo } from "react";
import { useRutina } from "../../hooks/useRutina.js";
import { tocaHoy, escuelaDelDia, bloquesDelDia, ahoraToca, hhmm } from "../../utils/rutina.js";
import { rangoPeriodo } from "../../utils/objetivos.js";
import { FilaItem } from "../rutina/ChecklistRutina.jsx";
import { TarjetaObjetivo } from "../rutina/ObjetivosPanel.jsx";

const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "12px 16px" };
const link = { background: "none", border: "none", padding: 0, font: "inherit", fontSize: 13, fontWeight: 600, color: "var(--accent-ink)", cursor: "pointer", whiteSpace: "nowrap" };

// Arriba de Hoy: el bloque de la rutina que toca ahora y la línea del objetivo anual
export default function AhoraToca({ allCasos, historial, onIrA }) {
  const { datos, falta, hecho, tildar } = useRutina();

  const { bloque, enCurso, pendientesHoy } = useMemo(() => {
    if (!datos) return {};
    const diarios = datos.items.filter(it => it.frecuencia === "diaria" && tocaHoy(it));
    const { bloques } = bloquesDelDia(diarios, escuelaDelDia(datos.escuela));
    const a = ahoraToca(bloques);
    return { bloque: a?.bloque, enCurso: a?.enCurso, pendientesHoy: diarios.filter(it => !hecho(it)).length };
  }, [datos, hecho]);

  const anual = useMemo(() => {
    if (!datos) return null;
    const { inicio } = rangoPeriodo("anio");
    const delAnio = datos.objetivos.filter(o => o.periodo === "anio" && o.inicio === inicio);
    return delAnio.find(o => o.metrica) || delAnio[0] || null;
  }, [datos]);

  if (!datos || falta) return null;
  if (!datos.items.length && !anual) {
    return (
      <div style={{ ...tarjeta, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 14, color: "var(--sub)" }}>
        Armá tu rutina y tus objetivos del año: acá vas a ver qué toca ahora y cómo venís.
        <button type="button" onClick={() => onIrA?.("rutina")} style={link}>Ir a Rutina →</button>
      </div>
    );
  }

  return (
    <div className="dash-cols" style={{ display: "grid", gridTemplateColumns: anual && datos.items.length ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 16, alignItems: "stretch" }}>
      {datos.items.length > 0 && (
        <section style={tarjeta}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              {bloque ? (enCurso ? "Ahora toca" : "Lo próximo") : "Rutina de hoy"}
              {bloque && <span style={{ fontWeight: 500, color: "var(--sub)" }}> · {bloque.bloque}</span>}
            </h2>
            <button type="button" onClick={() => onIrA?.("rutina")} style={link}>Rutina →</button>
          </div>
          {bloque ? <>
            <div className="num" style={{ fontSize: 12, color: "var(--muted)" }}>
              {hhmm(bloque.hora_inicio)}{bloque.hora_fin ? ` a ${hhmm(bloque.hora_fin)}` : ""}{bloque.aviso ? ` · ${bloque.aviso}` : ""}
            </div>
            {bloque.items.map((it, i) => (
              <div key={it.id} style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
                <FilaItem item={it} hecho={hecho(it)} onTildar={tildar} onIrA={onIrA} />
              </div>
            ))}
          </> : (
            <div style={{ fontSize: 14, color: "var(--sub)", padding: "6px 0" }}>
              {pendientesHoy ? `Terminaron los bloques con horario. Quedan ${pendientesHoy} ${pendientesHoy === 1 ? "tarea" : "tareas"} de hoy sin tildar.` : "Rutina de hoy completa."}
            </div>
          )}
        </section>
      )}
      {anual && (
        <section style={tarjeta}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Objetivo anual</h2>
            <button type="button" onClick={() => onIrA?.("rutina")} style={link}>Objetivos →</button>
          </div>
          <TarjetaObjetivo obj={anual} datos={{ allCasos, historial, rutina: { items: datos.items, registro: datos.registro } }} compacto={false} />
        </section>
      )}
    </div>
  );
}
