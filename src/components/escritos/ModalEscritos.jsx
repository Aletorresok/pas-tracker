import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";
import CampoMonto from "../ui/CampoMonto.jsx";
import { cargarModelos, categoriaModelo, modeloSirvePara, registrarGenerado, DOCUMENTAL_FIJA, DOCUMENTAL_OPCIONAL } from "../../utils/modelos.js";
import { variablesDe, preguntasDe, completar, bloques, formatearDni } from "../../utils/plantillas.js";
import { cargarEstudio } from "../../utils/estudio.js";
import { cargarCompania } from "../../utils/ofertas.js";
import { faltantes as faltantesCompania } from "../../utils/companias.js";
import { abrirCompania } from "../../utils/companiaAbierta.js";
import { registrarAccion } from "../../utils/storage.js";
import { cargarLiquidaciones } from "../../utils/finanzas.js";
import { elegirDestino, escribirEn } from "../../utils/pdfEditor.js";
import { nombreArchivo, armarEscritoPDF } from "../../utils/escritoPDF.js";
import { suscribirEscritos, escritosAbierto, cerrarEscritos } from "../../utils/escritoAbierto.js";

// Montado una vez en App: muestra el "Generar escrito" que se pidió con abrirEscritos()
export function EscritosHost() {
  const actual = useSyncExternalStore(suscribirEscritos, escritosAbierto);
  if (!actual) return null;
  return <ModalEscritos key={actual.t} {...actual} onClose={cerrarEscritos} />;
}

const etiqueta = { display: "block", fontSize: 12, color: "var(--sub)", marginBottom: 4 };
const campo = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 };
const titulo = { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted)", margin: "0 0 8px" };
const legible = k => k.replace(/[._]/g, " ");
// Lo que falta y se puede escribir a mano en el momento (el resto se corrige en el texto)
const COMPLETABLES = { dni: "DNI del cliente", nro_siniestro: "N° de siniestro", patente: "Patente", fecha_siniestro: "Fecha del siniestro (dd/mm/aaaa)" };

// Vista previa: renglones del escrito con [lo que falta] resaltado
export function Hoja({ texto }) {
  const conFaltas = t => t.split(/(\[[^\]]+\])/).map((p, i) =>
    /^\[[^\]]+\]$/.test(p) ? <mark key={i} style={{ background: "color-mix(in srgb, var(--warn) 25%, transparent)", color: "inherit", borderRadius: 4, padding: "0 2px" }}>{p}</mark> : p);
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", boxShadow: "var(--sh-1)", padding: "22px 24px", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14, lineHeight: 1.6, color: "var(--text)", overflowWrap: "anywhere", minHeight: 260 }}>
      {bloques(texto).map((b, i) => {
        const tramos = b.tramos.map((t, j) => <span key={j} style={{ fontWeight: t.negrita || b.tipo === "titulo" ? 700 : 400 }}>{conFaltas(t.t)}</span>);
        if (b.tipo === "titulo") return <div key={i} style={{ fontFamily: "var(--font)", fontSize: 16, marginBottom: 8 }}>{tramos}</div>;
        if (b.tipo === "item") return <div key={i} style={{ paddingLeft: 14 }}>{tramos}</div>;
        if (b.tipo === "linea") return <div key={i}>{tramos}</div>;
        return <p key={i} style={{ margin: "8px 0", textAlign: "justify" }}>{tramos}</p>;
      })}
    </div>
  );
}

/**
 * Generar un escrito desde un modelo (SQL 32).
 * caso + pasId (caso PAS) o expediente; opcionales: dirHandle, onDni, onGuardadoEnCarpeta, onReclamoViejo.
 */
