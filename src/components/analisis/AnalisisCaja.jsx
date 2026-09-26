import { useMemo, useState } from "react";
import TablaAnalisis, { card, tono, Nota } from "./TablaAnalisis.jsx";
import EstadoPill from "../ui/EstadoPill.jsx";
import HonorariosPorMes from "./HonorariosPorMes.jsx";
import { flujoCaja, DIAS_FACTURA, proyeccion } from "../../utils/analisis.js";
import { fmtMoney, fmtDate } from "../../utils/formatters.js";
import { ESTADOS_CASO } from "../../constants.js";

const COLOR_TRAMO = { vencido: "var(--bad)", d30: tono(95), d60: tono(75), d90: tono(55), mas: tono(35), sin_fecha: "var(--border2)" };

// Análisis → Flujo de caja: honorarios que faltan cobrar, agrupados por cuándo deberían entrar
export default function AnalisisCaja({ allCasos, onAbrirCaso, companias }) {
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
          Entran los casos no desistidos con "Mis honorarios" cargado y sin cobrar. La fecha estimada sale de: firma + plazo de pago; si no hay firma, aceptación + plazo; si no, la fecha de pago; si no, factura + {DIAS_FACTURA} días (si está facturado).
          "Sin fecha" = hay monto pero no hay con qué estimar cuándo entra.
        </Nota>
      </section>

      <Proyeccion allCasos={allCasos} companias={companias} onAbrirCaso={onAbrirCaso} />
    </>
  );
}

// Proyección "si todo sale bien": aparte de lo cobrado y de lo que ya tiene fecha. Es un estimado.
function Proyeccion({ allCasos, companias, onAbrirCaso }) {
  const p = useMemo(() => proyeccion(allCasos, companias || {}), [allCasos, companias]);
  const [ver, setVer] = useState(false);
  const max = Math.max(...p.meses.map(m => m.neto), 1);
  return (
    <section style={{ border: "1.5px dashed var(--border2)", borderRadius: 12, padding: "14px 16px", background: "color-mix(in srgb, var(--card2) 50%, transparent)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--warn)", border: "1px solid var(--warn)", borderRadius: 4, padding: "1px 6px" }}>ESTIMADO</span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Si todos los casos en curso salen bien</h2>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--sub)", lineHeight: 1.5 }}>
        No es plata comprometida ni se suma a lo cobrado: supone que <b>todos</b> los casos en curso se cobran, al porcentaje que suele pagar cada compañía, con su % de honorarios y en el plazo habitual.
      </p>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 12 }}>
        <div><div style={{ fontSize: 12, color: "var(--sub)" }}>Tus honorarios netos posibles</div><div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{fmtMoney(p.total)}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{p.items.length} casos en curso</div></div>
        {p.esperable !== null && <div><div style={{ fontSize: 12, color: "var(--sub)" }}>Con tu tasa de cobro ({p.tasaCobro}% de los cerrados)</div><div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--sub)" }}>{fmtMoney(p.esperable)}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>más realista</div></div>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${p.meses.length}, minmax(0, 1fr))`, gap: 6, alignItems: "end", height: 150, marginBottom: 6 }}>
        {p.meses.map(m => (
          <div key={m.key} title={`${m.mes}: ${fmtMoney(m.neto)} · ${m.casos} casos`} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 4, height: "100%" }}>
            <span className="num" style={{ fontSize: 11, color: "var(--sub)", whiteSpace: "nowrap" }}>{m.neto ? fmtMoney(m.neto) : ""}</span>
            <span style={{ width: "min(100%, 48px)", height: m.neto ? Math.max(4, Math.round((m.neto / max) * 100)) : 0, borderRadius: "4px 4px 0 0", background: "repeating-linear-gradient(45deg, var(--border2), var(--border2) 4px, transparent 4px, transparent 8px)", border: "1px solid var(--border2)" }} />
            <span style={{ fontSize: 12, color: "var(--sub)", textTransform: "capitalize" }}>{m.mes}<span className="num" style={{ display: "block", fontSize: 11, color: "var(--muted)", textAlign: "center" }}>{m.casos}</span></span>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setVer(v => !v)} style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}>{ver ? "Ocultar casos" : "Ver cómo se calculó cada caso"}</button>
      {ver && (
        <div style={{ marginTop: 8 }}>
          <TablaAnalisis clave={f => f.caso.id} filas={p.items} ordenInicial={{ k: "fecha", desc: false }} minWidth={900} onFila={f => onAbrirCaso(f.caso)} columnas={[
            { k: "asegurado", l: "Asegurado", ancho: "18%", valor: f => (f.caso.asegurado || "").toLowerCase(), celda: f => <b style={{ fontWeight: 600 }}>{f.caso.asegurado || "Sin nombre"}</b> },
            { k: "compania", l: "Compañía", ancho: "13%", valor: f => (f.caso.compania_aseguradora || "").toLowerCase(), celda: f => f.caso.compania_aseguradora || "—" },
            { k: "indem", l: "Indemnización", ancho: "17%", derecha: true, celda: f => <span className="num">{fmtMoney(f.indem)} <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>{f.baseTxt}</span></span> },
            { k: "honor", l: "Honorarios", ancho: "14%", derecha: true, celda: f => <span className="num">{fmtMoney(f.honor)} <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>{f.honTxt}</span></span> },
            { k: "comision", l: "Comisión PAS", ancho: "12%", derecha: true, celda: f => <span className="num" style={{ color: "var(--sub)" }}>{f.comision ? `−${fmtMoney(f.comision)}` : "—"}</span> },
            { k: "neto", l: "Neto", ancho: "12%", derecha: true, celda: f => <b className="num">{fmtMoney(f.neto)}</b> },
            { k: "fecha", l: "Cuándo", ancho: "14%", celda: f => <span className="num">{fmtDate(f.fecha)} <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>{f.cuandoTxt}</span></span> },
          ]} />
        </div>
      )}
      <Nota>
        Indemnización: lo acordado; si no hay acuerdo, lo reclamado por el % que suele cobrarse con esa compañía. Honorarios: los cargados; si no, el % de la compañía (Análisis → Compañías) o el de tus casos. Comisión: la cargada o la proporción habitual. Cuándo: la fecha de pago comprometida o lo que suele tardar esa compañía desde la derivación; lo atrasado va al mes actual.
        {p.sinDatos > 0 && ` Quedan afuera ${p.sinDatos} ${p.sinDatos === 1 ? "caso" : "casos"} sin monto reclamado ni acuerdo.`}
      </Nota>
    </section>
  );
}
