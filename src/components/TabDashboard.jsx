import { useMemo, useState } from "react";
import { fmtMoney, fmtDate } from "../utils/formatters.js";
import GraficoCompanias from "./GraficoCompanias.jsx";
import StatCard from "./dashboard/StatCard.jsx";
import GraficoBarraMensual from "./dashboard/GraficoBarraMensual.jsx";
import MisPendientesCard from "./dashboard/MisPendientesCard.jsx";
import CobrosPendientesCard from "./dashboard/CobrosPendientesCard.jsx";
import RankingPASCard from "./dashboard/RankingPASCard.jsx";
import { COLORES, THEME } from "../utils/theme.js";
import { ESTADOS_CASO } from "../constants.js";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const Iconos = {
  money: (color) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
  ),
};

export default function TabDashboard({ pas, casos, derivadores, darkMode, pasManuales = [] }) {
  const T = THEME(darkMode);
  const allCasos = useMemo(() => Object.values(casos).flat(), [casos]);
  
  const totalCobradoYo = allCasos.filter(c => c.fecha_cobro_honorarios).reduce((s, c) => s + ((Number(c.monto_cobro_yo) || 0) - (Number(c.monto_comision_pas) || 0)), 0);
  const totalComisionesPAS = allCasos.reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0);
  const totalPendiente = allCasos.filter(c => !c.fecha_cobro_honorarios && (Number(c.monto_cobro_yo) || 0) > 0).reduce((s, c) => s + ((Number(c.monto_cobro_yo) || 0) - (Number(c.monto_comision_pas) || 0)), 0);
  const enGestion = allCasos.filter(c => !["cobrado", "desistido"].includes(c.estado)).length;
  const cobrados = allCasos.filter(c => c.estado === "cobrado").length;
  const nDerivadores = Object.values(derivadores).filter(Boolean).length;

  const hoy = new Date();

  // Cálculo de distribución de estados para Data Viz rápido
  const distribucionEstados = useMemo(() => {
    const total = allCasos.length;
    if (total === 0) return [];
    return ESTADOS_CASO.map(e => {
      const count = allCasos.filter(c => c.estado === e.key).length;
      const porcentaje = Math.round((count / total) * 100);
      return { ...e, count, porcentaje };
    }).filter(e => e.count > 0);
  }, [allCasos]);

  const misPendientes = useMemo(() => {
    return allCasos
      .filter(c => !["cobrado", "desistido"].includes(c.estado) && c.proxima_accion && c.proxima_accion.trim() !== "")
      // Primero lo que vence antes (vencidos arriba); sin plazo al final, del más quieto al más reciente
      .sort((a, b) => {
        const va = a.proxima_accion_vence || "9999-12-31", vb = b.proxima_accion_vence || "9999-12-31";
        if (va !== vb) return va.localeCompare(vb);
        return (a.fecha_ultimo_movimiento || a.fecha_derivacion || "").localeCompare(b.fecha_ultimo_movimiento || b.fecha_derivacion || "");
      });
  }, [allCasos]);

  const facturacionMensual = useMemo(() => {
    const mapa = {};
    allCasos.forEach(c => {
      if (c.estado === "cobrado" && c.monto_cobro_yo && c.fecha_cobro_honorarios) {
        const fecha = new Date(c.fecha_cobro_honorarios);
        const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
        mapa[key] = (mapa[key] || 0) + (Number(c.monto_cobro_yo) - (Number(c.monto_comision_pas) || 0));
      }
    });
    const datos = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      datos.push({ mes: MESES[d.getMonth()], key, valor: mapa[key] || 0 });
    }
    return datos;
  }, [allCasos]);

  const anoActual = hoy.getFullYear();
  const cobradoEsteAno = allCasos.filter(c => c.estado === "cobrado" && c.fecha_cobro_honorarios?.startsWith(String(anoActual))).reduce((s, c) => s + ((Number(c.monto_cobro_yo) || 0) - (Number(c.monto_comision_pas) || 0)), 0);
  const cobradoAnoAnt = allCasos.filter(c => c.estado === "cobrado" && c.fecha_cobro_honorarios?.startsWith(String(anoActual - 1))).reduce((s, c) => s + ((Number(c.monto_cobro_yo) || 0) - (Number(c.monto_comision_pas) || 0)), 0);
  const varAnual = cobradoAnoAnt > 0 ? Math.round(((cobradoEsteAno - cobradoAnoAnt) / cobradoAnoAnt) * 100) : null;

  const mesKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const cobradoEsteMes = facturacionMensual.find(d => d.key === mesKey)?.valor || 0;
  const mesAntKey = `${hoy.getFullYear()}-${String(hoy.getMonth()).padStart(2, "0")}`;
  const cobradoMesAnt = facturacionMensual.find(d => d.key === mesAntKey)?.valor || 0;
  const varMensual = cobradoMesAnt > 0 ? Math.round(((cobradoEsteMes - cobradoMesAnt) / cobradoMesAnt) * 100) : null;

  const rankingPAS = useMemo(() => {
    const todosLosPas = [...pas, ...pasManuales];
    return Object.entries(casos)
      .map(([pasId, casosList]) => {
        const pasObj = todosLosPas.find(p => String(p.id) === String(pasId));
        const cobrado = casosList.reduce((s, c) => s + (Number(c.monto_cobro_yo) || 0), 0);
        const total = casosList.length;
        const activos = casosList.filter(c => !["cobrado", "desistido"].includes(c.estado)).length;
        return { nombre: pasObj?.nombre || "PAS desconocido", cobrado, total, activos };
      })
      .filter(p => p.total > 0)
      .sort((a, b) => b.cobrado - a.cobrado || b.total - a.total)
      .slice(0, 8);
  }, [casos, pas, pasManuales]);

  const cobrosPendientes = useMemo(() => {
    const hoyMs = hoy.getTime();
    return allCasos
      .filter(c => c.estado === "esperando_pago")
      .map(c => {
        let fechaEstimada = null;
        let diasRestantes = null;
        if (c.fecha_firma && c.plazo_pago) {
          const venceMs = new Date(c.fecha_firma).getTime() + Number(c.plazo_pago) * 86400000;
          fechaEstimada = new Date(venceMs).toISOString().slice(0, 10);
          diasRestantes = Math.ceil((venceMs - hoyMs) / 86400000);
        } else if (c.fecha_pago) {
          fechaEstimada = c.fecha_pago;
          diasRestantes = Math.ceil((new Date(c.fecha_pago).getTime() - hoyMs) / 86400000);
        }
        return { ...c, fechaEstimada, diasRestantes, montoYo: Number(c.monto_cobro_yo) || 0, montoAsegurado: Number(c.monto_cobro_asegurado) || 0 };
      })
      .sort((a, b) => (a.fechaEstimada || "").localeCompare(b.fechaEstimada || ""));
  }, [allCasos]);

  const [mesSeleccionado, setMesSeleccionado] = useState(null);

  const casosDelMes = useMemo(() => {
    if (!mesSeleccionado) return [];
    return allCasos.filter(c => {
      if (c.estado !== "cobrado" || !c.monto_cobro_yo || !c.fecha_cobro_honorarios) return false;
      const fecha = new Date(c.fecha_cobro_honorarios);
      return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}` === mesSeleccionado;
    });
  }, [allCasos, mesSeleccionado]);

  return (
    <div className="fade-in">
      <StatCard label="Comisión cobrada total" value={fmtMoney(totalCobradoYo)} isHero={true} dark={darkMode} iconComponent={Iconos.money(COLORES.brand)} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <StatCard label="Esperando cobro" value={fmtMoney(totalPendiente)} color={COLORES.info} dark={darkMode} />
        <StatCard label="Comisiones PAS" value={fmtMoney(totalComisionesPAS)} color={T.text} dark={darkMode} />
        <StatCard label="Casos cobrados" value={cobrados} color={COLORES.success} sub={`${enGestion} en gestión`} dark={darkMode} />
        <StatCard label="Total casos" value={allCasos.length} color={T.text} sub={`${nDerivadores} derivadores`} dark={darkMode} />
      </div>

      {/* NUEVO BLOQUE: DATA VIZ - DISTRIBUCIÓN VISUAL DE ESTADOS DE CASOS */}
      {allCasos.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Distribución de Casos por Estado</span>
            <span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>{allCasos.length} casos totales</span>
          </div>
          {/* Barra de progreso segmentada / Gráfico visual proporcional */}
          <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", background: T.card2, gap: 2, marginBottom: 12 }}>
            {distribucionEstados.map(e => (
              <div 
                key={e.key} 
                style={{ width: `${e.porcentaje}%`, background: e.color, height: "100%", transition: "width 0.3s ease" }} 
                title={`${e.label}: ${e.count} (${e.porcentaje}%)`}
              />
            ))}
          </div>
          {/* Leyenda resumida */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {distribucionEstados.map(e => (
              <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.color }} />
                <span style={{ color: T.sub }}>{e.label}:</span>
                <span style={{ fontWeight: 700, color: T.text }}>{e.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <MisPendientesCard pendientes={misPendientes} darkMode={darkMode} />
      <CobrosPendientesCard cobrosPendientes={cobrosPendientes} darkMode={darkMode} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", borderLeft: `3px solid ${COLORES.info}` }}>
          <div style={{ fontSize: 11, color: T.text, marginBottom: 6, fontWeight: 600 }}>Este mes</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: COLORES.info, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(cobradoEsteMes)}</div>
          {varMensual !== null && <div style={{ fontSize: 11, color: varMensual >= 0 ? COLORES.success : COLORES.danger, marginTop: 4, fontWeight: 600 }}>{varMensual >= 0 ? "▲" : "▼"} {Math.abs(varMensual)}% vs anterior</div>}
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", borderLeft: `3px solid ${COLORES.warning}` }}>
          <div style={{ fontSize: 11, color: T.text, marginBottom: 6, fontWeight: 600 }}>{anoActual}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: COLORES.warning, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(cobradoEsteAno)}</div>
          {varAnual !== null && <div style={{ fontSize: 11, color: varAnual >= 0 ? COLORES.success : COLORES.danger, marginTop: 4, fontWeight: 600 }}>{varAnual >= 0 ? "▲" : "▼"} {Math.abs(varAnual)}% vs {anoActual - 1}</div>}
        </div>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 16px 10px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>Últimos 12 meses</div>
          {mesSeleccionado && <button onClick={() => setMesSeleccionado(null)} style={{ background: "none", border: "none", color: COLORES.info, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>✕ Cerrar detalle</button>}
        </div>
        <GraficoBarraMensual datos={facturacionMensual} darkMode={darkMode} mesSeleccionado={mesSeleccionado} onClickMes={setMesSeleccionado} />
        {mesSeleccionado && casosDelMes.length > 0 && (
          <div style={{ marginTop: 16, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
            {casosDelMes.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", marginBottom: 4, background: T.card2, borderRadius: 8, border: `1px solid ${T.border}` }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.asegurado}</div>
                  <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{c.compania_aseguradora || "—"} · {fmtDate(c.fecha_cobro_honorarios)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORES.success, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{fmtMoney((Number(c.monto_cobro_yo) || 0) - (Number(c.monto_comision_pas) || 0))}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RankingPASCard ranking={rankingPAS} darkMode={darkMode} />
      <GraficoCompanias allCasos={allCasos} darkMode={darkMode} cardBg={T.card} cardBorder={T.border} textColor={T.text} subColor={T.text} />
    </div>
  );
}