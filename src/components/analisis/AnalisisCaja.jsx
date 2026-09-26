import { useMemo, useState } from "react";
import TablaAnalisis, { card, tono, Nota } from "./TablaAnalisis.jsx";
import EstadoPill from "../ui/EstadoPill.jsx";
import HonorariosPorMes from "./HonorariosPorMes.jsx";
import { flujoCaja, DIAS_FACTURA } from "../../utils/analisis.js";
import { fmtMoney, fmtDate } from "../../utils/formatters.js";
import { ESTADOS_CASO } from "../../constants.js";

const COLOR_TRAMO = { vencido: "var(--bad)", d30: tono(95), d60: tono(75), d90: tono(55), mas: tono(35), sin_fecha: "var(--border2)" };

// Análisis → Flujo de caja: honorarios que faltan cobrar, agrupados por cuándo deberían entrar
export default function AnalisisCaja({ allCasos, onAbrirCaso }) {
  const { items, tramos } = useMemo(() => flujoCaja(allCasos), [allCasos]);
  const [filtro, setFiltro] = useState(null);

  const t = Object.fromEntries(tramos.map(x => [x.key, x]));
  const a30 = t.d30, a60 = { neto: a30.neto + t.d60.neto, casos: a30.casos + t.d60.casos }, a90 = { neto: a60.neto + t.d90.neto, casos: a60.casos + t.d90.casos };
  const maxNeto = Math.max(...tramos.map(x => x.neto), 1);
  const visibles = filtro ? items.filter(i => i.tramo === filtro) : items;

  const casos = n => `${n} ${n === 1 ? "caso" : "casos"}`;
  const kpis = [
    { l: "Próximos 30 días", v: fmtMoney(a30.neto), s: casos(a30.casos) },
    { l: "Próximos 60 días", v: fmtMoney(a60.neto), s: `${casos(a60.casos)} · acumulado` },
    { l: "Próximos 90 días", v: fmtMoney(a90.neto), s: `${casos(a90.casos)} · acumulado` },
    { l: "Vencido sin cobrar", v: fmtMoney(t.vencido.neto), s: `${t.vencido.casos} ${t.vencido.casos === 1 ? "caso" : "casos"} para reclamar`, alerta: t.vencido.casos > 0 },
  ];

  return (
    <>
      <section className="kpis" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {kpis.map(x => (
          <div key={x.l} style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: 12, color: "var(--sub)" }}>{x.l}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 2, color: x.alerta ? "var(--bad)" : undefined }}>{x.v}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{x.s}</div>
          </div>
        ))}
      </section>

      <HonorariosPorMes allCasos={allCasos} onAbrirCaso={onAbrirCaso} />

      <section style={{ ...card, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Honorarios por cobrar</h2>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>neto de comisión · tocá un tramo para ver sus casos</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${tramos.length}, minmax(0, 1fr))`, gap: 8, alignItems: "end" }}>
          {tramos.map(x => {
            const activo = filtro === x.key;
            const alto = x.neto > 0 ? Math.max(4, Math.round((x.neto / maxNeto) * 110)) : 0;
            return (
              <button key={x.key} type="button" onClick={() => setFiltro(activo ? null : x.key)} aria-pressed={activo}
                title={`${x.label}: ${x.casos} casos · ${fmtMoney(x.neto)} neto (comisión PAS ${fmtMoney(x.comision)})`}
                style={{ display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-end", gap: 6, height: 176, padding: "0 4px", background: "none", border: "none", cursor: "pointer", font: "inherit", color: "var(--text)", opacity: filtro && !activo ? 0.45 : 1 }}>
                <span className="num" style={{ fontSize: 12, fontWeight: 600, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.neto ? fmtMoney(x.neto) : ""}</span>
                <span style={{ height: alto, margin: "0 auto", width: "min(100%, 56px)", borderRadius: "4px 4px 0 0", background: COLOR_TRAMO[x.key] }} />
                <span style={{ borderTop: "1px solid var(--border)", paddingTop: 6, fontSize: 12, textAlign: "center", color: activo ? "var(--text)" : "var(--sub)", fontWeight: activo ? 700 : 400, lineHeight: 1.3 }}>
                  {x.label}<span className="num" style={{ display: "block", fontSize: 11, color: "var(--muted)" }}>{x.casos} {x.casos === 1 ? "caso" : "casos"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {filtro ? tramos.find(x => x.key === filtro)?.label : "Todos"} <span className="num" style={{ fontSize: 13, color: "var(--muted)", fontWeight: 400 }}>{visibles.length}</span>
          </h2>
          {filtro && <button type="button" onClick={() => setFiltro(null)} style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}>Ver todos</button>}
        </div>
        <TablaAnalisis clave={f => f.caso.id} filas={visibles} ordenInicial={{ k: "fecha", desc: false }} minWidth={860} onFila={f => onAbrirCaso(f.caso)}
          vacio="No hay honorarios pendientes en este tramo." columnas={[
            { k: "asegurado", l: "Asegurado", ancho: "17%", valor: f => (f.caso.asegurado || "").toLowerCase(), celda: f => <b style={{ fontWeight: 600 }}>{f.caso.asegurado || "Sin nombre"}</b> },
            { k: "compania", l: "Compañía", ancho: "14%", valor: f => (f.caso.compania_aseguradora || "").toLowerCase(), celda: f => f.caso.compania_aseguradora || "—" },
            { k: "estado", l: "Estado", ancho: "16%", valor: f => ESTADOS_CASO.findIndex(e => e.key === f.caso.estado), celda: f => <EstadoPill estado={f.caso.estado} size="sm" /> },
            { k: "fecha", l: "Estimado", ancho: "20%", celda: f => f.fecha
              ? <span className="num">{fmtDate(f.fecha)} <span style={{ fontSize: 12, color: f.dias < 0 ? "var(--bad)" : "var(--muted)", fontWeight: f.dias < 0 ? 600 : 400 }}>{f.dias < 0 ? `hace ${-f.dias} d` : `en ${f.dias} d`}</span></span>
              : <span style={{ color: "var(--muted)" }}>—</span> },
            { k: "segun", l: "Según", ancho: "13%", valor: f => f.segun, celda: f => <span style={{ fontSize: 13, color: "var(--sub)" }}>{f.segun || "—"}</span> },
            { k: "comision", l: "Comisión PAS", ancho: "10%", derecha: true, celda: f => f.comision ? <span className="num" style={{ color: "var(--sub)" }}>{fmtMoney(f.comision)}</span> : <span style={{ color: "var(--muted)" }}>—</span> },
            { k: "neto", l: "Mi neto", ancho: "10%", derecha: true, celda: f => <b className="num">{fmtMoney(f.neto)}</b> },
          ]} />
        <Nota>
          Entran los casos no desistidos con "Mis honorarios" cargado y sin cobrar. La fecha estimada sale de: firma + plazo de pago; si no, la fecha de pago; si no, factura + {DIAS_FACTURA} días (si está facturado).
          "Sin fecha" = hay monto pero no hay con qué estimar cuándo entra.
        </Nota>
      </section>
    </>
  );
}
