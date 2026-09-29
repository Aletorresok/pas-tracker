import { useMemo, useState } from "react";
import TablaAnalisis from "../analisis/TablaAnalisis.jsx";
import { fmtMoney, fmtDate } from "../../utils/formatters.js";
import { resultadoDeCaso, categoria, recuperarDe } from "../../utils/finanzas.js";
import { honorariosCobrados } from "../../utils/metricas.js";

const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "12px 16px" };
const num = v => <span className="num">{v}</span>;

// Finanzas → Rentabilidad: lo que te dejó cada compañía y cada PAS en los casos con honorarios cobrados
// (honorarios − comisión − gastos del caso + lo recuperado) y los gastos que todavía hay que recuperar.
export default function Rentabilidad({ allCasos, gastos, onAbrirCaso }) {
  const [por, setPor] = useState("compania");

  const porCaso = useMemo(() => {
    const m = new Map();
    (gastos || []).forEach(g => { if (g.caso_id) m.set(g.caso_id, [...(m.get(g.caso_id) || []), g]); });
    return m;
  }, [gastos]);

  const filas = useMemo(() => {
    const grupos = new Map();
    allCasos.filter(c => c.estado !== "desistido" && honorariosCobrados(c)).forEach(c => {
      const clave = por === "compania" ? (c.compania_aseguradora || "Sin compañía") : (c._pasNombre || "PAS desconocido");
      const r = resultadoDeCaso(c, porCaso.get(c.id) || []);
      const g = grupos.get(clave) || { nombre: clave, casos: 0, honorarios: 0, comision: 0, gastos: 0, neto: 0, dias: [] };
      g.casos++; g.honorarios += r.honorarios; g.comision += r.comision; g.gastos += r.gastos - r.recuperado; g.neto += r.neto;
      if (r.dias !== null && r.dias >= 0) g.dias.push(r.dias);
      grupos.set(clave, g);
    });
    return [...grupos.values()].map(g => ({ ...g, promedio: g.neto / g.casos, diasProm: g.dias.length ? Math.round(g.dias.reduce((s, d) => s + d, 0) / g.dias.length) : null,
      porMes: g.dias.length ? g.neto / g.casos / Math.max(1, (g.dias.reduce((s, d) => s + d, 0) / g.dias.length) / 30) : null }));
  }, [allCasos, porCaso, por]);

  const porRecuperar = useMemo(() => {
    const casos = Object.fromEntries(allCasos.map(c => [c.id, c]));
    return (gastos || []).filter(g => g.recuperable && !g.recuperado_en).map(g => ({ g, caso: g.caso_id ? casos[g.caso_id] : null }))
      .sort((a, b) => String(a.g.fecha).localeCompare(String(b.g.fecha)));
  }, [gastos, allCasos]);
  const totalRecuperar = porRecuperar.reduce((s, x) => s + (Number(x.g.monto) || 0), 0);

  const columnas = [
    { k: "nombre", l: por === "compania" ? "Compañía" : "PAS", ancho: "18%", valor: f => f.nombre.toLowerCase(), celda: f => <b style={{ fontWeight: 600 }}>{f.nombre}</b> },
    { k: "casos", l: "Casos", ancho: "7%", derecha: true, ayuda: "Casos con tus honorarios cobrados", celda: f => num(f.casos) },
    { k: "honorarios", l: "Honorarios", ancho: "12%", derecha: true, celda: f => num(fmtMoney(f.honorarios)) },
    { k: "comision", l: "Comisiones", ancho: "11%", derecha: true, celda: f => num(fmtMoney(f.comision)) },
    { k: "gastos", l: "Gastos", ancho: "10%", derecha: true, ayuda: "Gastos cargados a esos casos, menos lo ya recuperado", celda: f => num(fmtMoney(f.gastos)) },
    { k: "neto", l: "Neto", ancho: "12%", derecha: true, celda: f => <b className="num" style={{ color: f.neto >= 0 ? "var(--ok)" : "var(--bad)" }}>{fmtMoney(f.neto)}</b> },
    { k: "promedio", l: "Por caso", ancho: "11%", derecha: true, ayuda: "Neto promedio por caso", celda: f => num(fmtMoney(Math.round(f.promedio))) },
    { k: "diasProm", l: "Días a cobro", ancho: "9%", derecha: true, ayuda: "Promedio desde la derivación hasta que cobraste tus honorarios", valor: f => f.diasProm ?? 99999, celda: f => f.diasProm == null ? "—" : num(`${f.diasProm} d`) },
    { k: "porMes", l: "Por mes", ancho: "10%", derecha: true, ayuda: "Neto por caso dividido los meses que tardó en cobrarse: sirve para comparar compañías que pagan rápido con las que pagan más pero tarde", valor: f => f.porMes ?? -1, celda: f => f.porMes == null ? "—" : num(fmtMoney(Math.round(f.porMes))) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Lo que te deja cada {por === "compania" ? "compañía" : "PAS"}</h2>
          <span role="group" aria-label="Agrupar por" className="segmentado">
            {[["compania", "Por compañía"], ["pas", "Por PAS"]].map(([k, l]) => <button key={k} type="button" aria-pressed={por === k} onClick={() => setPor(k)}>{l}</button>)}
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Casos con tus honorarios cobrados. Neto = honorarios − comisión del PAS − gastos del caso (los gastos se cargan en Mes → Gastos o en la ficha → Montos).</div>
        <TablaAnalisis columnas={columnas} filas={filas} ordenInicial={{ k: "neto", desc: true }} clave={f => f.nombre} minWidth={1060} vacio="Todavía no hay casos con honorarios cobrados." />
      </section>

      <section style={tarjeta}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Gastos por recuperar</h2>
          {totalRecuperar > 0 && <b className="num" style={{ color: "var(--warn)" }}>{fmtMoney(totalRecuperar)}</b>}
        </div>
        {!porRecuperar.length && <div style={{ fontSize: 13, color: "var(--muted)", paddingTop: 8 }}>Nada pendiente. Al cargar un gasto, tildá "Se recupera" si después lo paga el cliente, la compañía o sale en costas.</div>}
        {porRecuperar.map(({ g, caso }) => (
          <button key={g.id} type="button" onClick={() => caso && onAbrirCaso(caso, "montos")} disabled={!caso}
            style={{ display: "flex", width: "100%", gap: 10, alignItems: "center", padding: "10px 0", background: "none", border: "none", borderTop: "1px solid var(--border)", font: "inherit", color: "var(--text)", cursor: caso ? "pointer" : "default", textAlign: "left" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 600, overflowWrap: "anywhere" }}>{g.descripcion || categoria(g.categoria).l}{caso ? ` · ${caso.asegurado || "Sin nombre"}` : ""}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{fmtDate(g.fecha)} · {recuperarDe(g.recuperar_de).toLowerCase() || "a recuperar"}</span>
            </span>
            <b className="num" style={{ fontSize: 14, whiteSpace: "nowrap" }}>{fmtMoney(Number(g.monto))}</b>
          </button>
        ))}
      </section>
    </div>
  );
}