export default function ModalEscritos({ caso = null, expediente = null, dirHandle = null, onDni, onGuardadoEnCarpeta, onReclamoViejo, onClose }) {
  const ambito = expediente ? "expediente" : "caso";
  const de = expediente ? expediente.caratula : caso?.asegurado;
  const [modelos, setModelos] = useState(undefined); // undefined = cargando, null = falta el SQL 32
  const [estudio, setEstudio] = useState({});
  const [compania, setCompania] = useState(null);
  const [elegido, setElegido] = useState(null);
  const [categoria, setCategoria] = useState("todas");
  const [respuestas, setRespuestas] = useState({});
  const [aMano, setAMano] = useState({}); // faltantes completados en el momento
  const [opcionales, setOpcionales] = useState(() => Object.fromEntries(DOCUMENTAL_OPCIONAL.map(d => [d.k, d.porDefecto])));
  const [editando, setEditando] = useState(false);
  const [textoEditado, setTextoEditado] = useState(null); // null = sale del modelo
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState(null); // { ok } | { error }
  const [liquidaciones, setLiquidaciones] = useState([]); // de la calculadora de intereses (SQL 36)
  const [liqId, setLiqId] = useState("");

  useEffect(() => {
    cargarModelos({ soloActivos: true }).then(ms => setModelos(ms && ms.filter(m => modeloSirvePara(m, ambito))));
    cargarEstudio().then(setEstudio);
    cargarLiquidaciones({ casoId: expediente ? null : caso?.id, expedienteId: expediente?.id }).then(ls => { setLiquidaciones(ls || []); if (ls?.length) setLiqId(ls[0].id); });
    if (caso?.compania_aseguradora) cargarCompania(caso.compania_aseguradora).then(c => setCompania(c || {}));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const tecla = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onClose]);

  const modelo = modelos?.find(m => m.id === elegido) || null;
  const preguntas = useMemo(() => (modelo ? preguntasDe(modelo.cuerpo) : []), [modelo]);
  const usaDocumental = !!modelo?.cuerpo.includes("{{documental}}");
  const usaLiquidacion = !!modelo?.cuerpo.includes("{{liquidacion");
  const liquidacion = liquidaciones.find(l => l.id === liqId) || null;

  const variables = useMemo(() => {
    const documental = [...DOCUMENTAL_FIJA, ...DOCUMENTAL_OPCIONAL.filter(d => opcionales[d.k]).map(d => d.l)];
    const v = variablesDe({ caso, expediente, compania: compania && Object.keys(compania).length ? compania : null, estudio, documental, liquidacion });
    Object.entries(aMano).forEach(([k, val]) => {
      if (!String(val).trim()) return;
      v[k] = k === "dni" ? formatearDni(val) : k === "patente" ? val.trim().toUpperCase() : val.trim();
    });
    return v;
  }, [caso, expediente, compania, estudio, opcionales, aMano, liquidacion]);

  const resultado = useMemo(() => (modelo ? completar(modelo.cuerpo, variables, respuestas, preguntas) : { texto: "", faltantes: [] }), [modelo, variables, respuestas, preguntas]);
  const texto = textoEditado ?? resultado.texto;
  const claves = new Set(preguntas.map(p => p.clave));
  const faltanDatos = resultado.faltantes.filter(k => !claves.has(k));
  const quedanMarcas = /\[[^\]]+\]/.test(texto);

  const elegir = id => { setElegido(id); setRespuestas({}); setTextoEditado(null); setEditando(false); setAviso(null); };

  // Guardar: el explorador se abre apenas se hace click (el navegador no lo permite después)
  const guardar = async formato => {
    if (!modelo) return;
    const nombre = nombreArchivo(modelo.titulo, de, formato);
    let destino = null;
    if (!dirHandle) {
      try { destino = await elegirDestino(nombre, undefined, formato); } catch (e) { setAviso({ error: `No se pudo abrir el explorador: ${e.message}` }); return; }
      if (!destino) return; // canceló
    } else {
      try {
        await dirHandle.getFileHandle(nombre); // existe
        if (!window.confirm(`Ya hay un archivo "${nombre}" en la carpeta del caso. ¿Reemplazarlo?`)) return;
      } catch { /* no existe: sigue */ }
    }
    setTrabajando(true); setAviso(null);
    try {
      const opciones = { texto, firma: modelo.firma, estudio, membrete: modelo.membrete };
      const bytes = formato === "docx"
        ? await (await import("../../utils/escritoDocx.js")).armarEscritoDocx(opciones)
        : await armarEscritoPDF(opciones);
      let donde;
      if (dirHandle) {
        const fh = await dirHandle.getFileHandle(nombre, { create: true });
        const w = await fh.createWritable(); await w.write(bytes); await w.close();
        donde = "la carpeta del caso"; onGuardadoEnCarpeta?.();
      } else {
        const final = await escribirEn(destino, bytes, nombre);
        donde = destino === "descargar" ? "Descargas" : final;
      }
      await despuesDeGenerar(formato, nombre);
      setAviso({ ok: `Listo: ${nombre} (${donde}).` });
    } catch (e) {
      console.error("[escritos]", e);
      setAviso({ error: `No se pudo guardar: ${e.message}` });
    }
    setTrabajando(false);
  };

  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto.replace(/\*\*/g, "")); setAviso({ ok: "Texto copiado." }); await despuesDeGenerar("texto"); }
    catch { setEditando(true); setAviso({ error: "No se pudo copiar solo: seleccioná el texto y copialo." }); }
  };

  // Historial, bitácora y DNI que faltaba
  const despuesDeGenerar = async (formato, archivo) => {
    const id = expediente?.id || caso?.id;
    const formatoTexto = { pdf: "PDF", docx: "Word", texto: "texto copiado" }[formato];
    registrarGenerado({ modelo, casoId: caso?.id, expedienteId: expediente?.id, titulo: modelo.titulo, cuerpo: texto, respuestas, formato, archivo });
    if (id) registrarAccion(id, `Escrito: ${modelo.titulo} (${formatoTexto})`);
    if (aMano.dni?.trim() && caso && !String(caso.dni_asegurado || "").trim()) onDni?.(aMano.dni.trim());
  };

  const cats = modelos ? ["todas", ...new Set(modelos.map(m => m.categoria))] : [];
  const visibles = (modelos || []).filter(m => categoria === "todas" || m.categoria === categoria);
  const faltaCia = caso?.compania_aseguradora && compania ? faltantesCompania(compania) : [];

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 455 }} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Generar escrito"
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 456, width: "100%", maxWidth: 1080, maxHeight: "94vh", overflow: "auto", padding: 12, boxSizing: "border-box" }}>
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-3)" }}>
          <div className="modal-sticky" style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--card)", borderRadius: "var(--r-lg) var(--r-lg) 0 0", borderBottom: "1px solid var(--border)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Generar escrito</div>
              <div style={{ fontSize: 13, color: "var(--sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{de || "Sin nombre"}{dirHandle ? " · se guarda en la carpeta del caso" : ""}</div>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--sub)", width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}>
              <Icono nombre="cerrar" size={16} />
            </button>
          </div>

          <div style={{ padding: 16 }}>
            {modelos === undefined && <div style={{ color: "var(--muted)", fontSize: 14 }}>Cargando modelos…</div>}
            {modelos === null && (
              <div style={{ display: "grid", gap: 12, justifyItems: "start", fontSize: 14, color: "var(--sub)" }}>
                <div>Falta correr el SQL 32 (modelos de escritos) en Supabase. Hasta entonces sigue disponible el reclamo de siempre.</div>
                {onReclamoViejo && <Boton variante="primario" icono="escrito" onClick={() => { onClose(); onReclamoViejo(); }}>Usar el reclamo de siempre</Boton>}
              </div>
            )}
            {modelos && modelos.length === 0 && <div style={{ color: "var(--sub)", fontSize: 14 }}>No hay modelos para {ambito === "caso" ? "casos PAS" : "expedientes"}. Se crean en Herramientas → Modelos.</div>}

            {modelos && modelos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 16, alignItems: "start" }}>
                {/* Izquierda: modelo, preguntas y lo que falta */}
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, minWidth: 0 }}>
                  <section style={{ minWidth: 0 }}>
                    <h3 style={titulo}>1 · Modelo</h3>
                    {cats.length > 2 && (
                      <div className="chips" style={{ marginBottom: 8 }}>
                        {cats.map(c => (
                          <button key={c} type="button" className="chip" aria-pressed={categoria === c} onClick={() => setCategoria(c)}>
                            {c === "todas" ? "Todos" : categoriaModelo(c).l}
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 6 }}>
                      {visibles.map(m => (
                        <button key={m.id} type="button" onClick={() => elegir(m.id)} aria-pressed={elegido === m.id}
                          style={{ textAlign: "left", font: "inherit", fontSize: 14, padding: "9px 12px", borderRadius: "var(--r-sm)", cursor: "pointer", color: "var(--text)",
                            border: `1px solid ${elegido === m.id ? "var(--accent)" : "var(--border)"}`, background: elegido === m.id ? "color-mix(in srgb, var(--accent) 12%, var(--card))" : "var(--card)", fontWeight: elegido === m.id ? 600 : 400 }}>
                          {m.titulo}
                        </button>
                      ))}
                    </div>
                  </section>

                  {modelo && (preguntas.length > 0 || usaDocumental || usaLiquidacion) && (
                    <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10, minWidth: 0 }}>
                      <h3 style={titulo}>2 · Completar</h3>
                      {usaLiquidacion && (liquidaciones.length > 0 ? (
                        <label htmlFor="liq-escrito">
                          <span style={etiqueta}>Liquidación a usar</span>
                          <select id="liq-escrito" value={liqId} onChange={e => { setLiqId(e.target.value); setTextoEditado(null); }} style={campo}>
                            {liquidaciones.map(l => <option key={l.id} value={l.id}>{l.titulo} · {Number(l.resultado).toLocaleString("es-AR", { style: "currency", currency: "ARS" })}</option>)}
                          </select>
                        </label>
                      ) : (
                        <div style={{ fontSize: 13, color: "var(--sub)" }}>Este modelo usa una liquidación y {expediente ? "el expediente" : "el caso"} no tiene ninguna guardada. Hacela en Herramientas → Intereses y actualización → "Guardar en un caso o expediente".</div>
                      ))}
                      {preguntas.map(p => (
                        <label key={p.clave} htmlFor={`preg-${p.clave}`}>
                          <span style={etiqueta}>{p.etiqueta}</span>
                          {p.tipo === "monto"
                            ? <CampoMonto id={`preg-${p.clave}`} value={respuestas[p.clave] || ""} onChange={v => { setRespuestas(r => ({ ...r, [p.clave]: v })); setTextoEditado(null); }} />
                            : <input id={`preg-${p.clave}`} type={p.tipo === "fecha" ? "date" : "text"} value={respuestas[p.clave] || ""} style={campo}
                                onChange={e => { const v = e.target.value; setRespuestas(r => ({ ...r, [p.clave]: v })); setTextoEditado(null); }} />}
                        </label>
                      ))}
                      {usaDocumental && (
                        <div>
                          <span style={etiqueta}>Documental que acompaña (además de {DOCUMENTAL_FIJA.join(", ").toLowerCase()})</span>
                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 6 }}>
                            {DOCUMENTAL_OPCIONAL.map(d => (
                              <label key={d.k} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, cursor: "pointer" }}>
                                <input type="checkbox" checked={!!opcionales[d.k]} onChange={e => { const v = e.target.checked; setOpcionales(o => ({ ...o, [d.k]: v })); setTextoEditado(null); }} style={{ accentColor: "var(--accent)" }} />
                                {d.l}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  )}

                  {modelo && faltanDatos.length > 0 && (
                    <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10, padding: 12, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--warn) 9%, var(--card))", border: "1px solid color-mix(in srgb, var(--warn) 30%, transparent)" }}>
                      <div style={{ fontSize: 13, color: "var(--text)" }}>
                        Faltan datos: {faltanDatos.map(legible).join(", ")}. Completalos acá, en la ficha, o corregilos en el texto.
                      </div>
                      {faltanDatos.filter(k => COMPLETABLES[k]).map(k => (
                        <label key={k} htmlFor={`falta-${k}`}>
                          <span style={etiqueta}>{COMPLETABLES[k]}{k === "dni" && caso ? " (queda guardado en el caso)" : ""}</span>
                          <input id={`falta-${k}`} value={aMano[k] || ""} style={campo} onChange={e => { const v = e.target.value; setAMano(a => ({ ...a, [k]: v })); setTextoEditado(null); }} />
                        </label>
                      ))}
                    </section>
                  )}

                  {faltaCia.length > 0 && modelo?.cuerpo.includes("compania.") && (
                    <div style={{ fontSize: 12.5, color: "var(--warn)" }}>
                      A la ficha de {caso.compania_aseguradora} le falta {faltaCia.join(", ")}.{" "}
                      <button type="button" onClick={() => { onClose(); abrirCompania(caso.compania_aseguradora); }} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, color: "var(--accent-ink)", cursor: "pointer" }}>Completar ficha</button>
                    </div>
                  )}
                </div>

                {/* Derecha: vista previa y guardar */}
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10, minWidth: 0 }}>
                  {!modelo && <div style={{ color: "var(--muted)", fontSize: 14, padding: "24px 0" }}>Elegí un modelo para ver cómo queda.</div>}
                  {modelo && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <h3 style={{ ...titulo, margin: 0 }}>3 · Revisar</h3>
                        <span role="group" aria-label="Vista" className="segmentado">
                          <button type="button" aria-pressed={!editando} onClick={() => setEditando(false)}>Vista previa</button>
                          <button type="button" aria-pressed={editando} onClick={() => setEditando(true)}>Editar texto</button>
                        </span>
                      </div>
                      {editando
                        ? <textarea id="texto-escrito" value={texto} onChange={e => setTextoEditado(e.target.value)} rows={18}
                            style={{ ...campo, fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.55, resize: "vertical" }} />
                        : <Hoja texto={texto} />}
                      {textoEditado !== null && (
                        <div style={{ fontSize: 12.5, color: "var(--sub)" }}>
                          Editaste el texto a mano: los cambios de la izquierda ya no lo modifican.{" "}
                          <button type="button" onClick={() => setTextoEditado(null)} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 600, color: "var(--accent-ink)", cursor: "pointer" }}>Volver a armarlo desde el modelo</button>
                        </div>
                      )}
                      {quedanMarcas && <div style={{ fontSize: 12.5, color: "var(--warn)" }}>Quedan datos entre corchetes sin completar.</div>}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Boton variante="primario" icono="pdf" disabled={trabajando} onClick={() => guardar("pdf")}>{dirHandle ? "Guardar PDF en la carpeta" : "Guardar PDF…"}</Boton>
                        <Boton icono="escrito" disabled={trabajando} onClick={() => guardar("docx")}>{dirHandle ? "Word en la carpeta" : "Word…"}</Boton>
                        <Boton variante="fantasma" icono="copiar" disabled={trabajando} onClick={copiar}>Copiar texto</Boton>
                      </div>
                      {trabajando && <div style={{ fontSize: 13, color: "var(--muted)" }}>Armando…</div>}
                      {aviso && <div role="status" style={{ fontSize: 13, color: aviso.error ? "var(--bad)" : "var(--ok)" }}>{aviso.error || aviso.ok}</div>}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
