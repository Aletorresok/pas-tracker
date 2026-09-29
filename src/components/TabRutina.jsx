import { useCallback, useMemo, useState } from "react";
import { aplanarCasos } from "../utils/metricas.js";
import { tocaHoy, escuelaDelDia } from "../utils/rutina.js";
import { useRutina } from "../hooks/useRutina.js";
import { alpha } from "../utils/theme.js";
import ChecklistRutina from "./rutina/ChecklistRutina.jsx";
import ListasAutomaticas from "./rutina/ListasAutomaticas.jsx";
import ObjetivosPanel from "./rutina/ObjetivosPanel.jsx";
import EditorRutina from "./rutina/EditorRutina.jsx";
import CasoOverlay from "./caso/CasoOverlay.jsx";
import Toast from "./caso/Toast.jsx";

const VISTAS = [
  { k: "diaria", l: "Día" },
  { k: "semanal", l: "Semana" },
  { k: "mensual", l: "Mes" },
  { k: "objetivos", l: "Objetivos" },
  { k: "editar", l: "Editar rutina" },
];

// Rutina (etapa 6 de ATG Lex): checklist del día, la semana y el mes; listas automáticas; objetivos con anillos.
export default function TabRutina({ pas, casos, pasManuales = [], historial, darkMode, onCasoLocal, onIrA, onAbrirExpediente }) {
  const todosLosPas = useMemo(() => [...pas, ...pasManuales], [pas, pasManuales]);
  const allCasos = useMemo(() => aplanarCasos(casos, todosLosPas), [casos, todosLosPas]);
  const { datos, falta, recargar, hecho, tildar } = useRutina();
  const [vista, setVista] = useState("diaria");
  const [toast, setToast] = useState(null);
  const [abierto, setAbierto] = useState(null);

  const onTildar = useCallback(async (item, valor) => {
    if (!(await tildar(item, valor))) setToast({ msg: "No se pudo guardar. Revisá la conexión.", type: "error" });
  }, [tildar]);
  const abrirCaso = useCallback(c => setAbierto({ caso: c, pasId: c._pasId }), []);

  if (!datos) return <div style={{ padding: 24, color: "var(--muted)", fontSize: 14 }}>Cargando la rutina…</div>;

  const items = datos.items;
  const deHoy = frecuencia => items.filter(it => it.frecuencia === frecuencia && tocaHoy(it));
  const escuela = escuelaDelDia(datos.escuela);
  const datosObjetivos = { allCasos, historial, rutina: { items, registro: datos.registro } };
  const sinRutina = !items.length && vista !== "editar" && vista !== "objetivos";

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Rutina</h1>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Lo de todos los días, la semana y el mes, y tus objetivos</div>
      </header>

      {falta && (
        <div role="alert" style={{ padding: "10px 14px", borderRadius: "var(--r-sm)", background: alpha("var(--bad)", 10), color: "var(--bad)", fontSize: 14 }}>
          No se pudo cargar la rutina. ¿Está corrido el SQL 25?
        </div>
      )}

      <div role="tablist" aria-label="Vistas de la rutina" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {VISTAS.map(v => {
          const activa = vista === v.k;
          return (
            <button key={v.k} type="button" role="tab" aria-selected={activa} onClick={() => setVista(v.k)}
              style={{ flex: "none", whiteSpace: "nowrap", padding: "6px 14px", borderRadius: "var(--r-xl)", fontSize: 13, cursor: "pointer", font: "inherit",
                border: `1px solid ${activa ? "var(--text)" : "var(--border)"}`, background: "var(--card)", color: activa ? "var(--text)" : "var(--sub)", fontWeight: activa ? 600 : 500 }}>
              {v.l}
            </button>
          );
        })}
      </div>

      {sinRutina && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--r-md)", border: "1px dashed var(--border2)", fontSize: 14, color: "var(--sub)" }}>
          Todavía no cargaste tu rutina. <button type="button" onClick={() => setVista("editar")} style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--accent-ink)", fontWeight: 600, cursor: "pointer" }}>Cargarla →</button>
        </div>
      )}

      {vista === "diaria" && (
        <div className="dash-cols" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
          <ChecklistRutina frecuencia="diaria" items={deHoy("diaria")} escuela={escuela} hecho={hecho} onTildar={onTildar} onIrA={onIrA} />
          <ListasAutomaticas allCasos={allCasos} onAbrirCaso={abrirCaso} onAbrirExpediente={onAbrirExpediente} />
        </div>
      )}
      {(vista === "semanal" || vista === "mensual") && (
        <ChecklistRutina frecuencia={vista} items={deHoy(vista)} hecho={hecho} onTildar={onTildar} onIrA={onIrA} />
      )}
      {vista === "objetivos" && <ObjetivosPanel objetivos={datos.objetivos} datos={datosObjetivos} onCambio={recargar} setToast={setToast} />}
      {vista === "editar" && <EditorRutina items={items} escuela={datos.escuela} onCambio={recargar} setToast={setToast} />}

      {abierto && (
        <CasoOverlay
          caso={abierto.caso} pasId={abierto.pasId} casos={casos} todosLosPas={todosLosPas}
          onCasoLocal={onCasoLocal} darkMode={darkMode}
          onCambio={updated => setAbierto(a => ({ ...a, caso: { ...updated, _pasId: a.pasId } }))}
          onClose={() => setAbierto(null)}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
