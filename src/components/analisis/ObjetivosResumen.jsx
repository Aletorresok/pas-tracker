import { useRutina } from "../../hooks/useRutina.js";
import { PERIODOS, rangoPeriodo, nombrePeriodo } from "../../utils/objetivos.js";
import { fechaLocalISO } from "../../utils/formatters.js";
import { TarjetaObjetivo } from "../rutina/ObjetivosPanel.jsx";

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: "12px 16px" };
const link = { background: "none", border: "none", padding: 0, font: "inherit", fontSize: 13, fontWeight: 600, color: "var(--accent-ink)", cursor: "pointer" };

// Análisis → Resumen: los objetivos del período en curso (del año al mes), con su avance. Se cargan y editan en Ajustes.
export default function ObjetivosResumen({ allCasos, historial, onIrA }) {
  const { datos, falta } = useRutina();
  if (!datos || falta) return null;
  const hoy = fechaLocalISO();
  const grupos = PERIODOS.slice().reverse().map(p => {
    const { inicio } = rangoPeriodo(p.k, hoy);
    return { p, inicio, lista: datos.objetivos.filter(o => o.periodo === p.k && o.inicio === inicio) };
  }).filter(g => g.lista.length);
  const datosObj = { allCasos, historial, rutina: { items: datos.items, registro: datos.registro } };

  return (
    <section style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Objetivos</h2>
        {onIrA && <button type="button" style={link} onClick={() => onIrA("ajustes")}>{grupos.length ? "Editar en Ajustes →" : "Cargar en Ajustes →"}</button>}
      </div>
      {!grupos.length && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>Sin objetivos para este período. Por ejemplo: honorarios cobrados del año o casos nuevos por mes.</div>}
      {grupos.map(({ p, inicio, lista }) => (
        <div key={p.k} style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--sub)" }}>{nombrePeriodo(p.k, inicio)}</div>
          {lista.map(o => <TarjetaObjetivo key={o.id} obj={o} datos={datosObj} />)}
        </div>
      ))}
    </section>
  );
}
