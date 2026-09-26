import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../supabase.js";
import { THEME } from "../../utils/theme.js";
import { fmtDate } from "../../utils/formatters.js";
import {
  CAMPOS_EXPEDIENTE, ESTADOS_EXPEDIENTE, FUEROS, JURISDICCIONES, ROLES_CLIENTE,
  actualizarExpediente, crearExpediente, eliminarExpediente, estadoExpediente, generarCodigoCliente, pendientesOrdenados,
} from "../../utils/expedientes.js";
import { registrarAccion } from "../../utils/storage.js";
import { useRealtimeAcciones } from "../../hooks/useRealtimeSync.js";
import { Toast, PreviewModal } from "../casoDetalleComponents.jsx";
import { CarpetaLocal } from "../CarpetaLocal.jsx";
import SeccionTimeline from "../caso/SeccionTimeline.jsx";
import CasoProximaAccion from "../caso/CasoProximaAccion.jsx";
import CampoMonto from "../ui/CampoMonto.jsx";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";
import ChipPendiente from "./ChipPendiente.jsx";
import ListaPendientes from "./ListaPendientes.jsx";

const VACIO = { caratula: "", fuero: "Civil y Comercial", jurisdiccion: "CABA", estado: "activo", rol_cliente: "actora", visible_cliente: false };
const aFormulario = e => Object.fromEntries(CAMPOS_EXPEDIENTE.map(k => [k, e?.[k] ?? (k === "visible_cliente" ? false : "")]));

const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sub)", marginBottom: 4 };
const campo = { width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 };
const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 };

function Campo({ label, k, datos, onChange, tipo = "text", opciones, ancho }) {
  const valor = datos[k] ?? "";
  return (
    <label style={{ gridColumn: ancho ? "1 / -1" : undefined }}>
      <span style={etiqueta}>{label}</span>
      {opciones
        ? <select value={valor} onChange={e => onChange(k, e.target.value)} style={campo}>
            <option value="">—</option>
            {opciones.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.k} value={o.k}>{o.l}</option>)}
          </select>
        : tipo === "textarea"
          ? <textarea value={valor} onChange={e => onChange(k, e.target.value)} rows={4} style={{ ...campo, resize: "vertical" }} />
          : <input type={tipo} value={valor} onChange={e => onChange(k, e.target.value)} style={campo} />}
    </label>
  );
}

const grilla = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 };

