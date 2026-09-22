import { useState, useMemo } from "react";
import { alpha } from "../utils/theme.js";

export default function GraficoCompanias({ allCasos, darkMode, cardBg, cardBorder, textColor, subColor, mostrarCasos = true }) {
  const [selectedComp, setSelectedComp] = useState("");

  const companias = useMemo(() => {
    const porComp = {};
    allCasos.forEach(c => {
      const comp = c.compania_aseguradora;
      if (!comp) return;
      if (!porComp[comp]) porComp[comp] = [];
      porComp[comp].push(c);
    });
    return Object.entries(porComp)
      .map(([nombre, casos]) => ({ nombre, casos, total: casos.length }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [allCasos]);

  const activeComp = selectedComp || (companias.length ? companias[0].nombre : "");

  const stats = useMemo(() => {
    try {
      const comp = companias.find(c => c.nombre === activeComp);
      if (!comp) return null;
      const diff = (a, b) => { if (!a || !b) return null; const d = Math.floor((new Date(String(b)).getTime() - new Date(String(a)).getTime()) / 86400000); return isFinite(d) ? d : null; };
      const validos1 = comp.casos.filter(c => c.fecha_inicio_reclamo && c.fecha_ofrecimiento).map(c => diff(c.fecha_inicio_reclamo, c.fecha_ofrecimiento)).filter(d => d !== null && d >= 0 && d <= 730);
      const validos2 = comp.casos.filter(c => c.fecha_inicio_reclamo && c.fecha_cobro).map(c => diff(c.fecha_inicio_reclamo, c.fecha_cobro)).filter(d => d !== null && d >= 0 && d <= 730);
      const validos3 = comp.casos.filter(c => Number(c.monto_cobro_asegurado) > 0 && Number(c.monto_reclamado) > 0).map(c => (Number(c.monto_cobro_asegurado) / Number(c.monto_reclamado)) * 100).filter(v => isFinite(v));
      return {
        diasOfrecimiento: validos1.length ? Math.round(validos1.reduce((s, x) => s + x, 0) / validos1.length) : null,
        diasOfrecimientoCasos: validos1.length,
        diasCobro: validos2.length ? Math.round(validos2.reduce((s, x) => s + x, 0) / validos2.length) : null,
        diasCobroCasos: validos2.length,
        pctCobro: validos3.length ? Math.round(validos3.reduce((s, x) => s + x, 0) / validos3.length) : null,
        pctCobroCasos: validos3.length,
        totalCasos: comp.total,
      };
    } catch { return null; }
  }, [activeComp, companias]);

  if (!companias.length) return null;

  const selectStyle = {
    background: "var(--card2)",
    border: `1px solid ${"var(--border)"}`,
    borderRadius: 10,
    color: "var(--text)",
    padding: "9px 14px",
    fontSize: 13,
    fontWeight: 600,
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
    cursor: "pointer",
  };

  const maxBarHeight = 180;
  const maxDias = stats ? Math.max(stats.diasOfrecimiento || 0, stats.diasCobro || 0, 1) : 1;

  const barras = stats ? [
    { label: "Días hasta ofrecimiento", valor: stats.diasOfrecimiento, casos: stats.diasOfrecimientoCasos, color: "var(--info)", suffix: "d", max: maxDias },
    { label: "Días hasta cobro", valor: stats.diasCobro, casos: stats.diasCobroCasos, color: "var(--accent)", suffix: "d", max: maxDias },
    { label: "% cobro / reclamado", valor: stats.pctCobro, casos: stats.pctCobroCasos, color: "var(--ok)", suffix: "%", max: 100 },
  ] : [];

  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "18px", marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: subColor, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Plazos por compañía</div>

      <select value={activeComp} onChange={e => setSelectedComp(e.target.value)} style={selectStyle}>
        {companias.map(c => (
          <option key={c.nombre} value={c.nombre}>
            {c.nombre}{mostrarCasos ? ` (${c.total} casos)` : ""}
          </option>
        ))}
      </select>

      {stats && (
        <>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, alignItems: "flex-end", height: maxBarHeight + 40, padding: "0 10px", marginTop: 18 }}>
            {barras.map(b => {
              const pct = b.valor !== null ? Math.max((b.valor / b.max) * 100, 5) : 0;
              return (
                <div key={b.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, maxWidth: 100 }}>
                  {b.valor !== null ? (
                    <div style={{ fontSize: 22, fontWeight: 900, color: b.color, lineHeight: 1 }}>{b.valor}{b.suffix}</div>
                  ) : (
                    <div style={{ fontSize: 13, color: subColor }}>—</div>
                  )}
                  {mostrarCasos && <div style={{ fontSize: 11, color: subColor }}>{b.casos} caso{b.casos !== 1 ? "s" : ""}</div>}
                  <div style={{ width: "100%", height: maxBarHeight, background: "var(--border)", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <div style={{ width: "100%", height: `${pct}%`, background: `linear-gradient(180deg, ${b.color}, ${alpha(b.color, 53)})`, borderRadius: "8px 8px 0 0", transition: "height .4s ease", minHeight: b.valor !== null ? 4 : 0 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8, padding: "0 10px" }}>
            {barras.map(b => (
              <div key={b.label} style={{ flex: 1, maxWidth: 100, textAlign: "center", fontSize: 11, color: subColor, lineHeight: 1.3 }}>{b.label}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
