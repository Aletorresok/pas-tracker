import { useState, useEffect, useMemo, Fragment } from "react";
import { METODOS } from "../../utils/intereses.js";
import { SERIES, cargarSerie, guardarSerie, borrarDato, leerPegado, leerNumero, actualizarDesdeInternet } from "../../utils/indices.js";
import { fechaLocalISO } from "../../utils/formatters.js";
import { useEsCelular } from "../../hooks/useEsCelular.js";
import Boton from "../ui/Boton.jsx";

const pesos = n => `$ ${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const coef = n => Number(n).toLocaleString("es-AR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const dma = iso => (iso ? iso.split("-").reverse().join("/") : "");
const mesAnio = ym => { const [a, m] = ym.split("-"); return `${m}/${a}`; };

const campo = { padding: "9px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", width: "100%" };
const etiqueta = { display: "block", fontSize: 12, color: "var(--sub)", marginBottom: 4 };
const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16 };
const celda = { padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right", whiteSpace: "nowrap" };

function textoParaCopiar(m, r, capital, desde, hasta) {
  const base = `Capital: ${pesos(capital)} al ${dma(desde)}.`;
  if (m.k === "tasa_activa_bna")
    return `${base} Intereses a la tasa activa del Banco de la Nación Argentina desde el ${dma(desde)} hasta el ${dma(hasta)} (${r.dias} días; tasa promedio ${r.tasaPromedio.toFixed(2).replace(".", ",")}% anual): ${pesos(r.interes)}. Total: ${pesos(r.total)}.`;
  const hastaTxt = r.parcial ? `${dma(hasta)} (último índice publicado: ${m.serie === "ipc" ? mesAnio(r.hastaDato) : dma(r.hastaDato)})` : dma(hasta);
  const act = `${base} Actualizado por ${m.serie === "ipc" ? "IPC (INDEC)" : "ICL (BCRA)"} al ${hastaTxt}: coeficiente ${coef(r.factor)}, ${pesos(capital * r.factor)}.`;
  return m.k === "ipc3" ? `${act} Más interés puro del 3% anual sobre el capital actualizado (${r.dias} días): ${pesos(r.interes)}. Total: ${pesos(r.total)}.` : act;
}

function Detalle({ m, r }) {
  const fila = { display: "flex", justifyContent: "space-between", gap: 12, padding: "3px 0", fontSize: 12 };
  if (m.k === "tasa_activa_bna")
    return r.detalle.map(d => <div key={d.periodo} className="num" style={fila}><span>{dma(d.periodo)} → {dma(d.hasta)} · {d.dias} días al {String(d.valor).replace(".", ",")}%</span><span>{pesos(d.monto)}</span></div>);
  if (m.serie === "icl")
    return r.detalle.map(d => <div key={d.periodo} className="num" style={fila}><span>ICL al {dma(d.periodo)}</span><span>{String(d.valor).replace(".", ",")}</span></div>);
  return r.detalle.map(d => <div key={d.periodo} className="num" style={fila}><span>{mesAnio(d.periodo)} · {String(d.valor).replace(".", ",")}%</span><span>acumulado {coef(d.factor)}</span></div>);
}

function PanelSerie({ serie, filas, onCambio }) {
  const info = SERIES[serie];
  const [abierto, setAbierto] = useState(null); // "pegar" | "tasa"
  const [texto, setTexto] = useState("");
  const [esNivel, setEsNivel] = useState(false);
  const [tasa, setTasa] = useState({ fecha: fechaLocalISO(), tna: "" });
  const [msg, setMsg] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const correr = async fn => { setTrabajando(true); setMsg(null); const m = await fn(); setMsg(m); setTrabajando(false); onCambio(); };

  const actualizar = () => correr(async () => {
    const r = await actualizarDesdeInternet(serie);
    return r.error ? { error: r.error } : { ok: `Listo: ${r.cantidad} datos, el último del ${dma(r.ultimo)}.` };
  });
  const pegar = () => correr(async () => {
    const { filas: nuevas, errores } = leerPegado(texto, { ipcEsNivel: serie === "ipc" && esNivel });
    if (!nuevas.length) return { error: "No se entendió ninguna línea. Cada línea: fecha y valor (ej. 31/01/2025 2,2)." };
    const r = await guardarSerie(serie, nuevas);
    if (r.error) return { error: r.error };
    setTexto(""); setAbierto(null);
    return { ok: `Se guardaron ${nuevas.length} datos${errores.length ? `; ${errores.length} líneas no se entendieron` : ""}.` };
  });
  const agregarTasa = () => correr(async () => {
    const tna = leerNumero(tasa.tna);
    if (!tasa.fecha || tna === null) return { error: "Poné la fecha y la TNA." };
    const r = await guardarSerie(serie, [{ fecha: tasa.fecha, valor: tna }]);
    if (r.error) return { error: r.error };
    setTasa(t => ({ ...t, tna: "" }));
    return { ok: `Tasa del ${dma(tasa.fecha)} guardada.` };
  });

  return (
    <div style={{ padding: "12px 0", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{info.l}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{info.fuente} · {info.unidad}</div>
        </div>
        <div className="num" style={{ fontSize: 12, color: filas?.length ? "var(--sub)" : "var(--warn)" }}>
          {filas === null ? "Cargando…" : filas.length
            ? `${filas.length} datos · ${serie === "ipc" ? `de ${mesAnio(filas[0].fecha.slice(0, 7))} a ${mesAnio(filas[filas.length - 1].fecha.slice(0, 7))}` : `del ${dma(filas[0].fecha)} al ${dma(filas[filas.length - 1].fecha)}`}`
            : "Sin datos"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {info.automatica && <Boton tamaño="sm" onClick={actualizar} disabled={trabajando}>{trabajando ? "Actualizando…" : "Actualizar desde internet"}</Boton>}
        {!info.automatica && <Boton tamaño="sm" onClick={() => setAbierto(a => (a === "tasa" ? null : "tasa"))}>Agregar una tasa</Boton>}
        <Boton tamaño="sm" variante="fantasma" onClick={() => setAbierto(a => (a === "pegar" ? null : "pegar"))}>Pegar desde Excel</Boton>
      </div>
      {abierto === "pegar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={6} placeholder={serie === "tasa_activa_bna" ? "Desde cuándo rige y TNA, una por línea:\n01/01/2025  45,5\n15/03/2025  39" : serie === "ipc" ? "Mes y variación mensual, uno por línea:\n01/2025  2,2\n02/2025  2,4" : "Fecha y valor del índice, uno por línea:\n01/07/2020  1,00\n02/07/2020  1,0009"}
            style={{ ...campo, fontFamily: "var(--mono)", fontSize: 13 }} />
          {serie === "ipc" && (
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--sub)" }}>
              <input type="checkbox" checked={esNivel} onChange={e => setEsNivel(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
              Los valores son el nivel del índice (no la variación %)
            </label>
          )}
          <div><Boton tamaño="sm" variante="primario" onClick={pegar} disabled={trabajando || !texto.trim()}>Guardar</Boton></div>
        </div>
      )}
      {abierto === "tasa" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label><span style={etiqueta}>Rige desde</span><input type="date" value={tasa.fecha} onChange={e => setTasa(t => ({ ...t, fecha: e.target.value }))} style={{ ...campo, width: 170 }} /></label>
            <label><span style={etiqueta}>TNA %</span><input inputMode="decimal" value={tasa.tna} onChange={e => setTasa(t => ({ ...t, tna: e.target.value }))} placeholder="45,5" style={{ ...campo, width: 110 }} /></label>
            <Boton tamaño="sm" variante="primario" onClick={agregarTasa} disabled={trabajando}>Guardar</Boton>
          </div>
          {filas?.length > 0 && (
            <div style={{ maxHeight: 180, overflowY: "auto", fontSize: 12 }}>
              {[...filas].reverse().map(f => (
                <div key={f.fecha} className="num" style={{ display: "flex", gap: 12, alignItems: "center", padding: "3px 0" }}>
                  <span style={{ width: 90 }}>{dma(f.fecha)}</span><span style={{ width: 70 }}>{String(f.valor).replace(".", ",")}%</span>
                  <button type="button" onClick={() => correr(async () => { const r = await borrarDato(serie, f.fecha); return r.error ? { error: r.error } : { ok: "Tasa borrada." }; })}
                    style={{ background: "none", border: "none", color: "var(--bad)", cursor: "pointer", fontSize: 12 }}>Borrar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {msg && <div role="status" style={{ fontSize: 13, color: msg.error ? "var(--bad)" : "var(--ok)" }}>{msg.error || msg.ok}</div>}
    </div>
  );
}

// Actualización de montos e intereses: compara tasa activa BNA, IPC, IPC + 3% e ICL para el mismo capital y período.
export default function CalculadoraIntereses() {
  const esCelular = useEsCelular();
  const [series, setSeries] = useState({ ipc: null, icl: null, tasa_activa_bna: null });
  const [errorSeries, setErrorSeries] = useState("");
  const [capital, setCapital] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState(fechaLocalISO());
  const [abiertoDetalle, setAbiertoDetalle] = useState(null);
  const [verDatos, setVerDatos] = useState(false);
  const [copiado, setCopiado] = useState(null);

  const recargar = async () => {
    const res = await Promise.all(Object.keys(SERIES).map(async s => [s, await cargarSerie(s)]));
    const err = res.find(([, r]) => r.error);
    setErrorSeries(err ? err[1].error : "");
    setSeries(Object.fromEntries(res.map(([s, r]) => [s, r.filas || []])));
  };
  useEffect(() => { recargar(); }, []);

  const monto = leerNumero(capital);
  const listo = monto > 0 && desde && hasta && hasta > desde;
  const resultados = useMemo(() => (listo ? METODOS.map(m => ({ m, r: series[m.serie] ? m.calcular(monto, desde, hasta, series[m.serie]) : { error: "Cargando…" } })) : []),
    [listo, monto, desde, hasta, series]);
  const sinDatos = Object.values(series).some(f => f && !f.length);

  const copiar = (m, r) => {
    navigator.clipboard?.writeText(textoParaCopiar(m, r, monto, desde, hasta)).then(() => { setCopiado(m.k); setTimeout(() => setCopiado(null), 2000); }).catch(() => {});
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 900 }}>
      <div style={{ ...tarjeta, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <label><span style={etiqueta}>Capital</span>
          <input inputMode="decimal" value={capital} onChange={e => setCapital(e.target.value)} placeholder="1.500.000" style={campo} /></label>
        <label><span style={etiqueta}>Desde (fecha del hecho, mora, etc.)</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={campo} /></label>
        <label><span style={etiqueta}>Hasta</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={campo} /></label>
      </div>

      {errorSeries && <div role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>{errorSeries}</div>}
      {!errorSeries && sinDatos && (
        <div style={{ fontSize: 13, color: "var(--warn)" }}>
          Faltan datos de algún índice. <button type="button" onClick={() => setVerDatos(true)} style={{ background: "none", border: "none", padding: 0, color: "var(--accent-ink)", fontWeight: 600, cursor: "pointer", font: "inherit" }}>Cargarlos</button>
        </div>
      )}

      {!listo && <div style={{ fontSize: 14, color: "var(--muted)" }}>Poné el capital y las dos fechas para comparar los cuatro métodos.</div>}

      {listo && esCelular && resultados.map(({ m, r }) => (
        <div key={m.k} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{m.l}</span>
            {!r.error && <span className="num" style={{ fontSize: 17, fontWeight: 700 }}>{pesos(r.total)}</span>}
          </div>
          {r.parcial && <div style={{ fontSize: 12, color: "var(--warn)" }}>hasta el último dato ({m.serie === "ipc" ? mesAnio(r.hastaDato) : dma(r.hastaDato)})</div>}
          {r.error ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{r.error}</div> : (
            <>
              <div className="num" style={{ fontSize: 13, color: "var(--sub)" }}>
                Coeficiente {coef(r.factor)}{r.actualizacion ? ` · actualización ${pesos(r.actualizacion)}` : ""}{r.interes ? ` · intereses ${pesos(r.interes)}` : ""}
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                <button type="button" onClick={() => setAbiertoDetalle(a => (a === m.k ? null : m.k))} style={{ background: "none", border: "none", padding: 0, color: "var(--sub)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{abiertoDetalle === m.k ? "Ocultar detalle" : "Detalle"}</button>
                <button type="button" onClick={() => copiar(m, r)} style={{ background: "none", border: "none", padding: 0, color: "var(--accent-ink)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{copiado === m.k ? "Copiado ✓" : "Copiar texto"}</button>
              </div>
              {abiertoDetalle === m.k && <div style={{ borderTop: "1px solid var(--border)", paddingTop: 6 }}><Detalle m={m} r={r} /></div>}
            </>
          )}
        </div>
      ))}

      {listo && !esCelular && (
        <div style={{ ...tarjeta, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--card2)" }}>
                {["Método", "Coeficiente", "Actualización", "Intereses", "Total", ""].map((t, i) => (
                  <th key={i} scope="col" style={{ ...celda, textAlign: i ? "right" : "left", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--muted)" }}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultados.map(({ m, r }) => (
                <Fragment key={m.k}>
                  <tr>
                    <td style={{ ...celda, textAlign: "left", fontWeight: 600 }}>
                      {m.l}
                      {r.parcial && <div style={{ fontSize: 11, fontWeight: 400, color: "var(--warn)" }}>hasta el último dato ({m.serie === "ipc" ? mesAnio(r.hastaDato) : dma(r.hastaDato)})</div>}
                    </td>
                    {r.error ? (
                      <td colSpan={5} style={{ ...celda, textAlign: "left", color: "var(--muted)", fontSize: 13, whiteSpace: "normal" }}>{r.error}</td>
                    ) : (
                      <>
                        <td className="num" style={celda}>{coef(r.factor)}</td>
                        <td className="num" style={celda}>{r.actualizacion ? pesos(r.actualizacion) : "—"}</td>
                        <td className="num" style={celda}>{r.interes ? pesos(r.interes) : "—"}</td>
                        <td className="num" style={{ ...celda, fontWeight: 700 }}>{pesos(r.total)}</td>
                        <td style={{ ...celda, whiteSpace: "nowrap" }}>
                          <button type="button" onClick={() => setAbiertoDetalle(a => (a === m.k ? null : m.k))} style={{ background: "none", border: "none", color: "var(--sub)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{abiertoDetalle === m.k ? "Ocultar" : "Detalle"}</button>
                          <button type="button" onClick={() => copiar(m, r)} style={{ background: "none", border: "none", color: "var(--accent-ink)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{copiado === m.k ? "Copiado ✓" : "Copiar"}</button>
                        </td>
                      </>
                    )}
                  </tr>
                  {abiertoDetalle === m.k && !r.error && (
                    <tr><td colSpan={6} style={{ padding: "8px 16px 12px", borderBottom: "1px solid var(--border)", background: "var(--card2)" }}><Detalle m={m} r={r} /></td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {listo && <div style={{ fontSize: 12, color: "var(--muted)" }}>Tasa activa BNA: interés simple con la tasa vigente cada día. IPC: relación entre los índices del mes inicial y el final. IPC + 3%: además, 3% anual puro sobre el capital actualizado. ICL: relación entre los valores diarios.</div>}

      <div style={tarjeta}>
        <button type="button" onClick={() => setVerDatos(v => !v)} aria-expanded={verDatos}
          style={{ background: "none", border: "none", padding: 0, font: "inherit", fontSize: 14, fontWeight: 700, color: "var(--text)", cursor: "pointer" }}>
          Datos de los índices {verDatos ? "▴" : "▾"}
        </button>
        {verDatos && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Quedan guardados para todos tus dispositivos. Si la actualización automática falla, bajá el Excel de la fuente oficial y pegá las columnas de fecha y valor.</div>
            {Object.keys(SERIES).map(s => <PanelSerie key={s} serie={s} filas={series[s]} onCambio={recargar} />)}
          </div>
        )}
      </div>
    </div>
  );
}
