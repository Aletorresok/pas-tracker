import { useState, useEffect, useMemo, useCallback } from "react";
import { cargarRutina, cargarRegistro, tildar, claveRegistro, cargarEjemplo } from "../utils/rutina.js";
import { cargarObjetivos } from "../utils/objetivos.js";
import { aplanarCasos } from "../utils/metricas.js";
import { fechaLocalISO } from "../utils/formatters.js";
import Boton from "./ui/Boton.jsx";
import RutinaHoy from "./rutina/RutinaHoy.jsx";
import RutinaPeriodo from "./rutina/RutinaPeriodo.jsx";
import Objetivos from "./rutina/Objetivos.jsx";
import EditorRutina from "./rutina/EditorRutina.jsx";

const VISTAS = [["hoy", "Hoy"], ["semana", "Semana"], ["mes", "Mes"], ["objetivos", "Objetivos"], ["editar", "Editar rutina"]];

// Rutina: el día a día (bloques con horario, prioridad y accesos), lo semanal, lo mensual y los objetivos
export default function TabRutina({ casos = {}, todosLosPas = [], historial = {}, onIrA }) {
  const hoy = fechaLocalISO();
  const [vista, setVista] = useState("hoy");
  const [datos, setDatos] = useState(null); // { items, escuela }
  const [registro, setRegistro] = useState(new Set());
  const [objetivos, setObjetivos] = useState([]);
  const [error, setError] = useState("");
  const allCasos = useMemo(() => aplanarCasos(casos, todosLosPas), [casos, todosLosPas]);

  const recargar = useCallback(async () => {
    const [r, reg, objs] = await Promise.all([cargarRutina(), cargarRegistro(`${hoy.slice(0, 4)}-01-01`, hoy), cargarObjetivos()]);
    if (r.error) { setError(r.error); setDatos({ items: [], escuela: [] }); return; }
    setError(""); setDatos(r); setRegistro(reg); setObjetivos(objs);
  }, [hoy]);
  useEffect(() => { recargar(); }, [recargar]);

  // Tildar se ve al instante; si falla, vuelve atrás
  const onTildar = async (item, iso, hecho) => {
    const clave = `${item.id}|${claveRegistro(item, iso)}`;
    const cambiar = v => setRegistro(s => { const n = new Set(s); v ? n.add(clave) : n.delete(clave); return n; });
    cambiar(hecho);
    if (!(await tildar(item, iso, hecho))) cambiar(!hecho);
  };

  const ctx = { allCasos, historial, rutina: { items: datos?.items || [], registro }, hoy };
  const sinRutina = datos && !datos.items.length;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Rutina</h1>
        <div role="tablist" aria-label="Vista" style={{ display: "flex", maxWidth: "100%", overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8, scrollbarWidth: "none" }}>
          {VISTAS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={vista === k} onClick={() => setVista(k)}
              style={{ flex: "none", font: "inherit", fontSize: 13, padding: "6px 12px", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontWeight: vista === k ? 600 : 500, background: vista === k ? "var(--text)" : "var(--card)", color: vista === k ? "var(--bg)" : "var(--sub)" }}>{l}</button>
          ))}
        </div>
      </header>

      {error && <div role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>No se pudo cargar la rutina: {error}</div>}
      {!datos && <div style={{ fontSize: 14, color: "var(--muted)" }}>Cargando…</div>}

      {sinRutina && vista !== "editar" && vista !== "objetivos" && (
        <div style={{ background: "var(--card)", border: "1px dashed var(--border2)", borderRadius: 14, padding: "24px 18px", display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Todavía no armaste tu rutina</div>
          <div style={{ fontSize: 14, color: "var(--sub)", lineHeight: 1.5, maxWidth: 560 }}>
            Podés arrancar con una de ejemplo (arranque, siniestros con compañías, expedientes, prospección y cierre, más lo semanal y lo mensual) y después cambiarla a tu gusto.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Boton variante="primario" onClick={async () => { if (await cargarEjemplo()) recargar(); }}>Cargar la rutina de ejemplo</Boton>
            <Boton onClick={() => setVista("editar")}>Armarla desde cero</Boton>
          </div>
        </div>
      )}

      {datos && !sinRutina && vista === "hoy" && <RutinaHoy items={datos.items} escuela={datos.escuela} registro={registro} onTildar={onTildar} onIr={onIrA} allCasos={allCasos} hoy={hoy} />}
      {datos && !sinRutina && (vista === "semana" || vista === "mes") && <RutinaPeriodo tipo={vista} items={datos.items} registro={registro} onTildar={onTildar} onIr={onIrA} hoy={hoy} />}
      {datos && vista === "objetivos" && <Objetivos objetivos={objetivos} ctx={ctx} onCambio={recargar} />}
      {datos && vista === "editar" && <EditorRutina items={datos.items} escuela={datos.escuela} onCambio={recargar} />}
    </div>
  );
}
