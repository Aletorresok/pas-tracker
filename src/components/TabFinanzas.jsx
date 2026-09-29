import { useCallback, useEffect, useMemo, useState } from "react";
import { aplanarCasos } from "../utils/metricas.js";
import { cargarGastos } from "../utils/finanzas.js";
import { todasLasCompanias, cargarComisiones } from "../utils/ofertas.js";
import { alpha } from "../utils/theme.js";
import { fechaLocalISO } from "../utils/formatters.js";
import ResumenMes, { nombreMes } from "./finanzas/ResumenMes.jsx";
import Gastos from "./finanzas/Gastos.jsx";
import Facturacion from "./finanzas/Facturacion.jsx";
import Rentabilidad from "./finanzas/Rentabilidad.jsx";
import AnalisisCaja from "./analisis/AnalisisCaja.jsx";
import CasoOverlay from "./caso/CasoOverlay.jsx";
import Toast from "./caso/Toast.jsx";
import Icono from "./ui/Icono.jsx";

const VISTAS = [
  { k: "mes", l: "Mes" },
  { k: "facturacion", l: "Facturación" },
  { k: "caja", l: "Flujo de caja" },
  { k: "rentabilidad", l: "Rentabilidad" },
];

const moverMes = (mes, n) => { const d = new Date(`${mes}-15T12:00:00`); d.setMonth(d.getMonth() + n); return fechaLocalISO(d).slice(0, 7); };

// Finanzas del estudio: resultado del mes, gastos, facturación de honorarios y flujo de caja
export default function TabFinanzas({ pas, casos, pasManuales = [], darkMode, onCasoLocal }) {
  const todosLosPas = useMemo(() => [...pas, ...pasManuales], [pas, pasManuales]);
  const allCasos = useMemo(() => aplanarCasos(casos, todosLosPas), [casos, todosLosPas]);
  const [vista, setVista] = useState("mes");
  const hoyMes = fechaLocalISO().slice(0, 7);
  const [mes, setMes] = useState(hoyMes);
  const [gastos, setGastos] = useState(null); // null = cargando
  const [faltaSql, setFaltaSql] = useState(false);
  const [toast, setToast] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [companias, setCompanias] = useState({});
  const [comisiones, setComisiones] = useState(null);

  const recargar = useCallback(() => cargarGastos().then(g => { setFaltaSql(g === null); setGastos(g || []); }), []);
  useEffect(() => { recargar(); }, [recargar]);
  useEffect(() => { todasLasCompanias().then(setCompanias); cargarComisiones().then(setComisiones); }, []);

  const conNumero = allCasos.some(c => "nro_factura" in c);
  const abrirCaso = (c, pestana) => setAbierto({ caso: c, pasId: c._pasId, pestana });

  const chip = v => {
    const activo = vista === v.k;
    return (
      <button key={v.k} type="button" onClick={() => setVista(v.k)} aria-pressed={activo}
>
        {v.l}
      </button>
    );
  };
  const flecha = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer", color: "var(--text)" };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Finanzas</h1>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Lo que entra, lo que sale y lo que falta facturar o cobrar</div>
      </header>
      {faltaSql && (
        <div role="alert" style={{ padding: "10px 14px", borderRadius: "var(--r-sm)", background: alpha("var(--warn)", 12), color: "var(--warn)", fontSize: 14 }}>
          Para cargar gastos falta correr el SQL 28 (<code>sql/2026-09-28_28_finanzas.sql</code>) en Supabase. Facturación y flujo de caja ya funcionan.
        </div>
      )}
      <div role="group" aria-label="Elegir vista" className="segmentado" style={{ alignSelf: "flex-start", maxWidth: "100%", overflowX: "auto" }}>{VISTAS.map(chip)}</div>

      {vista === "mes" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" aria-label="Mes anterior" onClick={() => setMes(m => moverMes(m, -1))} style={flecha}><Icono nombre="chevron" size={16} style={{ transform: "rotate(90deg)" }} /></button>
            <span style={{ fontSize: 16, fontWeight: 700, minWidth: 150, textAlign: "center" }}>{nombreMes(mes)}</span>
            <button type="button" aria-label="Mes siguiente" onClick={() => setMes(m => moverMes(m, 1))} disabled={mes >= hoyMes} style={{ ...flecha, opacity: mes >= hoyMes ? 0.4 : 1 }}><Icono nombre="chevron" size={16} style={{ transform: "rotate(-90deg)" }} /></button>
            {mes !== hoyMes && <button type="button" onClick={() => setMes(hoyMes)} style={{ background: "none", border: "none", font: "inherit", fontSize: 13, fontWeight: 600, color: "var(--accent-ink)", cursor: "pointer" }}>Este mes</button>}
          </div>
          <ResumenMes allCasos={allCasos} gastos={gastos || []} mes={mes} />
          {!faltaSql && gastos && <Gastos gastos={gastos} mes={mes} allCasos={allCasos} onCambio={recargar} setToast={setToast} />}
        </>
      )}
      {vista === "facturacion" && <Facturacion allCasos={allCasos} gastos={gastos || []} conNumero={conNumero} onCasoLocal={onCasoLocal} onAbrirCaso={abrirCaso} setToast={setToast} />}
      {vista === "rentabilidad" && <Rentabilidad allCasos={allCasos} gastos={gastos || []} onAbrirCaso={abrirCaso} />}
      {vista === "caja" && <AnalisisCaja allCasos={allCasos} onAbrirCaso={c => abrirCaso(c)} companias={companias} comisiones={comisiones} />}

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
