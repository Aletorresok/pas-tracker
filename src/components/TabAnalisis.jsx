import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";
import { cambiosDeEstado } from "../utils/analisis.js";
import { todasLasOfertas, todasLasCompanias } from "../utils/ofertas.js";
import { ESTADOS_CASO } from "../constants.js";
import { fmtMoney } from "../utils/formatters.js";
import { aplanarCasos, kpis as calcularKpis, cobrosPendientes } from "../utils/metricas.js";
import CobrosPorCompania from "./analisis/CobrosPorCompania.jsx";
import CasoOverlay from "./caso/CasoOverlay.jsx";
import AnalisisCompanias from "./analisis/AnalisisCompanias.jsx";
import AnalisisPas from "./analisis/AnalisisPas.jsx";
import AnalisisEtapas from "./analisis/AnalisisEtapas.jsx";
import CasosPorEtapa from "./analisis/CasosPorEtapa.jsx";
import ObjetivosResumen from "./analisis/ObjetivosResumen.jsx";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
// "+12 % que 2025" / "−5 % que agosto"; sin base para comparar, null
const comparar = (v, contra) => (v === null || v === undefined ? null : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)} % que ${contra}`);

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)" };

const VISTAS = [
  { k: "resumen", l: "Resumen" },
  { k: "companias", l: "Compañías" },
  { k: "pas", l: "PAS" },
  { k: "etapas", l: "Etapas" },
];

const leerVista = () => {
  try { const v = localStorage.getItem("pas_analisis_vista"); return VISTAS.some(x => x.k === v) ? v : "resumen"; } catch { return "resumen"; }
};

// Métricas de fondo para decidir: lo que no hace falta mirar todos los días
export default function TabAnalisis({ pas, casos, historial, darkMode, pasManuales = [], onCasoLocal, onIrA, encabezado }) {
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
  // Se recarga cuando cambia una ficha de compañía (las condiciones se editan ahí)
  useEffect(() => {
    const cargar = () => todasLasCompanias().then(setCompanias);
    cargar();
    window.addEventListener("pas-companias-cambio", cargar);
    return () => window.removeEventListener("pas-companias-cambio", cargar);
  }, []);
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
>
        {l}
      </button>
    );
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {encabezado || <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Análisis</h1>}
      <div role="group" aria-label="Elegir estadística" className="segmentado" style={{ alignSelf: "flex-start", maxWidth: "100%", overflowX: "auto" }}>
        {VISTAS.map(chip)}
      </div>

      {vista === "resumen" && (
        <>
          {/* Los números del estudio (honorarios netos, ya descontada la comisión) */}
          <section className="kpis" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            {[
              { l: `Cobrado en ${k.anio}`, v: fmtMoney(k.cobradoAnio), s: comparar(k.varAnual, k.anio - 1), var: k.varAnual },
              { l: `Este mes · ${MESES[new Date().getMonth()]}`, v: fmtMoney(k.esteMes), s: comparar(k.varMensual, MESES[(new Date().getMonth() + 11) % 12]), var: k.varMensual },
              { l: "Por cobrar", v: fmtMoney(k.porCobrar), s: `${k.porCobrarCasos} ${k.porCobrarCasos === 1 ? "caso" : "casos"} con honorarios cargados` },
              { l: "Histórico cobrado", v: fmtMoney(k.totalHistorico), s: `${k.total} casos · ${k.enGestion} en gestión` },
              { l: "Comisiones pagadas a PAS", v: fmtMoney(k.comisionesPAS), s: "de los casos con honorarios cobrados" },
            ].map(x => (
              <div key={x.l} style={{ padding: "12px 16px", minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--sub)" }}>{x.l}</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{x.v}</div>
                {x.s && <div style={{ fontSize: 12, color: x.var > 0 ? "var(--ok)" : x.var < 0 ? "var(--warn)" : "var(--muted)" }}>{x.s}</div>}
              </div>
            ))}
          </section>

          <ObjetivosResumen allCasos={allCasos} historial={historial} onIrA={onIrA} />

          <CasosPorEtapa allCasos={allCasos} onVerCasos={onIrA ? () => onIrA("casos") : undefined} />

          <CobrosPorCompania cobros={cobros} />
        </>
      )}
      {vista === "companias" && <AnalisisCompanias allCasos={allCasos} ofertas={ofertas} onAbrirCaso={abrirCaso} cambios={cambios} directorio={companias} />}
      {vista === "pas" && <AnalisisPas allCasos={allCasos} />}
      {vista === "etapas" && <AnalisisEtapas allCasos={allCasos} onAbrirCaso={abrirCaso} cambios={cambios} />}

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