// Ficha de un expediente (o alta de uno nuevo si `expediente` es null)
export default function FichaExpediente({ expediente, plazos, cal, onGuardado, onPlazo, onEliminado, onClose }) {
  const Th = THEME();
  const esNuevo = !expediente;
  const [datos, setDatos] = useState(() => aFormulario(expediente || VACIO));
  const [pestana, setPestana] = useState(esNuevo ? "datos" : "resumen");
  const [estadoGuardado, setEstadoGuardado] = useState("guardado");
  const [toast, setToast] = useState(null);
  const [acciones, setAcciones] = useState([]);
  const [cargandoAcciones, setCargandoAcciones] = useState(false);
  const [previewArchivo, setPreviewArchivo] = useState(null);
  const [creando, setCreando] = useState(false);
  const actualRef = useRef(expediente);
  const dirHandleRef = useRef(null);
  useEffect(() => { actualRef.current = expediente; }, [expediente]);

  const id = expediente?.id;
  const cambiar = (k, v) => { setDatos(d => ({ ...d, [k]: v })); if (!esNuevo) setEstadoGuardado("pendiente"); };

  // Autoguardado: 1,2 s después del último cambio, solo lo que cambió
  const guardar = useCallback(async () => {
    const actual = actualRef.current;
    if (!actual) return;
    const cambios = {};
    CAMPOS_EXPEDIENTE.forEach(k => { if (String(datos[k] ?? "") !== String(actual[k] ?? "")) cambios[k] = datos[k]; });
    if (!Object.keys(cambios).length) { setEstadoGuardado("guardado"); return; }
    if ("caratula" in cambios && !String(cambios.caratula).trim()) { setEstadoGuardado("error"); return; }
    setEstadoGuardado("guardando");
    const { data, error } = await actualizarExpediente(actual.id, cambios);
    if (error) { setEstadoGuardado("error"); return; }
    if ("estado" in cambios) registrarAccion(actual.id, `Pasó a ${estadoExpediente(cambios.estado).l}`).then(ok => ok && cargarAcciones());
    actualRef.current = data;
    onGuardado(data);
    setEstadoGuardado("guardado");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, onGuardado]);
  useEffect(() => {
    if (estadoGuardado !== "pendiente") return;
    const t = setTimeout(guardar, 1200);
    return () => clearTimeout(t);
  }, [estadoGuardado, guardar]);

  const crear = async () => {
    if (!datos.caratula.trim()) { setToast({ msg: "La carátula es obligatoria", type: "error" }); return; }
    setCreando(true);
    const { data, error } = await crearExpediente({ ...datos, caratula: datos.caratula.trim() });
    setCreando(false);
    if (error) { setToast({ msg: "No se creó: " + error.message, type: "error" }); return; }
    registrarAccion(data.id, "Expediente creado");
    onGuardado(data, { nuevo: true });
  };

  // Bitácora (tabla acciones, con el id del expediente)
  const cargarAcciones = useCallback(async () => {
    if (!id) return;
    setCargandoAcciones(true);
    const { data, error } = await supabase.from("acciones").select("*").eq("caso_id", id).order("fecha", { ascending: false });
    if (!error) setAcciones(data || []);
    setCargandoAcciones(false);
  }, [id]);
  useEffect(() => { cargarAcciones(); }, [cargarAcciones]);
  useRealtimeAcciones(id, cargarAcciones);
  const crearAccion = async ({ fecha, descripcion }) => {
    const { error } = await supabase.from("acciones").insert({ caso_id: id, descripcion, fecha, tipo: "nota" });
    if (error) { setToast({ msg: "Error al crear: " + error.message, type: "error" }); return; }
    await cargarAcciones();
  };
  const actualizarAccion = async ({ id: accionId, fecha, descripcion }) => {
    const { error } = await supabase.from("acciones").update({ descripcion, fecha, tipo: "nota" }).eq("id", accionId);
    if (error) { setToast({ msg: "Error al actualizar: " + error.message, type: "error" }); return; }
    await cargarAcciones();
  };
  const eliminarAccion = async accionId => {
    if (!window.confirm("¿Eliminar esta acción?")) return;
    const { error } = await supabase.from("acciones").delete().eq("id", accionId);
    if (error) { setToast({ msg: "Error: " + error.message, type: "error" }); return; }
    await cargarAcciones();
  };

  const cerrar = async () => { if (estadoGuardado === "pendiente") await guardar(); onClose(); };
  useEffect(() => {
    const esc = e => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  });

  const alternarVisible = () => {
    const visible = !datos.visible_cliente;
    cambiar("visible_cliente", visible);
    if (visible && !datos.codigo_cliente) cambiar("codigo_cliente", generarCodigoCliente());
  };

  const borrar = async () => {
    if (!window.confirm(`¿Eliminar definitivamente "${datos.caratula}"? Se borran también sus plazos, escritos y bitácora.`)) return;
    if (await eliminarExpediente(id)) onEliminado(id);
    else setToast({ msg: "No se pudo eliminar", type: "error" });
  };

  const pendientes = useMemo(() => pendientesOrdenados(plazos), [plazos]);
  const juris = datos.jurisdiccion || null;
  const est = estadoExpediente(datos.estado);
  const nPlazos = plazos.filter(p => p.tipo === "plazo" && p.estado === "pendiente").length;
  const nEscritos = plazos.filter(p => p.tipo === "escrito" && p.estado === "pendiente").length;
  const PESTANAS = esNuevo ? [{ k: "datos", l: "Datos" }] : [
    { k: "resumen", l: "Resumen" }, { k: "datos", l: "Datos" },
    { k: "plazos", l: "Plazos", n: nPlazos }, { k: "escritos", l: "Escritos", n: nEscritos },
    { k: "documentos", l: "Documentos" }, { k: "bitacora", l: "Bitácora", n: acciones.length },
  ];
  const TEXTO_GUARDADO = { guardado: "✓ Guardado", pendiente: "Sin guardar…", guardando: "Guardando…", error: "No se guardó · reintentar" };
  const COLOR_GUARDADO = { guardado: "var(--ok)", pendiente: "var(--muted)", guardando: "var(--muted)", error: "var(--warn)" };
  const panel = k => ({ hidden: pestana !== k, role: "tabpanel", id: `panel-exp-${k}`, "aria-labelledby": `tab-exp-${k}` });
  const subtitulo = [datos.fuero, datos.juzgado && `Juzg. ${datos.juzgado}`, datos.secretaria && `Sec. ${datos.secretaria}`, datos.numero && `Expte. ${datos.numero}`, datos.fecha_inicio && `desde ${fmtDate(datos.fecha_inicio)}`].filter(Boolean).join(" · ");

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 400 }} onClick={cerrar} />
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label={esNuevo ? "Nuevo expediente" : `Expediente ${datos.caratula}`}
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 401, width: "100%", maxWidth: 1000, maxHeight: "92vh", overflow: "auto", padding: 16 }}>
        <div style={{ background: Th.bg, border: `1px solid ${Th.border}`, borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.4)", minHeight: "60vh" }}>

          <div className="modal-sticky" style={{ position: "sticky", background: Th.card, borderRadius: "16px 16px 0 0", borderBottom: `1px solid ${Th.border}`, padding: "16px 20px 0", zIndex: 50 }}>
            <button type="button" onClick={cerrar} aria-label="Cerrar" style={{ position: "absolute", top: 14, right: 16, background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 8, color: Th.sub, width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer" }}>
              <Icono nombre="cerrar" size={16} />
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", paddingRight: 44 }}>
              <div style={{ minWidth: 0, flex: "1 1 280px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, overflowWrap: "anywhere" }}>{esNuevo ? "Nuevo expediente" : datos.caratula || "Sin carátula"}</div>
                {!esNuevo && <div style={{ fontSize: 13, color: Th.sub, marginTop: 4 }}>{subtitulo || "Completá los datos del expediente"}</div>}
              </div>
              {!esNuevo && (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span role="status" style={{ fontSize: 12, fontWeight: 600, color: COLOR_GUARDADO[estadoGuardado] }}>
                    {estadoGuardado === "error"
                      ? <button type="button" onClick={guardar} style={{ background: "none", border: "none", color: "inherit", font: "inherit", cursor: "pointer", padding: 0, textDecoration: "underline" }}>{TEXTO_GUARDADO.error}</button>
                      : TEXTO_GUARDADO[estadoGuardado]}
                  </span>
                  <select value={datos.estado} onChange={e => cambiar("estado", e.target.value)} aria-label="Estado del expediente"
                    style={{ ...campo, width: "auto", padding: "5px 8px", fontWeight: 600, color: est.color }}>
                    {ESTADOS_EXPEDIENTE.map(e => <option key={e.k} value={e.k}>{e.l}</option>)}
                  </select>
                </div>
              )}
            </div>

            {!esNuevo && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, padding: "10px 12px", background: Th.card2, borderRadius: 8, flexWrap: "wrap" }}>
                <button type="button" role="switch" aria-checked={!!datos.visible_cliente} aria-label="Visible para el cliente" onClick={alternarVisible}
                  style={{ width: 38, height: 22, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", position: "relative", flex: "none", background: datos.visible_cliente ? "var(--ok)" : "var(--border2)" }}>
                  <span style={{ position: "absolute", top: 3, left: datos.visible_cliente ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "var(--card)", transition: "left .15s" }} />
                </button>
                <div style={{ flex: "1 1 220px", fontSize: 13 }}>
                  <b>Visible para el cliente</b>
                  <div style={{ color: Th.muted }}>
                    {datos.visible_cliente
                      ? <>Código de acceso <span style={{ fontFamily: "var(--mono)", color: Th.text }}>{datos.codigo_cliente}</span>. La vista del cliente para expedientes llega en una próxima etapa.</>
                      : "Apagado: el cliente no ve este expediente."}
                  </div>
                </div>
              </div>
            )}

            <div role="tablist" aria-label="Secciones del expediente" style={{ display: "flex", gap: 20, marginTop: 14, overflowX: "auto" }}>
              {PESTANAS.map(t => {
                const activa = pestana === t.k;
                return (
                  <button key={t.k} type="button" role="tab" id={`tab-exp-${t.k}`} aria-selected={activa} aria-controls={`panel-exp-${t.k}`} onClick={() => setPestana(t.k)}
                    style={{ flex: "none", background: "none", border: "none", borderBottom: `2px solid ${activa ? "var(--accent)" : "transparent"}`, padding: "8px 0 10px", cursor: "pointer", font: "inherit", fontSize: 14, fontWeight: activa ? 600 : 500, color: activa ? Th.text : Th.sub, whiteSpace: "nowrap" }}>
                    {t.l}{t.n ? <span className="num" style={{ marginLeft: 6, fontSize: 12, color: Th.muted }}>{t.n}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {!esNuevo && (
              <div {...panel("resumen")}>
                <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <CasoProximaAccion formData={datos} onChange={cambiar} Th={Th} />
                    <div style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px 10px", fontWeight: 700, fontSize: 15 }}>
                        Lo que viene
                        <span style={{ display: "flex", gap: 12 }}>
                          <button type="button" onClick={() => setPestana("plazos")} style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, cursor: "pointer", fontSize: 13, padding: 0 }}>Plazos</button>
                          <button type="button" onClick={() => setPestana("escritos")} style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, cursor: "pointer", fontSize: 13, padding: 0 }}>Escritos</button>
                        </span>
                      </div>
                      {pendientes.length === 0 && <div style={{ padding: "0 16px 16px", color: Th.muted, fontSize: 14 }}>Nada pendiente.</div>}
                      {pendientes.slice(0, 5).map(p => (
                        <div key={p.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "center", padding: "10px 16px", borderTop: `1px solid ${Th.border}` }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{p.titulo}</div>
                            <div style={{ fontSize: 12, color: Th.muted }}>{p.tipo === "escrito" ? "Escrito" : "Plazo procesal"}</div>
                          </div>
                          <ChipPendiente pendiente={p} cal={cal} jurisdiccion={juris} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={tarjeta}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                        Mensaje al cliente
                        {expediente.mensaje_cliente_fecha && <span style={{ fontSize: 12, fontWeight: 500, color: Th.muted }}>{fmtDate(expediente.mensaje_cliente_fecha)}</span>}
                      </div>
                      <textarea value={datos.mensaje_cliente} onChange={e => cambiar("mensaje_cliente", e.target.value)} rows={4}
                        placeholder="Qué novedades le contás al cliente" style={{ ...campo, resize: "vertical" }} />
                    </div>
                    <div style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px 10px", fontWeight: 700, fontSize: 15 }}>
                        Últimos movimientos
                        <button type="button" onClick={() => setPestana("bitacora")} style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, cursor: "pointer", fontSize: 13, padding: 0 }}>Bitácora</button>
                      </div>
                      {acciones.length === 0 && <div style={{ padding: "0 16px 16px", color: Th.muted, fontSize: 14 }}>Sin movimientos.</div>}
                      {acciones.slice(0, 4).map(a => (
                        <div key={a.id} style={{ display: "grid", gridTemplateColumns: "64px minmax(0, 1fr)", gap: 10, padding: "9px 16px", borderTop: `1px solid ${Th.border}`, fontSize: 14 }}>
                          <span className="num" style={{ color: Th.muted }}>{fmtDate(a.fecha)}</span><span style={{ overflowWrap: "anywhere" }}>{a.descripcion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div {...panel("datos")} style={{ display: pestana === "datos" ? "flex" : "none", flexDirection: "column", gap: 16 }}>
              <div style={tarjeta}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Expediente</div>
                <div style={grilla}>
                  <Campo label="Carátula" k="caratula" datos={datos} onChange={cambiar} ancho />
                  <Campo label="Fuero" k="fuero" datos={datos} onChange={cambiar} opciones={FUEROS} />
                  <Campo label="Jurisdicción" k="jurisdiccion" datos={datos} onChange={cambiar} opciones={JURISDICCIONES} />
                  <Campo label="Juzgado" k="juzgado" datos={datos} onChange={cambiar} />
                  <Campo label="Secretaría" k="secretaria" datos={datos} onChange={cambiar} />
                  <Campo label="Número de expediente" k="numero" datos={datos} onChange={cambiar} />
                  <Campo label="Inicio" k="fecha_inicio" datos={datos} onChange={cambiar} tipo="date" />
                  {esNuevo && <Campo label="Estado" k="estado" datos={datos} onChange={cambiar} opciones={ESTADOS_EXPEDIENTE} />}
                </div>
              </div>
              <div style={tarjeta}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Partes</div>
                <div style={grilla}>
                  <Campo label="Cliente" k="cliente_nombre" datos={datos} onChange={cambiar} />
                  <Campo label="DNI del cliente" k="cliente_dni" datos={datos} onChange={cambiar} />
                  <Campo label="Teléfono" k="cliente_telefono" datos={datos} onChange={cambiar} tipo="tel" />
                  <Campo label="Mail" k="cliente_email" datos={datos} onChange={cambiar} tipo="email" />
                  <Campo label="Rol del cliente" k="rol_cliente" datos={datos} onChange={cambiar} opciones={ROLES_CLIENTE} />
                  <Campo label="Contraparte" k="contraparte" datos={datos} onChange={cambiar} />
                  <Campo label="Letrado contrario" k="letrado_contrario" datos={datos} onChange={cambiar} />
                </div>
              </div>
              <div style={tarjeta}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Honorarios y notas</div>
                <div style={grilla}>
                  <Campo label="Honorarios pactados" k="honorarios_pactados" datos={datos} onChange={cambiar} />
                  <label><span style={etiqueta}>Cobrado hasta ahora</span>
                    <CampoMonto value={datos.honorarios_cobrados} onChange={v => cambiar("honorarios_cobrados", v)} style={campo} /></label>
                  <Campo label="Notas" k="notas" datos={datos} onChange={cambiar} tipo="textarea" ancho />
                </div>
              </div>
              {esNuevo
                ? <div style={{ display: "flex", gap: 8 }}>
                    <Boton variante="primario" onClick={crear} disabled={creando}>{creando ? "Creando…" : "Crear expediente"}</Boton>
                    <Boton variante="fantasma" onClick={onClose}>Cancelar</Boton>
                  </div>
                : <div><Boton variante="peligro" tamaño="sm" onClick={borrar}>Eliminar expediente</Boton></div>}
            </div>

            {!esNuevo && <>
              <div {...panel("plazos")}>
                <ListaPendientes tipo="plazo" expediente={{ ...expediente, jurisdiccion: juris }} plazos={plazos} cal={cal} onCambio={onPlazo} setToast={setToast} />
              </div>
              <div {...panel("escritos")}>
                <ListaPendientes tipo="escrito" expediente={expediente} plazos={plazos} cal={cal} onCambio={onPlazo} setToast={setToast} />
              </div>
              <div {...panel("documentos")}>
                <div style={tarjeta}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Carpeta del expediente</div>
                  <CarpetaLocal Th={Th} onToast={setToast} onPreview={setPreviewArchivo} version={0}
                    caso={{ id, asegurado: datos.caratula, compania_aseguradora: datos.juzgado ? `Juzg. ${datos.juzgado}` : datos.fuero, fecha_siniestro: datos.fecha_inicio }}
                    onDirHandleChange={h => { dirHandleRef.current = h; }} />
                </div>
              </div>
              <div {...panel("bitacora")}>
                <SeccionTimeline acciones={acciones} loading={cargandoAcciones} onCrear={crearAccion} onActualizar={actualizarAccion} onEliminar={eliminarAccion} Th={Th} />
              </div>
            </>}
          </div>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
      {previewArchivo && <PreviewModal archivo={previewArchivo} onClose={() => setPreviewArchivo(null)} />}
    </>
  );
}
