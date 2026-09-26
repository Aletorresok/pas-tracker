import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";
import { cambiosDeEstado } from "../utils/analisis.js";
import { todasLasOfertas, todasLasCompanias, cargarComisiones } from "../utils/ofertas.js";
import { ESTADOS_CASO } from "../constants.js";
import { fmtMoney } from "../utils/formatters.js";
import { aplanarCasos, kpis as calcularKpis, cobrosPendientes } from "../utils/metricas.js";
import CobrosPendientesCard from "./dashboard/CobrosPendientesCard.jsx";
import CasoOverlay from "./caso/CasoOverlay.jsx";
import AnalisisCompanias from "./analisis/AnalisisCompanias.jsx";
import AnalisisPas from "./analisis/AnalisisPas.jsx";
import AnalisisEtapas from "./analisis/AnalisisEtapas.jsx";
import AnalisisCaja from "./analisis/AnalisisCaja.jsx";
import CasosPorEtapa from "./analisis/CasosPorEtapa.jsx";

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 };

const VISTAS = [
  { k: "resumen", l: "Resumen" },
  { k: "companias", l: "Compañías" },
  { k: "pas", l: "PAS" },
  { k: "etapas", l: "Etapas" },
  { k: "caja", l: "Flujo de caja" },
];

const leerVista = () => {
  try { const v = localStorage.getItem("pas_analisis_vista"); return VISTAS.some(x => x.k === v) ? v : "resumen"; } catch { return "resumen"; }
};

// Métricas de fondo para decidir: lo que no hace falta mirar todos los días
export default function TabAnalisis({ pas, casos, darkMode, pasManuales = [], onCasoLocal, onIrA }) {
  const todosLosPas = useMemo(() => [...pas, ...pasManuales], [pas, pasManuales]);
  const allCasos = useMemo(() => aplanarCasos(casos, todosLosPas), [casos, todosLosPas]);
  const k = useMemo(() => calcularKpis(allCasos), [allCasos]);
  const cobros = useMemo(() => cobrosPendientes(allCasos), [allCasos]);
  const [vista, setVista] = useState(leerVista);
  const [abierto, setAbierto] = useState(null);
  // Cambios de estado registrados en la bitácora ("Pasó de X a Y"), para los tiempos exactos de Etapas
  const [cambios, setCambios] = useState({});
  // Historial de ofertas (SQL 21) para "Suba 1ª → última" en Compañías; sin la tabla, se usan los campos del caso
  const [ofertas, setOfertas] = useState({});
  useEffect(() => { todasLasOfertas().then(o => setOfertas(o || {})); }, [casos]);
  // Directorio de compañías (SQL 21; % de honorarios con el SQL 23). null = falta el SQL.
  const [companias, setCompanias] = useState({});
  const cargarCompanias = () => todasLasCompanias().then(setCompanias);
  useEffect(() => { cargarCompanias(); }, []);
  const [comisiones, setComisiones] = useState(null); // % de comisión por PAS (SQL 24)
  useEffect(() => { cargarComisiones().then(setComisiones); }, []);
  useEffect(() => {
    let vigente = true;
    (async () => {
      const filas = [];
      for (let desde = 0; ; desde += 1000) {
        const { data, error } = await supabase.from("acciones").select("id, caso_id, fecha, descripcion")
          .like("descripcion", "Pasó de %").order("id").range(desde, desde + 999);
        if (error || !data) break;
        filas.push(...data);
        if (data.length < 1000) break;
      }
      if (vigente) setCambios(cambiosDeEstado(filas, ESTADOS_CASO));
    })();
    return () => { vigente = false; };
  }, [casos]);

  const elegir = v => {
    setVista(v);
    try { localStorage.setItem("pas_analisis_vista", v); } catch { /* sin almacenamiento: no pasa nada */ }
  };
  const abrirCaso = c => setAbierto({ caso: c, pasId: c._pasId });

  const chip = ({ k: key, l }) => {
    const activo = vista === key;
    return (
      <button key={key} type="button" onClick={() => elegir(key)} aria-pressed={activo}
        style={{ flex: "none", whiteSpace: "nowrap", padding: "6px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer", fontWeight: activo ? 600 : 500,
          border: `1px solid ${activo ? "var(--text)" : "var(--border)"}`, background: activo ? "var(--text)" : "var(--card)", color: activo ? "var(--bg)" : "var(--sub)" }}>
        {l}
      </button>
    );
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Análisis</h1>
      <div role="group" aria-label="Elegir estadística" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, marginTop: -4 }}>
        {VISTAS.map(chip)}
      </div>

      {vista === "resumen" && (
        <>
          <section className="kpis" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              { l: "Mis honorarios cobrados · histórico", v: fmtMoney(k.totalHistorico), s: "neto, ya descontada la comisión" },
              { l: "Comisiones pagadas a PAS", v: fmtMoney(k.comisionesPAS), s: "de los casos con honorarios cobrados" },
              { l: "Casos totales", v: k.total },
            ].map(x => (
              <div key={x.l} style={{ padding: "12px 16px" }}>
                <div style={{ fontSize: 12, color: "var(--sub)" }}>{x.l}</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{x.v}</div>
                {x.s && <div style={{ fontSize: 12, color: "var(--muted)" }}>{x.s}</div>}
              </div>
            ))}
          </section>

          <CasosPorEtapa allCasos={allCasos} onVerCasos={onIrA ? () => onIrA("casos") : undefined} />

          <CobrosPendientesCard cobrosPendientes={cobros} darkMode={darkMode} />
        </>
      )}
      {vista === "companias" && <AnalisisCompanias allCasos={allCasos} ofertas={ofertas} onAbrirCaso={abrirCaso} cambios={cambios} directorio={companias} onCompaniasGuardadas={cargarCompanias} />}
      {vista === "pas" && <AnalisisPas allCasos={allCasos} />}
      {vista === "etapas" && <AnalisisEtapas allCasos={allCasos} onAbrirCaso={abrirCaso} cambios={cambios} />}
      {vista === "caja" && <AnalisisCaja allCasos={allCasos} onAbrirCaso={abrirCaso} companias={companias} comisiones={comisiones} />}

      {abierto && (
        <CasoOverlay
          caso={abierto.caso} pasId={abierto.pasId} casos={casos} todosLosPas={todosLosPas}
          onCasoLocal={onCasoLocal} darkMode={darkMode}
          onCambio={updated => setAbierto(a => ({ ...a, caso: { ...updated, _pasId: a.pasId } }))}
          onClose={() => setAbierto(null)}
        />
      )}
    </div>
  );
}
