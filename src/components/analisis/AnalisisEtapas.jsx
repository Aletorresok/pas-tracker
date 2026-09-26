import { useMemo } from "react";
import TablaAnalisis, { card, tono, ConMuestra, Barrita, Nota } from "./TablaAnalisis.jsx";
import EstadoPill from "../ui/EstadoPill.jsx";
import { embudo, tiempoEnEstado, mediana, pct, ETAPAS, duracionPorEstado, diasEntre, fechaAcuerdo } from "../../utils/analisis.js";
import { QUIEN, quienTiene, tiempoPorQuien } from "../../utils/pelota.js";
import { ESTADOS_CASO } from "../../constants.js";

// Análisis → Etapas: cuántos casos llegan a cada etapa, cuánto tardan entre una y otra y dónde se traban
export default function AnalisisEtapas({ allCasos, onAbrirCaso, cambios = {} }) {
  const { etapas, caidas, desistidos } = useMemo(() => embudo(allCasos), [allCasos]);
  const activos = useMemo(() => tiempoEnEstado(allCasos, new Date(), cambios), [allCasos, cambios]);
  const exactos = activos.filter(a => a.exacto).length;
  const duraciones = useMemo(() => duracionPorEstado(cambios), [cambios]);
  const filasDuracion = ESTADOS_CASO.filter(e => duraciones[e.key]).map(e => ({ key: e.key, label: e.label, ...duraciones[e.key] }));
  const maxDuracion = Math.max(...filasDuracion.map(f => f.valor || 0), 1);
  const total = allCasos.length;

  const porEstado = ESTADOS_CASO.map(e => {
    const del = activos.filter(a => a.caso.estado === e.key);
    const ds = del.map(a => a.dias).filter(d => d !== null);
    return { key: e.key, label: e.label, casos: del.length, mediana: mediana(ds), max: ds.length ? Math.max(...ds) : null, conFecha: ds.length, sinFecha: del.length - ds.length };
  }).filter(e => e.casos > 0);
  const maxMediana = Math.max(...porEstado.map(e => e.mediana || 0), 1);

  const demorados = activos.filter(a => a.dias !== null).sort((a, b) => b.dias - a.dias).slice(0, 10);
  const maxDemora = Math.max(...demorados.map(d => d.dias), 1);

  return (
    <>
      <SeccionPelota allCasos={allCasos} cambios={cambios} />

      <section style={{ ...card, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Embudo</h2>
          <span className="num" style={{ fontSize: 13, color: "var(--muted)" }}>{total} casos</span>
        </div>
        {etapas.map((e, i) => {
          const conversion = i ? pct(e.llegaron, etapas[i - 1].llegaron) : null;
          return (
            <div key={e.key}>
              {i > 0 && (
                <div className="num" style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "var(--muted)", padding: "3px 0 3px min(33%, 176px)" }}>
                  <span>{conversion ?? "—"}% pasa</span>
                  <span>·</span>
                  <span>tarda <ConMuestra valor={e.tiempo.valor} n={e.tiempo.n} sufijo=" d" /></span>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "min(33%, 166px) minmax(0, 1fr) 84px", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "var(--sub)", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.label}</span>
                <div style={{ height: 14, background: "var(--card2)", borderRadius: 4, overflow: "hidden" }} title={`${e.label}: ${e.llegaron} de ${total}`}>
                  <div style={{ width: `${total ? Math.max(2, (e.llegaron / total) * 100) : 0}%`, height: "100%", borderRadius: 4, background: tono(35 + Math.round((i / (etapas.length - 1)) * 60)) }} />
                </div>
                <span className="num" style={{ fontSize: 13 }}><b>{e.llegaron}</b> <span style={{ color: "var(--muted)" }}>{pct(e.llegaron, total) ?? 0}%</span></span>
              </div>
            </div>
          );
        })}
        {desistidos > 0 && (
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--sub)" }}>
            <b className="num" style={{ color: "var(--text)" }}>{desistidos}</b> desistidos. Última etapa a la que llegaron: {ETAPAS.filter(e => caidas[e.key]).map(e => `${e.label} (${caidas[e.key]})`).join(" · ")}.
          </div>
        )}
        <Nota>
          Un caso "llegó" a una etapa si tiene su fecha cargada o si su estado ya es posterior. "Tarda" es la mediana de días desde la etapa anterior, con los casos que tienen las dos fechas (al lado, cuántos son).
        </Nota>
      </section>

      <section>
        <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Tiempo en el estado actual</h2>
        <TablaAnalisis clave={f => f.key} filas={porEstado} ordenInicial={{ k: "mediana", desc: true }} minWidth={560} vacio="No hay casos en curso." columnas={[
          { k: "label", l: "Estado", ancho: "34%", valor: f => ESTADOS_CASO.findIndex(e => e.key === f.key), celda: f => <EstadoPill estado={f.key} /> },
          { k: "casos", l: "Casos", ancho: "12%", derecha: true, celda: f => <span className="num">{f.casos}</span> },
          { k: "mediana", l: "Mediana", ancho: "20%", derecha: true, celda: f => <><ConMuestra valor={f.mediana} n={f.conFecha} sufijo=" d" /><Barrita valor={f.mediana} max={maxMediana} /></> },
          { k: "max", l: "Máximo", ancho: "16%", derecha: true, celda: f => f.max === null ? <span style={{ color: "var(--muted)" }}>—</span> : <span className="num">{f.max} d</span> },
          { k: "sinFecha", l: "Sin fecha", ancho: "18%", derecha: true, ayuda: "Casos en este estado sin la fecha que indica cuándo entraron",
            celda: f => <span className="num" style={{ color: f.sinFecha ? "var(--warn)" : "var(--muted)", fontWeight: f.sinFecha ? 600 : 400 }}>{f.sinFecha}</span> },
        ]} />
        <Nota>
          Desde el 25/09/2026 cada cambio de estado queda registrado en la bitácora: para esos casos la entrada al estado es exacta ({exactos} de {activos.length} hoy). Para el resto se toma la fecha del expediente que corresponde (Reclamado desde el último reclamo, Con ofrecimiento desde la reconsideración u ofrecimiento, Esperando pago desde la aceptación o firma, etc.). Los "sin fecha" no entran en la cuenta.
        </Nota>
      </section>

      <section>
        <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Cuánto dura cada estado</h2>
        <TablaAnalisis clave={f => f.key} filas={filasDuracion} ordenInicial={{ k: "valor", desc: true }} minWidth={420}
          vacio="Todavía no hay datos: se arma solo a medida que cambies de estado los casos (desde el 25/09/2026)."
          columnas={[
            { k: "label", l: "Estado", ancho: "45%", valor: f => ESTADOS_CASO.findIndex(e => e.key === f.key), celda: f => <EstadoPill estado={f.key} /> },
            { k: "valor", l: "Mediana", ancho: "35%", derecha: true, celda: f => <><ConMuestra valor={f.valor} n={f.n} sufijo=" d" /><Barrita valor={f.valor} max={maxDuracion} /></> },
            { k: "n", l: "Casos", ancho: "20%", derecha: true, celda: f => <span className="num">{f.n}</span> },
          ]} />
        <Nota>Días entre que el caso entró a cada estado y pasó al siguiente, solo con cambios registrados. Es el dato exacto; al principio va a tener pocos casos.</Nota>
      </section>

      {demorados.length > 0 && (
        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Los más demorados</h2>
          <TablaAnalisis clave={f => f.caso.id} filas={demorados} ordenInicial={{ k: "dias", desc: true }} minWidth={620} onFila={f => onAbrirCaso(f.caso)} columnas={[
            { k: "asegurado", l: "Asegurado", ancho: "30%", valor: f => (f.caso.asegurado || "").toLowerCase(), celda: f => <b style={{ fontWeight: 600 }}>{f.caso.asegurado || "Sin nombre"}</b> },
            { k: "compania", l: "Compañía", ancho: "22%", valor: f => (f.caso.compania_aseguradora || "").toLowerCase(), celda: f => f.caso.compania_aseguradora || "—" },
            { k: "estado", l: "Estado", ancho: "26%", valor: f => ESTADOS_CASO.findIndex(e => e.key === f.caso.estado), celda: f => <EstadoPill estado={f.caso.estado} /> },
            { k: "dias", l: "Días", ancho: "22%", derecha: true, celda: f => <><span className="num">{f.dias} d</span><Barrita valor={f.dias} max={maxDemora} color="var(--warn)" /></> },
          ]} />
        </section>
      )}
    </>
  );
}

