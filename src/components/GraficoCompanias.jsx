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
      <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700, color: textColor }}>Plazos por compañía</h2>

      <select value={activeComp} onChange={e => setSelectedComp(e.target.value)} style={selectStyle}>
        {companias.map(c => (
          <option key={c.nombre} value={c.nombre}>
            {c.nombre}{mostrarCasos ? ` (${c.total} casos)` : ""}
          </option>
        ))}
      </select>

      {stats && (barras.every(b => b.valor === null) ? (
        <div style={{ fontSize: 13, color: subColor, padding: "16px 0 4px" }}>
          Todavía no hay fechas suficientes de esta compañía para calcular plazos.
        </div>
      ) : (
        // Tres números independientes (días y %), no un gráfico: tienen escalas distintas
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 14 }}>
          {barras.map(b => (
            <div key={b.label} style={{ borderTop: `3px solid ${b.valor !== null ? b.color : "var(--border)"}`, paddingTop: 8 }}>
              <div className="num" style={{ fontSize: 24, fontWeight: 700, color: textColor, lineHeight: 1.1 }}>
                {b.valor !== null ? `${b.valor}${b.suffix === "d" ? " días" : "%"}` : "—"}
              </div>
              <div style={{ fontSize: 12, color: subColor, marginTop: 4, lineHeight: 1.3 }}>{b.label}</div>
              {mostrarCasos && b.valor !== null && <div style={{ fontSize: 11, color: subColor, marginTop: 2 }}>sobre {b.casos} caso{b.casos !== 1 ? "s" : ""}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
