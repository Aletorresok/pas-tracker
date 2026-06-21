import { useMemo } from "react";
import { fmtMoney } from "../utils/formatters.js";
import { ESTADOS_CASO } from "../constants.js";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function StatCard({ label, value, color, sub, dark, icon, onClick }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper onClick={onClick} style={{
      all: onClick ? "unset" : undefined,
      display: "block",
      cursor: onClick ? "pointer" : "default",
      background: dark ? "#111827" : "#fff",
      border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 12,
      padding: "14px 16px",
      transition: "all .2s",
      ...(onClick ? {} : {}),
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, color: dark ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6, fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: dark ? "#475569" : "#94a3b8", marginTop: 5 }}>{sub}</div>}
        </div>
        {icon && <div style={{ fontSize: 24, opacity: 0.3 }}>{icon}</div>}
      </div>
      {onClick && <div style={{ fontSize: 11, color: color + "88", marginTop: 6 }}>Ver detalle →</div>}
    </Wrapper>
  );
}

function Badge({ color, children }) {
  return (
    <div style={{ background: color + "18", border: `1px solid ${color}33`, borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, color, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}

function GraficoBarras({ datos, darkMode }) {
  const maxValor = Math.max(...datos.map(d => d.valor), 1);
  const mesActual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 120, padding: "0 4px" }}>
      {datos.map(d => {
        const pct = Math.max((d.valor / maxValor) * 100, 3);
        const isActual = d.key === mesActual;
        return (
          <div key={d.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {d.valor > 0 && <div style={{ fontSize: 8, color: isActual ? "#818cf8" : darkMode ? "#475569" : "#94a3b8", fontWeight: 700, whiteSpace: "nowrap" }}>{(d.valor / 1000).toFixed(0)}k</div>}
            <div style={{
              width: "100%",
              height: `${pct}%`,
              background: d.valor > 0
                ? isActual ? "linear-gradient(180deg, #818cf8, #6366f1)" : "linear-gradient(180deg, #6366f166, #6366f133)"
                : darkMode ? "#1e293b" : "#e2e8f0",
              borderRadius: "4px 4px 0 0",
              transition: "all .4s ease",
              minHeight: 3,
            }} title={`${d.mes}: ${fmtMoney(d.valor)}`} />
            <div style={{ fontSize: 9, color: isActual ? "#818cf8" : darkMode ? "#475569" : "#94a3b8", textAlign: "center", fontWeight: isActual ? 700 : 400 }}>{d.mes}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function TabDashboard({ pas, casos, derivadores, darkMode, pasManuales = [], onGoToClientes }) {
  const allCasos = useMemo(() => Object.values(casos).flat(), [casos]);
  const totalCobradoYo     = allCasos.reduce((s, c) => s + (Number(c.monto_cobro_yo) || 0), 0);
  const totalComisionesPAS = allCasos.reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0);
  const totalPendiente     = allCasos.filter(c => c.estado === "esperando_pago").reduce((s, c) => s + (Number(c.monto_cobro_yo) || 0), 0);
  const totalAcordado      = allCasos.reduce((s, c) => s + (Number(c.monto_acordado) || Number(c.monto_ofrecimiento) || 0), 0);
  const enGestion          = allCasos.filter(c => !["cobrado", "desistido"].includes(c.estado)).length;
  const cobrados           = allCasos.filter(c => c.estado === "cobrado").length;
  const nDerivadores       = Object.values(derivadores).filter(Boolean).length;

  const honorariosPendientes = allCasos
    .filter(c => c.estado_honorarios !== "COBRADO" && (Number(c.monto_honorarios) > 0 || Number(c.monto_cobro_yo) > 0))
    .reduce((s, c) => s + (Number(c.monto_honorarios) || Number(c.monto_cobro_yo) || 0), 0);
  const cobroAseguradoPendiente = allCasos
    .filter(c => c.estado === "esperando_pago" && Number(c.monto_cobro_asegurado) > 0)
    .reduce((s, c) => s + (Number(c.monto_cobro_asegurado) || 0), 0);

  const diasSinMov = (c) => {
    const ult = c.fecha_ultimo_movimiento || c.fecha_derivacion;
    if (!ult) return 999;
    return Math.floor((Date.now() - new Date(ult).getTime()) / 86400000);
  };
  const casosInactivos = allCasos
    .filter(c => !["cobrado", "doc_pendiente", "desistido"].includes(c.estado) && diasSinMov(c) >= 7)
    .sort((a, b) => diasSinMov(b) - diasSinMov(a));

  const hoy = new Date();

  const facturacionMensual = useMemo(() => {
    const mapa = {};
    allCasos.forEach(c => {
      if (c.estado === "cobrado" && c.monto_cobro_yo && c.fecha_ultimo_movimiento) {
        const fecha = new Date(c.fecha_ultimo_movimiento);
        const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
        mapa[key] = (mapa[key] || 0) + Number(c.monto_cobro_yo);
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
  const cobradoEsteAno  = allCasos.filter(c => c.estado === "cobrado" && c.fecha_ultimo_movimiento?.startsWith(String(anoActual))).reduce((s, c) => s + (Number(c.monto_cobro_yo) || 0), 0);
  const cobradoAnoAnt   = allCasos.filter(c => c.estado === "cobrado" && c.fecha_ultimo_movimiento?.startsWith(String(anoActual - 1))).reduce((s, c) => s + (Number(c.monto_cobro_yo) || 0), 0);
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

  const metricas = useMemo(() => {
    const diff = (a, b) => { if (!a || !b) return null; return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000); };
    const prom = (vals) => { const v = vals.filter(x => x !== null && x >= 0); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null; };
    return {
      derivAContacto: prom(allCasos.map(c => diff(c.fecha_derivacion, c.fecha_contacto_asegurado))),
      contactoAInicio: prom(allCasos.map(c => diff(c.fecha_contacto_asegurado, c.fecha_inicio_reclamo))),
      inicioAOfrec: prom(allCasos.filter(c => c.fecha_ofrecimiento).map(c => diff(c.fecha_inicio_reclamo, c.fecha_ofrecimiento))),
      ofrecACobro: prom(allCasos.filter(c => c.estado === "cobrado" && c.fecha_firma).map(c => diff(c.fecha_ofrecimiento, c.fecha_firma))),
      totalDerAFirma: prom(allCasos.filter(c => c.estado === "cobrado" && c.fecha_firma).map(c => diff(c.fecha_derivacion, c.fecha_firma))),
    };
  }, [allCasos]);

  const cardBg = darkMode ? "#111827" : "#fff";
  const cardBorder = darkMode ? "#1e293b" : "#e2e8f0";
  const textColor = darkMode ? "#f1f5f9" : "#1e293b";
  const subColor = darkMode ? "#64748b" : "#94a3b8";

  return (
    <div className="fade-in">
      {/* RESUMEN FINANCIERO */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <StatCard label="Total cobrado" value={fmtMoney(totalCobradoYo)} color="#6366f1" dark={darkMode} icon="💰" />
        <StatCard label="Esperando cobro" value={fmtMoney(totalPendiente)} color="#06b6d4" dark={darkMode} icon="⏳" />
        <StatCard label="Comisiones PAS" value={fmtMoney(totalComisionesPAS)} color="#eab308" dark={darkMode} icon="🤝" />
        <StatCard label="Casos cobrados" value={cobrados} color="#22c55e" sub={`${enGestion} en gestión`} dark={darkMode} icon="✅" />
      </div>

      {/* HONORARIOS / COBRO PENDIENTE */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <StatCard label="Mis honorarios pendientes" value={fmtMoney(honorariosPendientes || null)} color={honorariosPendientes > 0 ? "#6366f1" : subColor} dark={darkMode} icon="💼" onClick={onGoToClientes} />
        <StatCard label="Cobro asegurados pend." value={fmtMoney(cobroAseguradoPendiente || null)} color={cobroAseguradoPendiente > 0 ? "#22c55e" : subColor} dark={darkMode} icon="🕐" onClick={onGoToClientes} />
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <StatCard label="Total casos" value={allCasos.length} color="#6366f1" sub={`${enGestion} activos`} dark={darkMode} />
        <StatCard label="Derivadores" value={nDerivadores} color="#eab308" sub={`${Object.keys(casos).length} con casos`} dark={darkMode} />
        <StatCard label="Monto total" value={fmtMoney(totalAcordado)} color="#22c55e" dark={darkMode} />
      </div>

      {/* CASOS INACTIVOS */}
      {casosInactivos.length > 0 && (
        <div style={{ background: darkMode ? "#111827" : "#fff", border: "1px solid #ef444433", borderRadius: 14, padding: 16, marginBottom: 16, borderLeft: "3px solid #ef4444" }}>
          <div style={{ fontSize: 12, color: "#ef4444", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
            <span>⚠️ Sin movimiento (+7 días)</span>
            <Badge color="#ef4444">{casosInactivos.length}</Badge>
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
            {casosInactivos.map(c => {
              const d = diasSinMov(c);
              const ei = ESTADOS_CASO.find(e => e.key === c.estado) || {};
              return (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", marginBottom: 4, background: darkMode ? "#0b1121" : "#fafbfc", borderRadius: 8, border: `1px solid ${darkMode ? "#1e293b" : "#f1f5f9"}` }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.asegurado}</div>
                    <div style={{ fontSize: 11, color: subColor, marginTop: 2 }}>{ei.emoji} {ei.label} · {c.compania || "sin compañía"}</div>
                  </div>
                  <Badge color={d >= 30 ? "#ef4444" : "#f97316"}>{d}d</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FACTURACIÓN */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "16px 18px", borderLeft: "3px solid #6366f1" }}>
          <div style={{ fontSize: 10, color: subColor, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6, fontWeight: 600 }}>Este mes</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#6366f1" }}>{fmtMoney(cobradoEsteMes)}</div>
          {varMensual !== null && (
            <div style={{ fontSize: 11, color: varMensual >= 0 ? "#22c55e" : "#ef4444", marginTop: 4, fontWeight: 600 }}>
              {varMensual >= 0 ? "▲" : "▼"} {Math.abs(varMensual)}% vs anterior
            </div>
          )}
        </div>
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "16px 18px", borderLeft: "3px solid #8b5cf6" }}>
          <div style={{ fontSize: 10, color: subColor, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6, fontWeight: 600 }}>{anoActual}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#8b5cf6" }}>{fmtMoney(cobradoEsteAno)}</div>
          {varAnual !== null && (
            <div style={{ fontSize: 11, color: varAnual >= 0 ? "#22c55e" : "#ef4444", marginTop: 4, fontWeight: 600 }}>
              {varAnual >= 0 ? "▲" : "▼"} {Math.abs(varAnual)}% vs {anoActual - 1}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "18px 16px 10px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: subColor, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 16, fontWeight: 600 }}>Últimos 12 meses</div>
        <GraficoBarras datos={facturacionMensual} darkMode={darkMode} />
      </div>

      {/* RANKING PAS */}
      {rankingPAS.length > 0 && (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "18px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: subColor, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14 }}>🏆 Ranking PAS</div>
          {rankingPAS.map((p, i) => (
            <div key={p.nombre} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < rankingPAS.length - 1 ? `1px solid ${darkMode ? "#1e293b44" : "#f1f5f9"}` : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? "#eab30822" : i === 1 ? "#94a3b822" : i === 2 ? "#f9731622" : darkMode ? "#1e293b" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span style={{ fontSize: 11, fontWeight: 700, color: subColor }}>{i + 1}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "55%" }}>{p.nombre}</div>
                  <div style={{ fontSize: 13, color: p.cobrado > 0 ? "#6366f1" : subColor, fontWeight: 700, flexShrink: 0 }}>{p.cobrado > 0 ? fmtMoney(p.cobrado) : "en gestión"}</div>
                </div>
                <div style={{ height: 4, background: darkMode ? "#1e293b" : "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max((p.cobrado / maxCobrado) * 100, p.total > 0 ? 4 : 0)}%`, background: `linear-gradient(90deg, ${i === 0 ? "#eab308" : "#6366f1"}, ${i === 0 ? "#f59e0b" : "#818cf8"})`, borderRadius: 2, transition: "width .5s ease" }} />
                </div>
                <div style={{ fontSize: 10, color: subColor, marginTop: 4 }}>{p.total} caso{p.total !== 1 ? "s" : ""}{p.activos > 0 ? ` · ${p.activos} activo${p.activos !== 1 ? "s" : ""}` : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PRÓXIMOS PAGOS */}
      {proximosPagos.length > 0 && (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "18px", marginBottom: 20, borderLeft: "3px solid #22c55e" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: subColor, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14 }}>💳 Próximos pagos (15 días)</div>
          {proximosPagos.map(c => {
            const vencido = c.diasRestantes <= 0;
            const urgente = c.diasRestantes <= 3;
            const badgeColor = vencido ? "#ef4444" : urgente ? "#f97316" : "#22c55e";
            const badgeText = vencido ? `Vencido (${Math.abs(c.diasRestantes)}d)` : c.diasRestantes === 0 ? "Hoy" : `${c.diasRestantes}d`;
            return (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", marginBottom: 4, background: darkMode ? "#0b1121" : "#fafbfc", borderRadius: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.asegurado}</div>
                  <div style={{ fontSize: 11, color: subColor, marginTop: 2 }}>{c.compania || "—"} · {fmtMoney(Number(c.monto_acordado) || Number(c.monto_ofrecimiento))}</div>
                </div>
                <Badge color={badgeColor}>{badgeText}</Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* TIEMPOS PROMEDIO */}
      {metricas.totalDerAFirma !== null && (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "18px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: subColor, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14 }}>⚡ Tiempos promedio</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#6366f1", lineHeight: 1 }}>{metricas.totalDerAFirma}d</div>
            <div style={{ fontSize: 12, color: subColor }}>derivación → firma</div>
          </div>
          <div style={{ display: "flex", gap: 3, alignItems: "center", marginBottom: 12, height: 10 }}>
            {[
              { val: metricas.derivAContacto, color: "#22c55e" },
              { val: metricas.contactoAInicio, color: "#3b82f6" },
              { val: metricas.inicioAOfrec, color: "#f97316" },
              { val: metricas.ofrecACobro, color: "#a855f7" },
            ].filter(s => s.val !== null).map((s, i) => (
              <div key={i} style={{ flex: s.val || 1, background: `linear-gradient(90deg, ${s.color}, ${s.color}88)`, borderRadius: 5, height: "100%", minWidth: 8 }} />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Derivación → Contacto", val: metricas.derivAContacto, color: "#22c55e" },
              { label: "Contacto → Inicio", val: metricas.contactoAInicio, color: "#3b82f6" },
              { label: "Inicio → Ofrecimiento", val: metricas.inicioAOfrec, color: "#f97316" },
              { label: "Ofrecimiento → Firma", val: metricas.ofrecACobro, color: "#a855f7" },
            ].filter(s => s.val !== null).map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: subColor }}>{s.label}: <strong style={{ color: s.color }}>{s.val}d</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
