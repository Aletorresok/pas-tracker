import { useEffect, useMemo, useState } from "react";
import { fmtMoney } from "../utils/formatters.js";
import { aplanarCasos, kpis as calcularKpis, tareasPendientes, cobrosPendientes } from "../utils/metricas.js";
import CobrosResumen from "./dashboard/CobrosResumen.jsx";
import ParaHacer from "./dashboard/ParaHacer.jsx";
import NuevosPortal from "./dashboard/NuevosPortal.jsx";
import AgendaHoy from "./dashboard/AgendaHoy.jsx";
import RecepcionHoy from "./dashboard/RecepcionHoy.jsx";
import ProspeccionHoy from "./dashboard/ProspeccionHoy.jsx";
import AhoraToca from "./dashboard/AhoraToca.jsx";
import { cargarExpedientes, cargarPlazosPendientes, fechaClave, expedienteAbierto } from "../utils/expedientes.js";
import { useCalendarioJudicial } from "../hooks/useCalendarioJudicial.js";
import CasoOverlay from "./caso/CasoOverlay.jsx";
import { registrarReiteracion } from "../utils/storage.js";
import { useMargenes } from "../utils/margenes.js";
import { quienTiene } from "../utils/pelota.js";

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 };

function Variacion({ valor, contra }) {
  if (valor === null || valor === undefined) return <span style={{ fontSize: 12, color: "var(--muted)" }}>sin comparación</span>;
  const sube = valor >= 0;
  return (
    <span className="num" style={{ fontSize: 12, fontWeight: 600, color: sube ? "var(--ok)" : "var(--bad)" }}>
      {sube ? "▲" : "▼"} {Math.abs(valor)}% <span style={{ color: "var(--muted)", fontWeight: 400 }}>vs {contra}</span>
    </span>
  );
}

function Kpi({ label, valor, pie, destacado }) {
  return (
    <div style={{ padding: "12px 16px", minWidth: 0 }}>
      <div style={{ fontSize: 12, color: "var(--sub)" }}>{label}</div>
      <div className="num" style={{ fontSize: destacado ? "clamp(20px, 5vw, 26px)" : "clamp(18px, 4.6vw, 22px)", fontWeight: 700, letterSpacing: -0.5, color: destacado ? "var(--accent-ink)" : "var(--text)", marginTop: 2, overflowWrap: "anywhere" }}>{valor}</div>
      <div style={{ marginTop: 2 }}>{pie}</div>
    </div>
  );
}

