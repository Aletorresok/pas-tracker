import { useEffect, useMemo, useState } from "react";
import { aplanarCasos, tareasPendientes, cobrosPendientes, netoYo } from "../utils/metricas.js";
import { fechaLocalISO } from "../utils/formatters.js";
import CobrosResumen from "./dashboard/CobrosResumen.jsx";
import ParaHacer, { agruparPorCaso } from "./dashboard/ParaHacer.jsx";
import NuevosPortal from "./dashboard/NuevosPortal.jsx";
import ConsultasWeb from "./dashboard/ConsultasWeb.jsx";
import AgendaHoy from "./dashboard/AgendaHoy.jsx";
import RecepcionHoy from "./dashboard/RecepcionHoy.jsx";
import MiDia from "./dashboard/MiDia.jsx";
import ResumenHoy from "./dashboard/ResumenHoy.jsx";
import { cargarExpedientes, cargarPlazosPendientes, fechaClave, expedienteAbierto } from "../utils/expedientes.js";
import { useCalendarioJudicial } from "../hooks/useCalendarioJudicial.js";
import CasoOverlay from "./caso/CasoOverlay.jsx";
import Toast from "./caso/Toast.jsx";
import { registrarReiteracion, completarAccion, posponerAccion } from "../utils/storage.js";
import { useMargenes } from "../utils/margenes.js";
import { contarParaRutina, contactosDeHoy } from "../utils/medidasRutina.js";

// Hoy: lo que entró (documentación del cliente, casos del portal), lo que hay que hacer, la plata que falta entrar,
// la agenda y, abajo, Mi día (rutina + prospección). Los números del estudio están en Finanzas y Análisis.
export default function TabDashboard({ pas, casos, derivadores, descartados = {}, historial, darkMode, pasManuales = [], onCasoLocal, onIrA, onAbrirExpediente }) {
  const todosLosPas = useMemo(() => [...pas, ...pasManuales], [pas, pasManuales]);
  const allCasos = useMemo(() => aplanarCasos(casos, todosLosPas), [casos, todosLosPas]);
  const margenes = useMargenes();
  const cal = useCalendarioJudicial();
  const [toast, setToast] = useState(null);

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

  // Tareas de casos + plazos y escritos, por vencimiento (Para hacer las agrupa por caso)
  const tareasCasos = useMemo(() => tareasPendientes({ allCasos, margenes: margenes || {} }), [allCasos, margenes]);
  const tareas = useMemo(() => [...tareasCasos, ...tareasPlazos]
    .sort((a, b) => (a.vence || "9999-12-31").localeCompare(b.vence || "9999-12-31")), [tareasCasos, tareasPlazos]);
  const cobros = useMemo(() => cobrosPendientes(allCasos), [allCasos]);
  const conteo = useMemo(() => contarParaRutina({ contactos: contactosDeHoy(historial), tareas: tareasCasos, allCasos }), [historial, tareasCasos, allCasos]);
  const nuevos = useMemo(() => allCasos
    .filter(c => c.origen === "portal" && !c.revisado_en)
    .sort((a, b) => String(b.created_at || b.fecha_derivacion || "").localeCompare(String(a.created_at || a.fecha_derivacion || ""))), [allCasos]);

  const [abierto, setAbierto] = useState(null); // { caso, pasId }
  const [foco, setFoco] = useState(null); // null | "atras" | "hoy": filtra Para hacer desde los números de arriba
  const hoyISO = fechaLocalISO();
  const grupos = useMemo(() => agruparPorCaso(tareas), [tareas]);
  const atrasadas = grupos.filter(g => g.vence && g.vence < hoyISO).length;
  const paraHoy = grupos.filter(g => g.vence === hoyISO).length;
  const totalNeto = useMemo(() => cobros.reduce((a, c) => a + (c.faltaHonorarios ? netoYo(c) : 0), 0), [cobros]);
  const irA = id => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const fechaHoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const hoy = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

  const abrirTarea = (t) => {
    if (t.expediente) onAbrirExpediente?.(t.expediente.id);
    else if (t.caso) setAbierto({ caso: t.caso, pasId: t.caso._pasId });
  };

  // Acciones rápidas de Para hacer: guardan, actualizan el caso en pantalla y devuelven true si salió bien
  const aplicar = (c, cambios, ok) => {
    if (!cambios) { setToast({ msg: "No se pudo guardar. Revisá la conexión.", type: "error" }); return false; }
    const { _pasId, _pasNombre, ...limpio } = c;
    onCasoLocal(_pasId, { ...limpio, ...cambios });
    setToast({ msg: ok, type: "success" });
    return true;
  };
  const alHecho = async (c, nueva) => aplicar(c, await completarAccion(c, nueva), nueva.nueva?.trim() ? "Listo. Próxima acción cargada" : "Listo");
  const alPosponer = async (c, vence) => aplicar(c, await posponerAccion(c, vence), "Pospuesta");
  const alReiterar = async c => aplicar(c, await registrarReiteracion(c), "Reiteración registrada");

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Hoy</h1>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{hoy}</span>
      </header>

      <ResumenHoy atrasadas={atrasadas} hoy={paraHoy} nuevos={nuevos.length} cobrar={totalNeto} foco={foco} onFoco={setFoco} onIrA={irA} />

      <RecepcionHoy allCasos={allCasos} onAbrir={c => setAbierto({ caso: c, pasId: c._pasId, pestana: "documentos" })} />

      <div id="hoy-nuevos"><NuevosPortal casos={nuevos} onCasoLocal={onCasoLocal} onAbrir={c => setAbierto({ caso: c, pasId: c._pasId })} /></div>
      <ConsultasWeb todosLosPas={todosLosPas} onCasoLocal={onCasoLocal} onAbrir={(c, pasId) => setAbierto({ caso: c, pasId })} />

      {/* Lo que hay que hacer y, al lado, la plata que falta entrar y la agenda */}
      <div className="dash-cols" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        <ParaHacer tareas={tareas} cal={cal} foco={foco} onQuitarFoco={() => setFoco(null)} onAbrir={abrirTarea} onHecho={alHecho} onPosponer={alPosponer} onReiterar={alReiterar} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div id="hoy-cobros"><CobrosResumen cobros={cobros} onAbrir={c => setAbierto({ caso: c, pasId: c._pasId })} onVerTodos={() => onIrA?.("analisis")} /></div>
          <AgendaHoy allCasos={allCasos} onAbrir={c => setAbierto({ caso: c, pasId: c._pasId })} />
        </div>
      </div>

      <MiDia conteo={conteo} allCasos={allCasos} historial={historial} derivadores={derivadores} descartados={descartados} onIrA={onIrA} />

      {abierto && (
        <CasoOverlay
          caso={abierto.caso} pasId={abierto.pasId} pestanaInicial={abierto.pestana} casos={casos} todosLosPas={todosLosPas}
          onCasoLocal={onCasoLocal} darkMode={darkMode}
          onCambio={updated => setAbierto(a => ({ ...a, caso: { ...updated, _pasId: a.pasId } }))}
          onClose={() => setAbierto(null)}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