// "¿Quién tiene la pelota?": cuántos casos dependen hoy de cada uno y cuántos días la tuvo cada uno
const COLOR_QUIEN = { vos: "var(--accent)", cliente: "var(--info)", compania: "var(--warn)", terceros: "var(--border2)" };
function SeccionPelota({ allCasos, cambios }) {
  const hoy = useMemo(() => allCasos.map(c => quienTiene(c)).filter(Boolean), [allCasos]);
  const cuenta = k => hoy.filter(q => q === k).length;
  const exacto = useMemo(() => tiempoPorQuien(allCasos, cambios), [allCasos, cambios]);

  // Aproximado con las fechas del expediente (sirve desde ya, mientras se juntan cambios registrados)
  const med = (desde, hasta) => mediana(allCasos.map(c => diasEntre(desde(c), hasta(c))).filter(d => d !== null));
  const aprox = {
    compania: [med(c => c.fecha_inicio_reclamo, c => c.fecha_ofrecimiento), med(fechaAcuerdo, c => c.fecha_cobro)],
    vosCliente: [med(c => c.fecha_derivacion, c => c.fecha_inicio_reclamo), med(c => c.fecha_ofrecimiento, fechaAcuerdo)],
  };
  const sumar = xs => (xs.some(x => x !== null) ? xs.reduce((a, x) => a + (x || 0), 0) : null);

  // Por compañía, con los cambios registrados
  const porCompania = useMemo(() => {
    const g = {};
    exacto.porCaso.forEach(x => { const k = x.caso.compania_aseguradora || "Sin compañía"; (g[k] ||= []).push(x); });
    return Object.entries(g).map(([nombre, xs]) => ({ nombre, n: xs.length, ...Object.fromEntries(QUIEN.map(q => [q.k, Math.round(xs.reduce((a, x) => a + x[q.k], 0) / xs.length)])) }));
  }, [exacto]);
  const totalPromedio = QUIEN.reduce((a, q) => a + (exacto.promedio[q.k] || 0), 0);

  return (
    <section style={{ ...card, padding: "14px 16px" }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700 }}>¿Quién tiene la pelota?</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
        {QUIEN.map(q => (
          <div key={q.k} style={{ borderTop: `3px solid ${COLOR_QUIEN[q.k]}`, paddingTop: 6 }}>
            <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{cuenta(q.k)}</div>
            <div style={{ fontSize: 12, color: "var(--sub)" }}>{q.l}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Días que la tiene cada uno, por caso</div>
      {exacto.casos > 0 ? (
        <>
          <div aria-hidden="true" style={{ display: "flex", height: 12, borderRadius: 4, overflow: "hidden", gap: 2, marginBottom: 8 }}>
            {QUIEN.map(q => exacto.promedio[q.k] > 0 && <div key={q.k} style={{ flex: exacto.promedio[q.k], background: COLOR_QUIEN[q.k] }} />)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 13 }}>
            {QUIEN.map(q => (
              <span key={q.k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: COLOR_QUIEN[q.k] }} />
                <span style={{ color: "var(--sub)" }}>{q.corto}</span>
                <b className="num">{exacto.promedio[q.k]} d</b>
                <span className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{totalPromedio ? `${pct(exacto.promedio[q.k], totalPromedio)}%` : ""}</span>
              </span>
            ))}
          </div>
          <Nota>Promedio por caso con los cambios de estado registrados ({exacto.casos} {exacto.casos === 1 ? "caso" : "casos"}), desde la derivación hasta hoy o hasta que se cerró.</Nota>
          {porCompania.length > 1 && (
            <div style={{ marginTop: 10 }}>
              <TablaAnalisis clave={f => f.nombre} filas={porCompania} ordenInicial={{ k: "compania", desc: true }} minWidth={620} columnas={[
                { k: "nombre", l: "Compañía", ancho: "28%", valor: f => f.nombre.toLowerCase(), celda: f => <b style={{ fontWeight: 600 }}>{f.nombre}</b> },
                ...QUIEN.map(q => ({ k: q.k, l: q.corto, ancho: "15%", derecha: true, celda: f => <span className="num">{f[q.k]} d</span> })),
                { k: "n", l: "Casos", ancho: "12%", derecha: true, celda: f => <span className="num">{f.n}</span> },
              ]} />
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.5 }}>
          Con los cambios de estado registrados (desde el 25/09/2026) se va a ver cuántos días la tuvo cada uno. Mientras tanto, con las fechas del expediente:
          <b> compañía {sumar(aprox.compania) ?? "—"} d</b> (reclamo a oferta + acuerdo a pago) y
          <b> vos y el cliente {sumar(aprox.vosCliente) ?? "—"} d</b> (derivación a reclamo + oferta a acuerdo), en la mediana.
        </div>
      )}
      <Nota>Doc. pendiente = esperando al cliente · Iniciado y Con ofrecimiento = vos · Reclamado y Esperando pago = la compañía · Mediación y juicio, aparte. Una próxima acción vencida pasa la pelota a vos.</Nota>
    </section>
  );
}