export default function TabDashboard({ pas, casos, derivadores, historial, darkMode, pasManuales = [], onCasoLocal, onIrA, onAbrirExpediente }) {
  const todosLosPas = useMemo(() => [...pas, ...pasManuales], [pas, pasManuales]);
  const allCasos = useMemo(() => aplanarCasos(casos, todosLosPas), [casos, todosLosPas]);
  const k = useMemo(() => calcularKpis(allCasos), [allCasos]);
  const margenes = useMargenes();
  const cal = useCalendarioJudicial();

  // Plazos procesales y escritos pendientes (de expedientes y de casos PAS)
  const [pendientes, setPendientes] = useState({ plazos: [], expedientes: [] });
  useEffect(() => {
    let vivo = true;
    Promise.all([cargarPlazosPendientes(), cargarExpedientes()]).then(([plazos, expedientes]) => {
      if (vivo) setPendientes({ plazos: plazos || [], expedientes: expedientes || [] });
    });
    return () => { vivo = false; };
  }, []);
  const tareasPlazos = useMemo(() => {
    const exps = Object.fromEntries(pendientes.expedientes.map(e => [e.id, e]));
    const porCaso = Object.fromEntries(allCasos.map(c => [String(c.id), c]));
    return pendientes.plazos.flatMap(p => {
      const exp = p.expediente_id ? exps[p.expediente_id] : null;
      const caso = p.caso_id ? porCaso[String(p.caso_id)] : null;
      if (p.expediente_id && (!exp || !expedienteAbierto(exp))) return [];
      if (p.caso_id && !caso) return [];
      return [{ id: `plazo-${p.id}`, tipo: p.tipo, vence: fechaClave(p), plazo: p, jurisdiccion: exp?.jurisdiccion, expediente: exp, caso,
        titulo: exp ? exp.caratula : caso?.asegurado || "Sin nombre", detalle: p.titulo }];
    });
  }, [pendientes, allCasos]);

  // Tareas de casos (el ritmo de cada PAS se mira en Clientes) + plazos y escritos, por vencimiento
  const tareas = useMemo(() => [...tareasPendientes({ allCasos, margenes: margenes || {} }), ...tareasPlazos]
    .sort((a, b) => (a.vence || "9999-12-31").localeCompare(b.vence || "9999-12-31")), [allCasos, margenes, tareasPlazos]);
  const cobros = useMemo(() => cobrosPendientes(allCasos), [allCasos]);
  const teTocan = useMemo(() => allCasos.filter(c => quienTiene(c) === "vos").length, [allCasos]);
  const nDerivadores = Object.values(derivadores).filter(Boolean).length;
  const nuevos = useMemo(() => allCasos
    .filter(c => c.origen === "portal" && !c.revisado_en)
    .sort((a, b) => String(b.created_at || b.fecha_derivacion || "").localeCompare(String(a.created_at || a.fecha_derivacion || ""))), [allCasos]);

  const [abierto, setAbierto] = useState(null); // { caso, pasId }


  const fechaHoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const hoy = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

  const abrirTarea = (t) => {
    if (t.expediente) onAbrirExpediente?.(t.expediente.id);
    else if (t.caso) setAbierto({ caso: t.caso, pasId: t.caso._pasId });
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Hoy</h1>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{hoy}</span>
      </header>

      <AhoraToca allCasos={allCasos} historial={historial} onIrA={onIrA} />

      <RecepcionHoy allCasos={allCasos} onAbrir={c => setAbierto({ caso: c, pasId: c._pasId, pestana: "documentos" })} />

      <NuevosPortal casos={nuevos} onCasoLocal={onCasoLocal} onAbrir={c => setAbierto({ caso: c, pasId: c._pasId })} />

      {/* KPIs */}
      <section className="kpis" style={{ ...card, display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr" }}>
        <Kpi destacado label={`Mis honorarios cobrados · ${k.anio}`} valor={fmtMoney(k.cobradoAnio)} pie={<Variacion valor={k.varAnual} contra={k.anio - 1} />} />
        <Kpi label="Por cobrar" valor={fmtMoney(k.porCobrar)} pie={<span style={{ fontSize: 12, color: "var(--muted)" }}>{k.porCobrarCasos} {k.porCobrarCasos === 1 ? "caso" : "casos"}</span>} />
        <Kpi label="En gestión" valor={k.enGestion} pie={<span style={{ fontSize: 12, color: "var(--muted)" }}>de {k.total} casos · <button type="button" onClick={() => onIrA?.("casos")} title="En Casos, filtro Te toca a vos" style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--accent-ink)", fontWeight: 600, cursor: "pointer" }}>{teTocan} te {teTocan === 1 ? "toca" : "tocan"} a vos</button></span>} />
        <Kpi label="Este mes" valor={fmtMoney(k.esteMes)} pie={<Variacion valor={k.varMensual} contra={k.mesAnteriorNombre.toLowerCase()} />} />
      </section>

      {/* Dos columnas parejas: lo que hay que hacer y la plata que falta entrar */}
      <div className="dash-cols" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        <ParaHacer tareas={tareas} cal={cal} onAbrir={abrirTarea} onReiterar={async c => {
          const cambios = await registrarReiteracion(c);
          if (cambios) { const { _pasId, _pasNombre, ...limpio } = c; onCasoLocal(_pasId, { ...limpio, ...cambios }); }
        }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <CobrosResumen cobros={cobros} onAbrir={c => setAbierto({ caso: c, pasId: c._pasId })} onVerTodos={() => onIrA?.("analisis")} />
          <AgendaHoy allCasos={allCasos} onAbrir={c => setAbierto({ caso: c, pasId: c._pasId })} />
          <ProspeccionHoy historial={historial} onIr={() => onIrA?.("prospeccion")} />
        </div>
      </div>

      <button type="button" onClick={() => onIrA?.("analisis")}
        style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 14, cursor: "pointer", padding: 0 }}>
        Honorarios por mes, casos por etapa, compañías, PAS y flujo de caja → Análisis
      </button>

      {abierto && (
        <CasoOverlay
          caso={abierto.caso} pasId={abierto.pasId} pestanaInicial={abierto.pestana} casos={casos} todosLosPas={todosLosPas}
          onCasoLocal={onCasoLocal} darkMode={darkMode}
          onCambio={updated => setAbierto(a => ({ ...a, caso: { ...updated, _pasId: a.pasId } }))}
          onClose={() => setAbierto(null)}
        />
      )}
    </div>
  );
}
