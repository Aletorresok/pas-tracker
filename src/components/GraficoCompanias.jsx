import { useState, useMemo } from "react";
import { cuadroCompania } from "../utils/analisis.js";
import { INSTANCIAS } from "../constants.js";

// Cuadro de una compañía: plazos, % cobrado, incumplimientos de pago y % ofrecido en cada instancia.
// Lo usan Análisis → Compañías y el portal del PAS. `ofertas` (historial, solo admin) afina el % por instancia.
export default function GraficoCompanias({ allCasos, ofertas, cardBg, cardBorder, textColor, subColor, mostrarCasos = true }) {
  const [selectedComp, setSelectedComp] = useState("");

  const companias = useMemo(() => {
    const porComp = {};
    allCasos.forEach(c => {
      const comp = c.compania_aseguradora;
      if (!comp) return;
      if (!porComp[comp]) porComp[comp] = [];
      porComp[comp].push(c);
    });
    // Solo las compañías con algún dato (alcanza un reclamo iniciado que espera el ofrecimiento)
    return Object.entries(porComp)
      .map(([nombre, casos]) => ({ nombre, total: casos.length, stats: (() => { try { return cuadroCompania(casos, ofertas); } catch { return null; } })() }))
      .filter(c => c.stats?.conDatos)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [allCasos, ofertas]);

  const activa = companias.find(c => c.nombre === selectedComp) || companias[0];
  const activeComp = activa?.nombre || "";
  const stats = activa?.stats || null;

  if (!companias.length) return null;

  const selectStyle = {
    background: "var(--card2)",
    border: `1px solid ${"var(--border)"}`,
    borderRadius: "var(--r-sm)",
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

  const inc = stats?.incumplimientos;
  const espera = stats?.sinOferta;
  // Reclamos que todavía esperan el ofrecimiento: si no hay ninguno respondido, el número es lo que ya llevan (+N días)
  const tileOferta = !stats ? null : stats.diasOferta.valor === null && espera.n
    ? { label: "Días hasta ofrecimiento · todavía sin ofrecer", valor: espera.dias, texto: `+${espera.dias} días`, casos: espera.n, sobre: "reclamo", color: "var(--info)" }
    : { label: "Días hasta ofrecimiento", valor: stats.diasOferta.valor, texto: `${stats.diasOferta.valor} días`, casos: stats.diasOferta.n, color: "var(--info)",
        nota: espera.n ? (mostrarCasos ? `${espera.n} sin ofrecer: llevan ${espera.dias} días` : `Hay reclamos esperando hace ${espera.dias} días`) : null };
  const barras = stats ? [
    tileOferta,
    { label: "Días hasta cobro", valor: stats.diasCobro.valor, texto: `${stats.diasCobro.valor} días`, casos: stats.diasCobro.n, color: "var(--accent)" },
    { label: "% cobro / reclamado", valor: stats.pctCobrado.valor, texto: `${stats.pctCobrado.valor}%`, casos: stats.pctCobrado.n, color: "var(--ok)" },
    // Pagos tarde o vencidos sin pagar, con la demora promedio. Sin pagos con fecha comprometida, no hay dato.
    inc.evaluados > 0 && {
      label: inc.cantidad ? `Incumplimientos · ${inc.demora} días de demora en promedio` : "Incumplimientos de pago",
      valor: inc.cantidad, texto: String(inc.cantidad), casos: inc.evaluados, sobre: "pago",
      color: inc.cantidad ? "var(--bad)" : "var(--ok)",
    },
    // % ofrecido en cada instancia: solo las instancias en que esta compañía ofreció
    ...INSTANCIAS.filter(i => stats.instancias[i.key].n > 0).map(i => ({
      label: `% ofrecido en ${i.key === "administrativa" ? "instancia administrativa" : i.label.toLowerCase()}`,
      valor: stats.instancias[i.key].valor, texto: `${stats.instancias[i.key].valor}%`, casos: stats.instancias[i.key].n, color: "var(--warn)",
    })),
  ].filter(Boolean) : [];

  const tipos = stats && [stats.concurrencias && `${stats.concurrencias} ${stats.concurrencias === 1 ? "concurrencia" : "concurrencias"}`, stats.franquicias && `${stats.franquicias} ${stats.franquicias === 1 ? "franquicia" : "franquicias"}`].filter(Boolean);

  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: "var(--r-md)", padding: "18px", marginBottom: 20 }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700, color: textColor }}>Estadísticas por compañía</h2>

      <select value={activeComp} onChange={e => setSelectedComp(e.target.value)} style={selectStyle}>
        {companias.map(c => (
          <option key={c.nombre} value={c.nombre}>
            {c.nombre}{mostrarCasos ? ` (${c.total} casos)` : ""}
          </option>
        ))}
      </select>
      {mostrarCasos && stats && (
        <div style={{ fontSize: 12, color: subColor, marginTop: 6 }}>
          {stats.total} {stats.total === 1 ? "caso" : "casos"}{tipos.length ? ` · ${tipos.join(" · ")}` : ""}
        </div>
      )}

      {stats && (barras.every(b => b.valor === null) ? (
        <div style={{ fontSize: 13, color: subColor, padding: "16px 0 4px" }}>
          Todavía no hay fechas suficientes de esta compañía para calcular plazos.
        </div>
      ) : (
        // Números independientes (días, % y cantidades), no un gráfico: tienen escalas distintas
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 14 }}>
          {barras.map(b => (
            <div key={b.label} style={{ borderTop: `3px solid ${b.valor !== null ? b.color : "var(--border)"}`, paddingTop: 8 }}>
              <div className="num" style={{ fontSize: 24, fontWeight: 700, color: textColor, lineHeight: 1.1 }}>
                {b.valor !== null ? b.texto : "—"}
              </div>
              <div style={{ fontSize: 12, color: subColor, marginTop: 4, lineHeight: 1.3 }}>{b.label}</div>
              {mostrarCasos && b.valor !== null && <div style={{ fontSize: 11, color: subColor, marginTop: 2 }}>sobre {b.casos} {b.sobre || "caso"}{b.casos !== 1 ? "s" : ""}</div>}
              {b.nota && <div style={{ fontSize: 11, color: "var(--warn)", marginTop: 2 }}>{b.nota}</div>}
            </div>
          ))}
        </div>
      ))}
      <div style={{ fontSize: 11, color: subColor, marginTop: 12, lineHeight: 1.4 }}>
        {mostrarCasos
          ? "Promedios. Las concurrencias se miden sobre la parte de culpa del tercero; las franquicias no entran en los %, porque se pagan enteras. Solo aparecen las compañías con algún dato."
          : "Promedios con los casos del estudio: te sirven para decirle a tu cliente cuánto suele tardar cada compañía."}
      </div>
    </div>
  );
}
