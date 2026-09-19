import { useMemo, useState } from "react";
import { fmtMoney, fmtDate } from "../utils/formatters.js";
import GraficoCompanias from "./GraficoCompanias.jsx";
import { ESTADOS_CASO } from "../constants.js";
import { COLORES, THEME } from "../utils/theme.js";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function StatCard({ label, value, color, sub, dark, icon, onClick, isHero = false }) {
  const Wrapper = onClick ? "button" : "div";
  const T = THEME(dark);

  if (isHero) {
    return (
      <Wrapper onClick={onClick} style={{
        all: onClick ? "unset" : undefined,
        display: "block",
        cursor: onClick ? "pointer" : "default",
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 10,
        transition: "all .2s",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 13, color: T.sub, marginBottom: 8, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: COLORES.brand, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
            {sub && <div style={{ fontSize: 13, color: T.sub, marginTop: 8 }}>{sub}</div>}
          </div>
          {icon && <div style={{ fontSize: 32, opacity: 0.4 }}>{icon}</div>}
        </div>
        {onClick && <div style={{ fontSize: 12, color: COLORES.brand, marginTop: 10 }}>Ver detalle →</div>}
      </Wrapper>
    );
  }

  return (
    <Wrapper onClick={onClick} style={{
      all: onClick ? "unset" : undefined,
      display: "block",
      cursor: onClick ? "pointer" : "default",
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: "14px 16px",
      transition: "all .2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: T.sub, marginBottom: 6, fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: color || T.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: T.sub, marginTop: 5 }}>{sub}</div>}
        </div>
        {icon && <div style={{ fontSize: 24, opacity: 0.3 }}>{icon}</div>}
      </div>
      {onClick && <div style={{ fontSize: 11, color: T.sub, marginTop: 6 }}>Ver detalle →</div>}
    </Wrapper>
  );
}

function Badge({ color, children }) {
  return (
    <div style={{ background: color + "18", border: `1px solid ${color}33`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}

function GraficoBarras({ datos, darkMode, mesSeleccionado, onClickMes }) {
  const T = THEME(darkMode);
  const maxValor = Math.max(...datos.map(d => d.valor), 1);
  const mesActual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 120, padding: "0 4px" }}>
      {datos.map(d => {
        const pct = Math.max((d.valor / maxValor) * 100, 3);
        const isActual = d.key === mesActual;
        const isSelected = d.key === mesSeleccionado;
        return (
          <div key={d.key} onClick={() => onClickMes?.(isSelected ? null : d.key)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: d.valor > 0 ? "pointer" : "default" }}>
            {d.valor > 0 && <div style={{ fontSize: 9, color: isSelected ? T.text : isActual ? COLORES.info : T.muted, fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{(d.valor / 1000).toFixed(0)}k</div>}
            <div style={{
              width: "100%",
              height: `${pct}%`,
              background: d.valor > 0
                ? isSelected ? `linear-gradient(180deg, ${COLORES.brand}, ${COLORES.brand}88)` : isActual ? `linear-gradient(180deg, ${COLORES.info}, ${COLORES.info}88)` : `linear-gradient(180deg, ${COLORES.info}66, ${COLORES.info}33)`
                : T.border,
              borderRadius: "4px 4px 0 0",
              transition: "all .3s ease",
              minHeight: 3,
            }} title={`${d.mes}: ${fmtMoney(d.valor)}`} />
            <div style={{ fontSize: 10, color: isSelected ? COLORES.brand : isActual ? COLORES.info : T.sub, textAlign: "center", fontWeight: isSelected || isActual ? 700 : 400 }}>{d.mes}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function TabDashboard({ pas, casos, derivadores, darkMode, pasManuales = [], onGoToClientes }) {
  const T = THEME(darkMode);
  const allCasos = useMemo(() => Object.values(casos).flat(), [casos]);
  
  const totalCobradoYo = allCasos.filter(c => c.fecha_cobro_honorarios).reduce((s, c) => s + ((Number(c.monto_cobro_yo) || 0) - (Number(c.monto_comision_pas) || 0)), 0);
  const totalComisionesPAS = allCasos.reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0);
  const totalPendiente = allCasos.filter(c => !c.fecha_cobro_honorarios && (Number(c.monto_cobro_yo) || 0) > 0).reduce((s, c) => s + ((Number(c.monto_cobro_yo) || 0) - (Number(c.monto_comision_pas) || 0)), 0);
  const totalAcordado = allCasos.reduce((s, c) => s + (Number(c.monto_acordado) || Number(c.monto_ofrecimiento) || 0), 0);
  const enGestion = allCasos.filter(c => !["cobrado", "desistido"].includes(c.estado)).length;
  const cobrados = allCasos.filter(c => c.estado === "cobrado").length;
  const nDerivadores = Object.values(derivadores).filter(Boolean).length;

  const cobroAseguradoPendiente = allCasos
    .filter(c => c.estado === "esperando_pago" && Number(c.monto_ofrecimiento) > 0)
    .reduce((s, c) => s + (Number(c.monto_ofrecimiento) || 0), 0);

  const hoy = new Date();

  // Panel de Pendientes de Gestión
  const misPendientes = useMemo(() => {
    return allCasos
      .filter(c => !["cobrado", "desistido"].includes(c.estado) && c.proxima_accion && c.proxima_accion.trim() !== "")
      .sort((a, b) => {
        const fa = a.updated_at || a.fecha_ultimo_movimiento || a.fecha_derivacion || "";
        const fb = b.updated_at || b.fecha_ultimo_movimiento || b.fecha_derivacion || "";
        return fa.localeCompare(fb);
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

  const maxCobrado = rankingPAS.length ? Math.max(...rankingPAS.map(p => p.cobrado), 1) : 1;

  const proximosPagos = useMemo(() => {
    const hoyMs = hoy.getTime();
    return allCasos
      .filter(c => c.fecha_firma && c.plazo_pago && c.estado !== "cobrado")
      .map(c => {
        const venceMs = new Date(c.fecha_firma).getTime() + Number(c.plazo_pago) * 86400000;
        return { ...c, fechaVence: new Date(venceMs).toISOString().slice(0, 10), diasRestantes: Math.ceil((venceMs - hoyMs) / 86400000) };
      })
      .filter(c => c.diasRestantes <= 15)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [allCasos]);
  
  const totalProximosPagos = proximosPagos.reduce((s, c) => s + (Number(c.monto_acordado) || Number(c.monto_ofrecimiento) || 0), 0);

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
        const montoYo = Number(c.monto_cobro_yo) || 0;
        const montoAsegurado = Number(c.monto_cobro_asegurado) || 0;
        const montoComision = Number(c.monto_comision_pas) || 0;
        return { ...c, fechaEstimada, diasRestantes, montoYo, montoAsegurado, montoComision };
      })
      .sort((a, b) => {
        if (a.fechaEstimada && !b.fechaEstimada) return -1;
        if (!a.fechaEstimada && b.fechaEstimada) return 1;
        if (a.fechaEstimada && b.fechaEstimada) return a.fechaEstimada.localeCompare(b.fechaEstimada);
        return 0;
      });
  }, [allCasos]);

  const [mesSeleccionado, setMesSeleccionado] = useState(null);

  const casosDelMes = useMemo(() => {
    if (!mesSeleccionado) return [];
    return allCasos.filter(c => {
      if (c.estado !== "cobrado" || !c.monto_cobro_yo || !c.fecha_cobro_honorarios) return false;
      const fecha = new Date(c.fecha_cobro_honorarios);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      return key === mesSeleccionado;
    });
  }, [allCasos, mesSeleccionado]);

  // Cálculo de distribución por los 4 grupos semánticos para la barra apilada
  const distribucionSemantica = useMemo(() => {
    const total = allCasos.length || 1;
    const grupos = {
      tramite: { count: 0, color: COLORES.info, label: "En trámite" },
      gestion: { count: 0, color: COLORES.warning, label: "Gestión activa" },
      cobrado: { count: 0, color: COLORES.success, label: "Cobrados" },
      desistido: { count: 0, color: COLORES.danger, label: "Desistidos" },
    };

    allCasos.forEach(c => {
      if (["documentacion_pendiente", "iniciado", "reclamado"].includes(c.estado)) grupos.tramite.count++;
      else if (["ofrecimiento", "mediacion", "en_juicio", "esperando_pago"].includes(c.estado)) grupos.gestion.count++;
      else if (c.estado === "cobrado") grupos.cobrado.count++;
      else if (c.estado === "desistido") grupos.desistido.count++;
      else grupos.tramite.count++; // fallback
    });

    return Object.values(grupos).map(g => ({ ...g, pct: (g.count / total) * 100 }));
  }, [allCasos]);

  return (
    <div className="fade-in">
      {/* TARJETA HERO (Única destacada en su propia fila con acento dorado) */}
      <StatCard label="Comisión cobrada total" value={fmtMoney(totalCobradoYo)} isHero={true} dark={darkMode} icon="💰" />

      {/* FILA SECUNDARIA DE KPIS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <StatCard label="Esperando cobro" value={fmtMoney(totalPendiente)} color={COLORES.info} dark={darkMode} />
        <StatCard label="Comisiones PAS" value={fmtMoney(totalComisionesPAS)} color={COLORES.warning} dark={darkMode} />
        <StatCard label="Casos cobrados" value={cobrados} color={COLORES.success} sub={`${enGestion} en gestión`} dark={darkMode} />
        <StatCard label="Total casos" value={allCasos.length} color={T.text} sub={`${nDerivadores} derivadores`} dark={darkMode} />
      </div>

      {/* DISTRIBUCIÓN POR ESTADO (Barra apilada horizontal unificada) */}
      {allCasos.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 12 }}>Distribución de casos por estado actual</div>
          <div style={{ display: "flex", height: 24, borderRadius: 6, overflow: "hidden", gap: 2, background: T.border, marginBottom: 10 }}>
            {distribucionSemantica.map((g, idx) => g.count > 0 && (
              <div key={idx} style={{ width: `${g.pct}%`, background: g.color, height: "100%", transition: "width .4s ease" }} title={`${g.label}: ${g.count} (${g.pct.toFixed(1)}%)`} />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 11, color: T.sub }}>
            {distribucionSemantica.map((g, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: g.color }} />
                <span>{g.label}: <strong>{g.count}</strong> ({g.pct.toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MIS PENDIENTES DE GESTIÓN */}
      {misPendientes.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px", marginBottom: 20, borderLeft: `3px solid ${COLORES.warning}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Mis pendientes de gestión (próxima acción)</span>
            <Badge color={COLORES.warning}>{misPendientes.length}</Badge>
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
            {misPendientes.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", marginBottom: 6, background: T.card2, borderRadius: 8, border: `1px solid ${T.border}` }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.asegurado} <span style={{ fontWeight: 400, color: T.sub, fontSize: 11 }}>· {c.compania || "Sin Cía"}</span>
                  </div>
                  <div style={{ fontSize: 13, color: COLORES.warning, marginTop: 4, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>👉</span> {c.proxima_accion}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COBROS PENDIENTES */}
      {cobrosPendientes.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px", marginBottom: 20, borderLeft: `3px solid ${COLORES.info}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Cobros pendientes</span>
            <Badge color={COLORES.info}>{cobrosPendientes.length}</Badge>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 14, fontSize: 12 }}>
            <span style={{ color: COLORES.success, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>Mis honorarios: {fmtMoney(cobrosPendientes.reduce((s, c) => s + c.montoYo, 0))}</span>
            <span style={{ color: COLORES.info, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>Asegurados: {fmtMoney(cobrosPendientes.reduce((s, c) => s + c.montoAsegurado, 0))}</span>
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
            {cobrosPendientes.map(c => {
              const vencido = c.diasRestantes !== null && c.diasRestantes < 0;
              const urgente = c.diasRestantes !== null && c.diasRestantes <= 3 && c.diasRestantes >= 0;
              const badgeColor = vencido ? COLORES.danger : urgente ? COLORES.warning : c.fechaEstimada ? COLORES.info : T.sub;
              const badgeText = c.fechaEstimada
                ? (vencido ? `Vencido (${Math.abs(c.diasRestantes)}d)` : c.diasRestantes === 0 ? "Hoy" : `${c.diasRestantes}d`)
                : "Sin fecha";
              return (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", marginBottom: 4, background: T.card2, borderRadius: 8, border: `1px solid ${T.border}` }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.asegurado}</div>
                    <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
                      {c.compania || "—"}
                      {c.fechaEstimada ? ` · Pago est. ${fmtDate(c.fechaEstimada)}` : ""}
                    </div>
                  </div>
                  <Badge color={badgeColor}>{badgeText}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FACTURACIÓN */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", borderLeft: `3px solid ${COLORES.info}` }}>
          <div style={{ fontSize: 11, color: T.sub, marginBottom: 6, fontWeight: 600 }}>Este mes</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: COLORES.info, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(cobradoEsteMes)}</div>
          {varMensual !== null && (
            <div style={{ fontSize: 11, color: varMensual >= 0 ? COLORES.success : COLORES.danger, marginTop: 4, fontWeight: 600 }}>
              {varMensual >= 0 ? "▲" : "▼"} {Math.abs(varMensual)}% vs anterior
            </div>
          )}
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", borderLeft: `3px solid ${COLORES.warning}` }}>
          <div style={{ fontSize: 11, color: T.sub, marginBottom: 6, fontWeight: 600 }}>{anoActual}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: COLORES.warning, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(cobradoEsteAno)}</div>
          {varAnual !== null && (
            <div style={{ fontSize: 11, color: varAnual >= 0 ? COLORES.success : COLORES.danger, marginTop: 4, fontWeight: 600 }}>
              {varAnual >= 0 ? "▲" : "▼"} {Math.abs(varAnual)}% vs {anoActual - 1}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 16px 10px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>Últimos 12 meses</div>
          {mesSeleccionado && <button onClick={() => setMesSeleccionado(null)} style={{ background: "none", border: "none", color: COLORES.info, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>✕ Cerrar detalle</button>}
        </div>
        <GraficoBarras datos={facturacionMensual} darkMode={darkMode} mesSeleccionado={mesSeleccionado} onClickMes={setMesSeleccionado} />
        {mesSeleccionado && casosDelMes.length > 0 && (() => {
          const mesLabel = facturacionMensual.find(d => d.key === mesSeleccionado)?.mes || mesSeleccionado;
          const totalMes = casosDelMes.reduce((s, c) => s + ((Number(c.monto_cobro_yo) || 0) - (Number(c.monto_comision_pas) || 0)), 0);
          return (
            <div style={{ marginTop: 16, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORES.info }}>{mesLabel} — {casosDelMes.length} caso{casosDelMes.length !== 1 ? "s" : ""} cobrado{casosDelMes.length !== 1 ? "s" : ""}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: COLORES.success, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(totalMes)}</div>
              </div>
              {casosDelMes.map(c => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", marginBottom: 4, background: T.card2, borderRadius: 8, border: `1px solid ${T.border}` }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.asegurado}</div>
                    <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{c.compania || "—"} · {fmtDate(c.fecha_cobro_honorarios)}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORES.success, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{fmtMoney((Number(c.monto_cobro_yo) || 0) - (Number(c.monto_comision_pas) || 0))}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* RANKING PAS */}
      {rankingPAS.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 14 }}>Ranking PAS</div>
          {rankingPAS.map((p, i) => (
            <div key={p.nombre} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < rankingPAS.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? COLORES.warning + "22" : T.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>{i + 1}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "55%" }}>{p.nombre}</div>
                  <div style={{ fontSize: 13, color: p.cobrado > 0 ? COLORES.success : T.sub, fontWeight: 700, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{p.cobrado > 0 ? fmtMoney(p.cobrado) : "en gestión"}</div>
                </div>
                <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max((p.cobrado / maxCobrado) * 100, p.total > 0 ? 4 : 0)}%`, background: i === 0 ? COLORES.warning : COLORES.info, borderRadius: 2, transition: "width .5s ease" }} />
                </div>
                <div style={{ fontSize: 11, color: T.sub, marginTop: 4 }}>{p.total} caso{p.total !== 1 ? "s" : ""}{p.activos > 0 ? ` · ${p.activos} activo${p.activos !== 1 ? "s" : ""}` : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PRÓXIMOS PAGOS */}
      {proximosPagos.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px", marginBottom: 20, borderLeft: `3px solid ${COLORES.success}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
            <span>Próximos pagos (15 días)</span>
            <span style={{ color: COLORES.success, fontVariantNumeric: "tabular-nums" }}>Total: {fmtMoney(totalProximosPagos)}</span>
          </div>
          {proximosPagos.map(c => {
            const vencido = c.diasRestantes <= 0;
            const urgente = c.diasRestantes <= 3;
            const badgeColor = vencido ? COLORES.danger : urgente ? COLORES.warning : COLORES.success;
            const badgeText = vencido ? `Vencido (${Math.abs(c.diasRestantes)}d)` : c.diasRestantes === 0 ? "Hoy" : `${c.diasRestantes}d`;
            return (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", marginBottom: 4, background: T.card2, borderRadius: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.asegurado}</div>
                  <div style={{ fontSize: 11, color: T.sub, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{c.compania || "—"} · {fmtMoney(Number(c.monto_acordado) || Number(c.monto_ofrecimiento))}</div>
                </div>
                <Badge color={badgeColor}>{badgeText}</Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* COMPARATIVA COMPAÑÍAS */}
      <GraficoCompanias allCasos={allCasos} darkMode={darkMode} cardBg={T.card} cardBorder={T.border} textColor={T.text} subColor={T.sub} />
    </div>
  );
}