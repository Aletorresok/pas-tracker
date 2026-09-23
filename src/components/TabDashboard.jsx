import { useMemo, useState } from "react";
import { fmtMoney, fmtDate } from "../utils/formatters.js";
import { aplanarCasos, kpis as calcularKpis, honorariosPorMes, tareasPendientes, casosPorTramo, cobrosPendientes, netoYo } from "../utils/metricas.js";
import CobrosResumen from "./dashboard/CobrosResumen.jsx";
import GraficoBarraMensual from "./dashboard/GraficoBarraMensual.jsx";
import ParaHacer from "./dashboard/ParaHacer.jsx";
import NuevosPortal from "./dashboard/NuevosPortal.jsx";
import AgendaHoy from "./dashboard/AgendaHoy.jsx";
import RecepcionHoy from "./dashboard/RecepcionHoy.jsx";
import CasoOverlay from "./caso/CasoOverlay.jsx";
import { registrarReiteracion } from "../utils/storage.js";
import { pasDormidos } from "../utils/estadisticasPas.js";
import { useMargenes } from "../utils/margenes.js";

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

// Tonos del acento en orden de avance: de suave (arranque) a pleno (cobrado)
const TONOS = [45, 60, 74, 87, 100];

export default function TabDashboard({ pas, casos, derivadores, darkMode, pasManuales = [], onCasoLocal, onIrA, onAbrirCliente }) {
  const todosLosPas = useMemo(() => [...pas, ...pasManuales], [pas, pasManuales]);
  const allCasos = useMemo(() => aplanarCasos(casos, todosLosPas), [casos, todosLosPas]);
  const k = useMemo(() => calcularKpis(allCasos), [allCasos]);
  const porMes = useMemo(() => honorariosPorMes(allCasos), [allCasos]);
  const margenes = useMargenes();
  // Tareas de los casos + PAS clientes que dejaron de derivar
  const tareas = useMemo(() => {
    const manualesIds = new Set(pasManuales.map(p => String(p.id)));
    const clientes = [...pas.filter(p => derivadores[String(p.id)] && !manualesIds.has(String(p.id))), ...pasManuales];
    return [...tareasPendientes({ allCasos, margenes: margenes || {} }), ...pasDormidos(clientes, casos)]
      .sort((a, b) => (a.vence || "9999-12-31").localeCompare(b.vence || "9999-12-31"));
  }, [allCasos, pas, pasManuales, derivadores, casos, margenes]);
  const cobros = useMemo(() => cobrosPendientes(allCasos), [allCasos]);
  const { tramos, desistidos } = useMemo(() => casosPorTramo(allCasos), [allCasos]);
  const nDerivadores = Object.values(derivadores).filter(Boolean).length;
  const nuevos = useMemo(() => allCasos
    .filter(c => c.origen === "portal" && !c.revisado_en)
    .sort((a, b) => String(b.created_at || b.fecha_derivacion || "").localeCompare(String(a.created_at || a.fecha_derivacion || ""))), [allCasos]);

  const [mesSeleccionado, setMesSeleccionado] = useState(null);
  const [abierto, setAbierto] = useState(null); // { caso, pasId }

  const casosDelMes = useMemo(() => !mesSeleccionado ? [] : allCasos.filter(c =>
    c.estado === "cobrado" && c.monto_cobro_yo && String(c.fecha_cobro_honorarios || "").startsWith(mesSeleccionado)
  ), [allCasos, mesSeleccionado]);

  const fechaHoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const hoy = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);
  const totalTramos = tramos.reduce((s, t) => s + t.count, 0);

  const abrirTarea = (t) => {
    if (t.caso) setAbierto({ caso: t.caso, pasId: t.caso._pasId });
    else if (t.pas) onAbrirCliente?.(t.pas);
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Hoy</h1>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{hoy}</span>
      </header>

      <RecepcionHoy allCasos={allCasos} onAbrir={c => setAbierto({ caso: c, pasId: c._pasId, pestana: "documentos" })} />

      <NuevosPortal casos={nuevos} onCasoLocal={onCasoLocal} onAbrir={c => setAbierto({ caso: c, pasId: c._pasId })} />

      {/* KPIs */}
      <section className="kpis" style={{ ...card, display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr" }}>
        <Kpi destacado label={`Mis honorarios cobrados · ${k.anio}`} valor={fmtMoney(k.cobradoAnio)} pie={<Variacion valor={k.varAnual} contra={k.anio - 1} />} />
        <Kpi label="Por cobrar" valor={fmtMoney(k.porCobrar)} pie={<span style={{ fontSize: 12, color: "var(--muted)" }}>{k.porCobrarCasos} {k.porCobrarCasos === 1 ? "caso" : "casos"}</span>} />
        <Kpi label="En gestión" valor={k.enGestion} pie={<span style={{ fontSize: 12, color: "var(--muted)" }}>de {k.total} casos · {nDerivadores} derivadores</span>} />
        <Kpi label="Este mes" valor={fmtMoney(k.esteMes)} pie={<Variacion valor={k.varMensual} contra={k.mesAnteriorNombre.toLowerCase()} />} />
      </section>

      <div className="dash-cols" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <ParaHacer tareas={tareas} onAbrir={abrirTarea} onReiterar={async c => {
            const cambios = await registrarReiteracion(c);
            if (cambios) { const { _pasId, _pasNombre, ...limpio } = c; onCasoLocal(_pasId, { ...limpio, ...cambios }); }
          }} />
          <CobrosResumen cobros={cobros} onAbrir={c => setAbierto({ caso: c, pasId: c._pasId })} onVerTodos={() => onIrA?.("analisis")} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <AgendaHoy allCasos={allCasos} onAbrir={c => setAbierto({ caso: c, pasId: c._pasId })} />

          {/* Casos por etapa */}
          <section style={{ ...card, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Casos por etapa</h2>
              <button type="button" onClick={() => onIrA?.("casos")} style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}>Ver casos →</button>
            </div>
            {totalTramos > 0 && (
              <div style={{ display: "flex", height: 12, borderRadius: 4, overflow: "hidden", gap: 2, marginBottom: 12 }} aria-hidden="true">
                {tramos.filter(t => t.count > 0).map(t => (
                  <div key={t.key} title={`${t.label}: ${t.count}`}
                    style={{ flex: t.count, background: `color-mix(in srgb, var(--accent) ${TONOS[tramos.indexOf(t)]}%, var(--card))` }} />
                ))}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
              {tramos.map((t, i) => (
                <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, flex: "none", background: `color-mix(in srgb, var(--accent) ${TONOS[i]}%, var(--card))` }} />
                  <span style={{ color: "var(--sub)", flex: 1 }}>{t.label}</span>
                  <b className="num">{t.count}</b>
                </div>
              ))}
              {desistidos > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, flex: "none" }} />
                  <span style={{ color: "var(--muted)", flex: 1 }}>Desistidos</span>
                  <b className="num" style={{ color: "var(--muted)" }}>{desistidos}</b>
                </div>
              )}
            </div>
          </section>

          {/* Honorarios por mes */}
          <section style={{ ...card, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Honorarios por mes</h2>
              {mesSeleccionado
                ? <button type="button" onClick={() => setMesSeleccionado(null)} style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}>Cerrar detalle</button>
                : <span style={{ fontSize: 12, color: "var(--muted)" }}>últimos 12 · neto de comisión</span>}
            </div>
            <GraficoBarraMensual datos={porMes} mesSeleccionado={mesSeleccionado} onClickMes={setMesSeleccionado} />
            {mesSeleccionado && casosDelMes.length > 0 && (
              <div style={{ marginTop: 8, borderTop: "1px solid var(--border)" }}>
                {casosDelMes.map(c => (
                  <button key={c.id} type="button" onClick={() => setAbierto({ caso: c, pasId: c._pasId })}
                    style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", background: "none", border: "none", borderBottom: "1px solid var(--border)", textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit" }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.asegurado}</span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--sub)" }}>{c.compania_aseguradora || "—"} · {fmtDate(c.fecha_cobro_honorarios)}</span>
                    </span>
                    <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>{fmtMoney(netoYo(c))}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <button type="button" onClick={() => onIrA?.("analisis")}
        style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 14, cursor: "pointer", padding: 0 }}>
        Ranking de PAS, plazos por compañía y cobros en detalle → Análisis
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
