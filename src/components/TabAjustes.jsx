import { lazy, Suspense, useMemo, useState } from "react";
import { aplanarCasos } from "../utils/metricas.js";
import { useRutina } from "../hooks/useRutina.js";
import ObjetivosPanel from "./rutina/ObjetivosPanel.jsx";
import EditorRutina from "./rutina/EditorRutina.jsx";
import Toast from "./caso/Toast.jsx";

const MisDatos = lazy(() => import("./herramientas/MisDatos.jsx"));
const Modelos = lazy(() => import("./herramientas/Modelos.jsx"));
const CalendarioCelular = lazy(() => import("./herramientas/CalendarioCelular.jsx"));

export const VISTAS_AJUSTES = [
  { k: "rutina", l: "Rutina", d: "Lo de todos los días, la semana y el mes. Lo del día se ve y se tilda en Hoy → Mi día." },
  { k: "objetivos", l: "Objetivos", d: "Metas del mes, el trimestre o el año; el del año se ve en Hoy." },
  { k: "misdatos", l: "Mis datos", d: "Nombre, matrículas, CUIT y domicilio constituido que salen en los escritos." },
  { k: "modelos", l: "Modelos de escritos", d: "Los textos que usa \"Generar escrito\", con los datos del caso." },
  { k: "calendario", l: "Calendario en el celular", d: "Mediaciones, audiencias y plazos en tu Google Calendar." },
];

// Ajustes: lo que se configura una vez (rutina, objetivos, datos del estudio, modelos, calendario).
// Apariencia y backup sigue en su menú, abajo del todo.
export default function TabAjustes({ pas = [], casos = {}, pasManuales = [], historial, vistaInicial }) {
  const todosLosPas = useMemo(() => [...pas, ...pasManuales], [pas, pasManuales]);
  const allCasos = useMemo(() => aplanarCasos(casos, todosLosPas), [casos, todosLosPas]);
  const [vista, setVista] = useState(VISTAS_AJUSTES.some(v => v.k === vistaInicial) ? vistaInicial : "rutina");
  const { datos, falta, cambio } = useRutina();
  const [toast, setToast] = useState(null);
  const v = VISTAS_AJUSTES.find(x => x.k === vista);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Ajustes</h1>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Lo que se configura una vez</div>
      </header>
      <div role="group" aria-label="Elegir ajuste" className="segmentado" style={{ alignSelf: "flex-start", maxWidth: "100%", overflowX: "auto" }}>
        {VISTAS_AJUSTES.map(x => <button key={x.k} type="button" aria-pressed={vista === x.k} onClick={() => setVista(x.k)}>{x.l}</button>)}
      </div>
      <div style={{ fontSize: 13, color: "var(--sub)" }}>{v.d}</div>

      {(vista === "rutina" || vista === "objetivos") && falta && (
        <div role="alert" style={{ padding: "10px 14px", borderRadius: "var(--r-sm)", color: "var(--bad)", fontSize: 14 }}>No se pudo cargar la rutina. ¿Está corrido el SQL 25?</div>
      )}
      {vista === "rutina" && datos && <EditorRutina items={datos.items} escuela={datos.escuela} onCambio={cambio} setToast={setToast} />}
      {vista === "objetivos" && datos && (
        <ObjetivosPanel objetivos={datos.objetivos} datos={{ allCasos, historial, rutina: { items: datos.items, registro: datos.registro } }} onCambio={cambio} setToast={setToast} />
      )}
      <Suspense fallback={<div style={{ fontSize: 14, color: "var(--muted)" }}>Cargando…</div>}>
        {vista === "misdatos" && <MisDatos allCasos={allCasos} />}
        {vista === "modelos" && <Modelos allCasos={allCasos} />}
        {vista === "calendario" && <CalendarioCelular allCasos={allCasos} />}
      </Suspense>
      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
