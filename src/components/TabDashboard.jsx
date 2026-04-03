import { useMemo } from "react";
import { fmtMoney, fmtDate } from "../utils/formatters.js";
import { ESTADOS_CASO } from "../constants.js";

// Meses para el gráfico
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Componente auxiliar: Tarjeta estadística
function StatCard({ label, value, color, sub, dark }) {
  return (
    <div style={{ background: dark ? "#0f172a" : "#f8fafc", border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: dark ? "#475569" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: dark ? "#64748b" : "#94a3b8", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// Componente auxiliar: Badge
function Badge({ color, children }) {
  return (
    <div style={{ background: color + "22", border: `1px solid ${color}44`, borderRadius: 6, padding: "4px 8px", fontSize: 10, fontWeight: 700, color, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}

// Componente auxiliar: Gráfico de barras
function GraficoBarras({ datos, darkMode }) {
  const maxValor = Math.max(...datos.map(d => d.valor), 1);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 100 }}>
      {datos.map(d => (
        <div key={d.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: "100%", height: `${Math.max((d.valor / maxValor) * 100, 2)}%`, background: d.valor > 0 ? "#6366f1" : darkMode ? "#1e293b" : "#e2e8f0", borderRadius: "4px 4px 0 0", transition: "all .3s" }} title={`${d.mes}: ${fmtMoney(d.valor)}`} />
          <div style={{ fontSize: 9, color: darkMode ? "#64748b" : "#94a3b8", textAlign: "center", lineHeight: 1.2 }}>{d.mes}</div>
        </div>
      ))}
    </div>
  );
}

export default function TabDashboard({ pas, historial, casos, derivadores, recordatorios, darkMode, pasManuales = [], onGoToClientes }) {
  const allCasos = useMemo(() => Object.values(casos).flat(), [casos]);
  const totalCobradoYo     = allCasos.reduce((s, c) => s + (Number(c.monto_cobro_yo) || 0), 0);
  const totalComisionesPAS = allCasos.reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0);
  const totalPendiente     = allCasos.filter(c => c.estado === "esperando_pago").reduce((s, c) => s + (Number(c.monto_cobro_yo) || 0), 0);
  const enGestion          = allCasos.filter(c => c.estado !== "cobrado").length;
  const cobrados           = allCasos.filter(c => c.estado === "cobrado").length;
  const nDerivadores       = Object.values(derivadores).filter(Boolean).length;
  const contactados        = pas.filter(p => (historial[p.id] || []).length > 0).length;
  const positivos          = pas.filter(p => (historial[p.id] || []).some(c => (c.resultados || [c.resultado]).includes("respondio_positivo"))).length;
  const negativos          = pas.filter(p => (historial[p.id] || []).some(c => (c.resultados || [c.resultado]).includes("respondio_negativo"))).length;
  const neutros            = pas.filter(p => (historial[p.id] || []).some(c => (c.resultados || [c.resultado]).includes("respondio_neutro"))).length;
  const noRespondieron     = pas.filter(p => (historial[p.id] || []).length > 0 && (historial[p.id] || []).every(c => (c.resultados || [c.resultado]).includes("no_respondio") || (c.resultados || [c.resultado]).includes("numero_incorrecto"))).length;
  const volverContactar    = pas.filter(p => (historial[p.id] || []).some(c => (c.resultados || [c.resultado]).includes("volver_contactar"))).length;
  const tasaRespuesta      = contactados > 0 ? Math.round(((positivos + negativos + neutros) / contactados) * 100) : 0;
  const tasaPositiva       = contactados > 0 ? Math.round((positivos / contactados) * 100) : 0;

  const honorariosPendientes = allCasos
    .filter(c => c.estado_honorarios !== "COBRADO" && (Number(c.monto_honorarios) > 0 || Number(c.monto_cobro_yo) > 0))
    .reduce((s, c) => s + (Number(c.monto_honorarios) || Number(c.monto_cobro_yo) || 0), 0);
  const cobroAseguradoPendiente = allCasos
    .filter(c => c.estado === "esperando_pago" && Number(c.monto_cobro_asegurado) > 0)
    .reduce((s, c) => s + (Number(c.monto_cobro_asegurado) || 0), 0);

  const hoyStr = new Date().toISOString().slice(0, 10);
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
        const activos = casosList.filter(c => c.estado !== "cobrado").length;
        return { nombre: pasObj?.nombre || "PAS desconocido", cobrado, total, activos };
      })
      .filter(p => p.total > 0)
      .sort((a, b) => b.cobrado - a.cobrado || b.total - a.total)
      .slice(0, 8);
  }, [casos, pas, pasManuales]);

  const maxCobrado = rankingPAS.length ? Math.max(...rankingPAS.map(p => p.cobrado), 1) : 1;

  const recsPAS = pas.filter(p => { const r = recordatorios?.[p.id]; return r && r <= hoyStr; });
  const recsCasos = [];
  Object.entries(casos).forEach(([pasId, casosList]) => {
    const pasObj = pas.find(p => p.id === Number(pasId));
    casosList.forEach(c => { if (c.recordatorio && c.recordatorio <= hoyStr) recsCasos.push({ ...c, pasNombre: pasObj?.nombre || "PAS desconocido" }); });
  });

  const cardBg = darkMode ? "#0f172a" : "#f8fafc";
  const cardBorder = darkMode ? "#1e293b" : "#e2e8f0";
  const textColor = darkMode ? "#f1f5f9" : "#1e293b";
  const subColor = darkMode ? "#64748b" : "#94a3b8";

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: subColor, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Resumen general</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <StatCard label="Total cobrado" value={fmtMoney(totalCobradoYo)} color="#6366f1" dark={darkMode} />
        <StatCard label="Esperando cobro" value={fmtMoney(totalPendiente)} color="#06b6d4" dark={darkMode} />
        <StatCard label="Comisiones PAS" value={fmtMoney(totalComisionesPAS)} color="#eab308" dark={darkMode} />
        <StatCard label="Casos cobrados" value={cobrados} color="#22c55e" sub={`${enGestion} en gestión`} dark={darkMode} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <button onClick={onGoToClientes} style={{ all: "unset", cursor: "pointer", display: "block" }}>
          <div style={{ background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${honorariosPendientes > 0 ? "#6366f144" : darkMode ? "#1e293b" : "#e2e8f0"}`, borderRadius: 12, padding: "12px 14px", transition: "border-color .2s" }}>
            <div style={{ fontSize: 10, color: darkMode ? "#475569" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>💰 Mis honorarios pendientes</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: honorariosPendientes > 0 ? "#6366f1" : darkMode ? "#334155" : "#94a3b8", lineHeight: 1.1 }}>{fmtMoney(honorariosPendientes || null)}</div>
            <div style={{ fontSize: 11, color: "#6366f188", marginTop: 3 }}>Ver en Clientes →</div>
          </div>
        </button>
        <button onClick={onGoToClientes} style={{ all: "unset", cursor: "pointer", display: "block" }}>
          <div style={{ background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${cobroAseguradoPendiente > 0 ? "#22c55e44" : darkMode ? "#1e293b" : "#e2e8f0"}`, borderRadius: 12, padding: "12px 14px", transition: "border-color .2s" }}>
            <div style={{ fontSize: 10, color: darkMode ? "#475569" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>🕐 Cobro asegurados pend.</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: cobroAseguradoPendiente > 0 ? "#22c55e" : darkMode ? "#334155" : "#94a3b8", lineHeight: 1.1 }}>{fmtMoney(cobroAseguradoPendiente || null)}</div>
            <div style={{ fontSize: 11, color: "#22c55e88", marginTop: 3 }}>Ver en Clientes →</div>
          </div>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        <StatCard label="Contactados" value={contactados} color="#6366f1" sub={`de ${pas.length}`} dark={darkMode} />
        <StatCard label="Positivos" value={positivos} color="#22c55e" dark={darkMode} />
        <StatCard label="Derivadores" value={nDerivadores} color="#eab308" dark={darkMode} />
      </div>

      {contactados > 0 && (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "14px", marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: subColor, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Tasa de respuesta</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: tasaRespuesta >= 50 ? "#22c55e" : tasaRespuesta >= 25 ? "#eab308" : "#ef4444", lineHeight: 1 }}>{tasaRespuesta}%</div>
              <div style={{ fontSize: 11, color: subColor, marginTop: 4 }}>respondieron ({positivos + negativos + neutros} de {contactados})</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e", lineHeight: 1 }}>{tasaPositiva}%</div>
              <div style={{ fontSize: 11, color: subColor, marginTop: 4 }}>tasa positiva</div>
            </div>
          </div>
          <div style={{ height: 8, borderRadius: 6, overflow: "hidden", display: "flex", marginBottom: 10 }}>
            {positivos > 0  && <div style={{ flex: positivos,  background: "#22c55e" }} title={`Positivos: ${positivos}`} />}
            {neutros > 0    && <div style={{ flex: neutros,    background: "#eab308" }} title={`Neutros: ${neutros}`} />}
            {negativos > 0  && <div style={{ flex: negativos,  background: "#ef4444" }} title={`Negativos: ${negativos}`} />}
            {volverContactar > 0 && <div style={{ flex: volverContactar, background: "#6366f1" }} title={`Volver: ${volverContactar}`} />}
            {noRespondieron > 0  && <div style={{ flex: noRespondieron,  background: darkMode ? "#1e293b" : "#e2e8f0" }} title={`Sin respuesta: ${noRespondieron}`} />}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { l: "Positivos",    v: positivos,     c: "#22c55e" },
              { l: "Neutros",      v: neutros,       c: "#eab308" },
              { l: "Negativos",    v: negativos,     c: "#ef4444" },
              { l: "Volver",       v: volverContactar, c: "#6366f1" },
              { l: "Sin respuesta",v: noRespondieron,  c: darkMode ? "#334155" : "#94a3b8" },
            ].map(s => s.v > 0 && (
              <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: s.c, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: subColor }}>{s.l}: <strong style={{ color: darkMode ? "#cbd5e1" : "#334155" }}>{s.v}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: subColor, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Facturación</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, color: subColor, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Este mes</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#6366f1" }}>{fmtMoney(cobradoEsteMes)}</div>
          {varMensual !== null && (
            <div style={{ fontSize: 11, color: varMensual >= 0 ? "#22c55e" : "#ef4444", marginTop: 3 }}>
              {varMensual >= 0 ? "▲" : "▼"} {Math.abs(varMensual)}% vs mes anterior
            </div>
          )}
        </div>
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, color: subColor, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{anoActual}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#6366f1" }}>{fmtMoney(cobradoEsteAno)}</div>
          {varAnual !== null && (
            <div style={{ fontSize: 11, color: varAnual >= 0 ? "#22c55e" : "#ef4444", marginTop: 3 }}>
              {varAnual >= 0 ? "▲" : "▼"} {Math.abs(varAnual)}% vs {anoActual - 1}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "14px 14px 8px", marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: subColor, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Últimos 12 meses</div>
        <GraficoBarras datos={facturacionMensual} darkMode={darkMode} />
      </div>

      {rankingPAS.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: subColor, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Ranking PAS</div>
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "14px", marginBottom: 18 }}>
            {rankingPAS.map((p, i) => (
              <div key={p.nombre} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < rankingPAS.length - 1 ? 12 : 0 }}>
                <div style={{ width: 22, fontSize: 13, fontWeight: 800, color: i === 0 ? "#eab308" : i === 1 ? "#94a3b8" : i === 2 ? "#f97316" : subColor, textAlign: "center", flexShrink: 0 }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "60%" }}>{p.nombre}</div>
                    <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 700, flexShrink: 0 }}>{p.cobrado > 0 ? fmtMoney(p.cobrado) : <span style={{ color: subColor }}>en gestión</span>}</div>
                  </div>
                  <div style={{ height: 5, background: darkMode ? "#1e293b" : "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.max((p.cobrado / maxCobrado) * 100, p.total > 0 ? 5 : 0)}%`, background: i === 0 ? "#eab308" : "#6366f1", borderRadius: 3, transition: "width .4s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: subColor, marginTop: 3 }}>{p.total} caso{p.total !== 1 ? "s" : ""}{p.activos > 0 ? ` · ${p.activos} activo${p.activos !== 1 ? "s" : ""}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: subColor, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Pipeline</div>
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "14px", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ESTADOS_CASO.map(e => { const cnt = allCasos.filter(c => c.estado === e.key).length; return <div key={e.key} style={{ flex: 1, minWidth: 70, background: cnt > 0 ? e.color + "18" : darkMode ? "#0a0f1e" : "#fff", border: `1px solid ${cnt > 0 ? e.color + "44" : cardBorder}`, borderRadius: 10, padding: "10px 6px", textAlign: "center" }}><div style={{ fontSize: 20, marginBottom: 4 }}>{e.emoji}</div><div style={{ fontSize: 22, fontWeight: 800, color: cnt > 0 ? e.color : "#334155" }}>{cnt}</div><div style={{ fontSize: 10, color: cnt > 0 ? e.color + "99" : "#334155", marginTop: 2, lineHeight: 1.2 }}>{e.label}</div></div>; })}
        </div>
      </div>

      {(recsPAS.length > 0 || recsCasos.length > 0) && (
        <div style={{ background: "#f9741611", border: "1px solid #f9741644", borderRadius: 12, padding: "14px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#f97316", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12, fontWeight: 700 }}>⏰ Recordatorios pendientes</div>
          {recsPAS.map(p => (
            <div key={p.id} style={{ background: darkMode ? "#0f172a" : "#fff", border: "1px solid #f9741633", borderRadius: 8, padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: textColor }}>{p.nombre}</div>
                <div style={{ fontSize: 11, color: subColor, marginTop: 2 }}>Contacto PAS · {fmtDate(recordatorios[p.id])}</div>
              </div>
              <Badge color="#f97316">{recordatorios[p.id] === hoyStr ? "Hoy" : "Vencido"}</Badge>
            </div>
          ))}
          {recsCasos.map(c => (
            <div key={c.id} style={{ background: darkMode ? "#0f172a" : "#fff", border: "1px solid #f9741633", borderRadius: 8, padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: textColor }}>{c.asegurado}</div>
                <div style={{ fontSize: 11, color: subColor, marginTop: 2 }}>Caso de {c.pasNombre} · {fmtDate(c.recordatorio)}</div>
              </div>
              <Badge color="#f97316">{c.recordatorio === hoyStr ? "Hoy" : "Vencido"}</Badge>
            </div>
          ))}
        </div>
      )}
      {recsPAS.length === 0 && recsCasos.length === 0 && (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14, color: subColor }}>Sin recordatorios pendientes por hoy</div>
        </div>
      )}
    </div>
  );
}