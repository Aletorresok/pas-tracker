import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";
import { formatoFecha, getExtension } from "./utils/formatters.js";
import { THEME } from "./utils/theme.js";
import { Toast, PreviewModal } from "./components/casoDetalleComponents.jsx";
import { cargarArchivos } from "./utils/carpeta.js";
import { categorizarArchivo, renombrarArchivo } from "./utils/categorizarArchivo.js";
import { exportarCasoPDF } from "./utils/exportarCasoPDF.js";
import { useRealtimeSync, useRealtimeAcciones } from "./hooks/useRealtimeSync.js";

import SeccionInfo from "./components/caso/SeccionInfo.jsx";
import SeccionMontos from "./components/caso/SeccionMontos.jsx";
import SeccionHonorarios from "./components/caso/SeccionHonorarios.jsx";
import SeccionFechas from "./components/caso/SeccionFechas.jsx";
import SeccionTimeline from "./components/caso/SeccionTimeline.jsx";
import CasoProximaAccion from "./components/caso/CasoProximaAccion.jsx";
import ModalGenerarEscrito from "./components/caso/ModalGenerarEscrito.jsx";
import CasoDocumentos from "./components/caso/CasoDocumentos.jsx";
import ChecklistDocumental from "./components/caso/ChecklistDocumental.jsx";
import EtapasCaso from "./components/caso/EtapasCaso.jsx";
import RecepcionCliente from "./components/caso/RecepcionCliente.jsx";
import { pendientesRecepcion, escucharRecepcion } from "./utils/subidasCliente.js";
import ResumenCaso from "./components/caso/ResumenCaso.jsx";
import Boton from "./components/ui/Boton.jsx";
import Icono from "./components/ui/Icono.jsx";
import { ESTADOS_CASO } from "./constants.js";

const PAS_CASOS_COLS = new Set([
  "id","caso_id","asegurado","dni_asegurado","estado","nota","nro_siniestro",
  "fecha_siniestro","ubicacion","presupuesto","tercero_nombre","tercero_dni","tercero_contacto",
  "vehiculo","motor","chasis","vehiculo_tercero","dominio_tercero","relato","comentarios",
  "fecha_derivacion","fecha_contacto_asegurado","fecha_inicio_reclamo","fecha_ultimo_movimiento",
  "monto_ofrecimiento","monto_cobro_asegurado","monto_cobro_yo","monto_comision_pas","recordatorio",
  "notas_log","created_at","carpeta_path","primer_ofrecimiento","segundo_ofrecimiento","fecha_carga",
  "fecha_reclamo","fecha_ultimo_reclamo","fecha_ofrecimiento","fecha_reconsideracion","fecha_aceptacion",
  "fecha_firma","fecha_pago","fecha_cobro","fecha_mediacion","fecha_inicio_juicio","monto_acordado",
  "plazo_pago","porcentaje_honorarios","monto_honorarios","estado_honorarios","fecha_factura",
  "fecha_cobro_honorarios","compania_aseguradora","monto_reclamado","pas_id", "proxima_accion", "proxima_accion_vence",
  "patente", "mensaje_cliente", "telefono_asegurado", "documentacion"
]);

const pickCols = (obj) => Object.fromEntries(
  Object.entries(obj).filter(([k]) => PAS_CASOS_COLS.has(k)).map(([k, v]) => [k, v === "" ? null : v])
);

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export default function CasoUnificado({ caso: casoProp, pasId, pasNombre, pasTelefono = "", pestanaInicial, darkMode, onUpdate, onClose, companias, onAgregarCompania }) {
  const Th = THEME(darkMode);

  const [caso, setCaso] = useState(casoProp);
  const [archivos, setArchivos] = useState([]);
  const [archivosActualizando, setArchivosActualizando] = useState(false);
  const [previewArchivo, setPreviewArchivo] = useState(null);
  const [toast, setToast] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [acciones, setAcciones] = useState([]);
  const [loadingAcciones, setLoadingAcciones] = useState(false);
  const [modalEscrito, setModalEscrito] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [pestana, setPestana] = useState(pestanaInicial || "resumen");
  const [estadoGuardado, setEstadoGuardado] = useState("guardado"); // guardado | pendiente | guardando | error
  const [deshacer, setDeshacer] = useState(null); // { anterior, nuevo }
  const dirHandleRef = useRef(null);

  const [formData, setFormData] = useState({
    asegurado: casoProp.asegurado || "", compania_aseguradora: casoProp.compania_aseguradora || "", fecha_siniestro: casoProp.fecha_siniestro || "",
    estado: casoProp.estado || "doc_pendiente", monto_reclamado: casoProp.monto_reclamado || "", monto_ofrecimiento: casoProp.monto_ofrecimiento || "",
    estado_honorarios: casoProp.estado_honorarios || "NO_FACTURADO", monto_honorarios: casoProp.monto_honorarios || "", fecha_factura: casoProp.fecha_factura || "",
    fecha_cobro_honorarios: casoProp.fecha_cobro_honorarios || "", fecha_derivacion: casoProp.fecha_derivacion || "", fecha_contacto_asegurado: casoProp.fecha_contacto_asegurado || "",
    fecha_inicio_reclamo: casoProp.fecha_inicio_reclamo || "", fecha_ultimo_movimiento: casoProp.fecha_ultimo_movimiento || "", fecha_carga: casoProp.fecha_carga || "",
    fecha_reclamo: casoProp.fecha_reclamo || "", fecha_ultimo_reclamo: casoProp.fecha_ultimo_reclamo || "", fecha_ofrecimiento: casoProp.fecha_ofrecimiento || "",
    fecha_reconsideracion: casoProp.fecha_reconsideracion || "", fecha_aceptacion: casoProp.fecha_aceptacion || "", fecha_firma: casoProp.fecha_firma || "",
    fecha_pago: casoProp.fecha_pago || "", fecha_cobro: casoProp.fecha_cobro || "", fecha_mediacion: casoProp.fecha_mediacion || "",
    fecha_inicio_juicio: casoProp.fecha_inicio_juicio || "", monto_cobro_asegurado: casoProp.monto_cobro_asegurado || "", monto_cobro_yo: casoProp.monto_cobro_yo || "",
    monto_comision_pas: casoProp.monto_comision_pas || "", notas_log: casoProp.notas_log || [], proxima_accion: casoProp.proxima_accion || "", proxima_accion_vence: casoProp.proxima_accion_vence || "",
    documentacion: casoProp.documentacion, patente: casoProp.patente || "", dni_asegurado: casoProp.dni_asegurado || "", telefono_asegurado: casoProp.telefono_asegurado || "",
    mensaje_cliente: casoProp.mensaje_cliente || ""
  });

  const initialFormRef = useRef(JSON.stringify(formData));
  const autoSaveTimerRef = useRef(null);
  const guardarCasoRef = useRef(null);

  useEffect(() => {
    const current = JSON.stringify(formData);
    if (current === initialFormRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => { guardarCasoRef.current?.(); }, 2500);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [formData]);

  useEffect(() => { recargarArchivos(); cargarAcciones(); }, [caso.id]);

  // Documentación que mandó el cliente desde su vista y todavía está en la nube
  const [recepcion, setRecepcion] = useState([]);
  const [versionCarpeta, setVersionCarpeta] = useState(0);
  useEffect(() => {
    if (!caso.id) return;
    const cargar = () => pendientesRecepcion(caso.id).then(d => setRecepcion(d || []));
    cargar();
    return escucharRecepcion(cargar);
  }, [caso.id]);

  useRealtimeSync("pas_casos", "id", caso.id, (dato) => { setCaso(dato); setFormData(p => ({ ...p, ...dato })); });
  useRealtimeAcciones(caso.id, () => { cargarAcciones(); });

  const recargarArchivos = async () => {
    setArchivosActualizando(true);
    await cargarArchivos({ pasId, casoId: caso.id, getExtension, onSuccess: setArchivos, onError: msg => setToast({ msg, type: "error" }) });
    setArchivosActualizando(false);
  };

  const cargarAcciones = async () => {
    if (!caso.id) return;
    setLoadingAcciones(true);
    const { data, error } = await supabase.from("acciones").select("*").eq("caso_id", caso.id).order("fecha", { ascending: false });
    if (!error) setAcciones(data || []);
    setLoadingAcciones(false);
  };

  const handleCategorizarArchivo = async (archivo, tipo) => {
    await categorizarArchivo({ pasId, casoId: caso.id, archivo, tipo, archivos, onSuccess: ({ nuevoNombre }) => { setToast({ msg: `Renombrado como ${nuevoNombre}`, type: "success" }); recargarArchivos(); }, onError: msg => setToast({ msg, type: "error" }) });
  };

  const handleRenombrarArchivo = async (archivo, nuevoNombre) => {
    await renombrarArchivo({ pasId, casoId: caso.id, archivo, nuevoNombre, onSuccess: ({ nuevoNombre: n }) => { setToast({ msg: `Renombrado como ${n}`, type: "success" }); recargarArchivos(); }, onError: msg => setToast({ msg, type: "error" }) });
  };

  const handleCrearAccion = async ({ fecha, descripcion }) => {
    const { error } = await supabase.from("acciones").insert({ 
      caso_id: caso.id, 
      descripcion, 
      fecha, 
      tipo: "nota" 
    });
    if (error) { 
      setToast({ msg: "Error al crear: " + error.message, type: "error" }); 
      return; 
    }
    setToast({ msg: "Acción registrada", type: "success" });
    await cargarAcciones();
  };

  const handleActualizarAccion = async ({ id, fecha, descripcion }) => {
    const { error } = await supabase
      .from("acciones")
      .update({ descripcion, fecha, tipo: "nota" })
      .eq("id", id);
      
    if (error) { 
      setToast({ msg: "Error al actualizar: " + error.message, type: "error" }); 
      return; 
    }
    setToast({ msg: "Acción actualizada", type: "success" });
    await cargarAcciones();
  };

  const handleEliminarAccion = async (accionId) => {
    if (!confirm("¿Eliminar esta acción?")) return;
    const { error } = await supabase.from("acciones").delete().eq("id", accionId);
    if (error) { setToast({ msg: "Error: " + error.message, type: "error" }); return; }
    setToast({ msg: "Acción eliminada", type: "success" });
    await cargarAcciones();
  };

  const guardarCaso = useCallback(async () => {
    setGuardando(true);
    setEstadoGuardado("guardando");
    try {
      const updated = { ...caso, ...formData, id: caso.id || generateUUID(), caso_id: caso.caso_id || Date.now(), pas_id: parseInt(pasId, 10), estado_honorarios: formData.estado_honorarios || "NO_FACTURADO" };
      const fila = pickCols(updated);
      // Si la columna del plazo todavía no existe en la base, no la mandamos (evita error al guardar)
      if (!("proxima_accion_vence" in casoProp) && !fila.proxima_accion_vence) delete fila.proxima_accion_vence;
      // Checklist manual: solo se manda si la columna ya existe en la base
      if (!("documentacion" in casoProp) || fila.documentacion === undefined) delete fila.documentacion;
      const { error } = await supabase.from("pas_casos").upsert([fila]);
      if (!error) { setCaso(updated); setEstadoGuardado("guardado"); onUpdate?.(updated); }
      else { setEstadoGuardado("error"); setToast({ msg: "No se pudo guardar: " + (error.message || "error desconocido"), type: "error" }); }
    } catch (e) { setEstadoGuardado("error"); setToast({ msg: "No se pudo guardar: " + e.message, type: "error" }); }
    setGuardando(false);
  }, [caso, formData, onUpdate, pasId]);

  useEffect(() => { guardarCasoRef.current = guardarCaso; }, [guardarCaso]);

  const handleFormChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setEstadoGuardado("pendiente");
  };

  // Cambiar estado desde la línea de etapas; Cobrado/Desistido se pueden deshacer 6 s
  const cambiarEstado = (nuevo) => {
    if (nuevo === formData.estado) return;
    if (["cobrado", "desistido"].includes(nuevo)) setDeshacer({ anterior: formData.estado, nuevo });
    handleFormChange("estado", nuevo);
  };
  useEffect(() => {
    if (!deshacer) return;
    const t = setTimeout(() => setDeshacer(null), 6000);
    return () => clearTimeout(t);
  }, [deshacer]);

  // Al cerrar con cambios sin guardar, guarda primero
  const cerrar = async () => {
    if (estadoGuardado === "pendiente" || estadoGuardado === "error") {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      await guardarCasoRef.current?.();
    }
    onClose();
  };

  const handleExportarPDF = async () => {
    setExportandoPDF(true);
    await exportarCasoPDF({ 
      caso: { ...caso, ...formData }, pasNombre: pasNombre || "", acciones, 
      onSuccess: ({ nombreArchivo }) => setToast({ msg: `✓ PDF descargado: ${nombreArchivo}`, type: "success" }), 
      onError: msg => setToast({ msg, type: "error" }) 
    });
    setExportandoPDF(false);
  };

  const PESTANAS = [
    { k: "resumen", l: "Resumen" },
    { k: "datos", l: "Datos" },
    { k: "montos", l: "Montos y honorarios" },
    { k: "documentos", l: recepcion.length ? `Documentos · ${recepcion.length} nuevo${recepcion.length > 1 ? "s" : ""}` : "Documentos", n: recepcion.length ? undefined : archivos.length },
    { k: "bitacora", l: "Bitácora", n: acciones.length },
  ];
  const TEXTO_GUARDADO = { guardado: "✓ Guardado", pendiente: "Sin guardar…", guardando: "Guardando…", error: "No se guardó · reintentar" };
  const COLOR_GUARDADO = { guardado: "var(--ok)", pendiente: "var(--muted)", guardando: "var(--muted)", error: "var(--warn)" };
  const panel = (k) => ({ hidden: pestana !== k, role: "tabpanel", id: `panel-${k}`, "aria-labelledby": `tab-${k}` });

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 400 }} onClick={cerrar} />
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label={`Caso de ${formData.asegurado || "asegurado"}`}
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 401, width: "100%", maxWidth: 1000, maxHeight: "92vh", overflow: "auto", padding: 16 }}>
        <div style={{ background: Th.bg, border: `1px solid ${Th.border}`, borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.4)", minHeight: "60vh" }}>

          {/* Encabezado fijo: identidad, acciones, etapas y pestañas */}
          <div className="modal-sticky" style={{ position: "sticky", background: Th.card, borderRadius: "16px 16px 0 0", borderBottom: `1px solid ${Th.border}`, padding: "16px 20px 0", zIndex: 50 }}>
            <button type="button" onClick={cerrar} aria-label="Cerrar" style={{ position: "absolute", top: 14, right: 16, background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 8, color: Th.sub, width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer" }}>
              <Icono nombre="cerrar" size={16} />
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", paddingRight: 44 }}>
              <div style={{ minWidth: 0, flex: "1 1 280px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: Th.text, letterSpacing: -0.3, overflowWrap: "anywhere" }}>{formData.asegurado || "Sin nombre"}</div>
                <div style={{ fontSize: 13, color: Th.sub, marginTop: 4, display: "flex", flexWrap: "wrap", gap: "4px 10px", alignItems: "center" }}>
                  {formData.patente && <span style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: 12, border: `1.5px solid ${Th.text}`, color: Th.text, borderRadius: 4, padding: "0 6px", letterSpacing: 0.5 }}>{formData.patente}</span>}
                  {formData.compania_aseguradora && <span>{formData.compania_aseguradora}</span>}
                  {pasNombre && <span>PAS {pasNombre}</span>}
                  {caso.fecha_derivacion && <span>derivado {formatoFecha(caso.fecha_derivacion)}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span role="status" style={{ fontSize: 12, fontWeight: 600, color: COLOR_GUARDADO[estadoGuardado], marginRight: 4 }}>
                  {estadoGuardado === "error"
                    ? <button type="button" onClick={() => guardarCasoRef.current?.()} style={{ background: "none", border: "none", color: "inherit", font: "inherit", cursor: "pointer", padding: 0, textDecoration: "underline" }}>{TEXTO_GUARDADO.error}</button>
                    : TEXTO_GUARDADO[estadoGuardado]}
                </span>
                <Boton tamaño="sm" icono="pdf" onClick={handleExportarPDF} disabled={exportandoPDF}>{exportandoPDF ? "Exportando…" : "PDF"}</Boton>
                <Boton tamaño="sm" variante="primario" icono="escrito" onClick={() => setModalEscrito(true)}>Generar escrito</Boton>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <EtapasCaso estado={formData.estado} onChange={cambiarEstado} />
              {deshacer && (
                <div role="status" style={{ marginTop: 10, display: "inline-flex", gap: 12, alignItems: "center", background: "var(--text)", color: "var(--bg)", borderRadius: 8, padding: "6px 12px", fontSize: 13 }}>
                  Estado cambiado a {ESTADOS_CASO.find(e => e.key === deshacer.nuevo)?.label}
                  <button type="button" onClick={() => { handleFormChange("estado", deshacer.anterior); setDeshacer(null); }}
                    style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 13 }}>Deshacer</button>
                </div>
              )}
            </div>

            <div role="tablist" aria-label="Secciones del caso" style={{ display: "flex", gap: 20, marginTop: 14, overflowX: "auto" }}>
              {PESTANAS.map(t => {
                const activa = pestana === t.k;
                return (
                  <button key={t.k} type="button" role="tab" id={`tab-${t.k}`} aria-selected={activa} aria-controls={`panel-${t.k}`} onClick={() => setPestana(t.k)}
                    style={{ flex: "none", background: "none", border: "none", borderBottom: `2px solid ${activa ? "var(--accent)" : "transparent"}`, padding: "8px 0 10px", cursor: "pointer", font: "inherit", fontSize: 14, fontWeight: activa ? 600 : 500, color: activa ? Th.text : Th.sub, whiteSpace: "nowrap" }}>
                    {t.l}{t.n ? <span className="num" style={{ marginLeft: 6, fontSize: 12, color: Th.muted }}>{t.n}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: 20 }}>
            {/* Todas las pestañas quedan montadas (ocultas) para no perder la carpeta local vinculada */}
            <div {...panel("resumen")}>
              <ResumenCaso recepcionNuevos={recepcion.length} casoId={caso.id} nroSiniestro={caso.nro_siniestro} pasNombre={pasNombre} pasTelefono={pasTelefono} tercero_contacto={caso.tercero_contacto} formData={formData} onChange={handleFormChange} acciones={acciones} onCrearAccion={handleCrearAccion} irA={setPestana} Th={Th} />
            </div>
            <div {...panel("datos")}>
              <SeccionInfo formData={formData} onChange={handleFormChange} darkMode={darkMode} Th={Th} companias={companias} onAgregarCompania={onAgregarCompania} />
              <SeccionFechas formData={formData} onChange={handleFormChange} Th={Th} />
            </div>
            <div {...panel("montos")}>
              <SeccionMontos formData={formData} onChange={handleFormChange} Th={Th} />
              <SeccionHonorarios formData={formData} onChange={handleFormChange} Th={Th} />
            </div>
            <div {...panel("documentos")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: Th.text }}>Documentación para el reclamo</span>
                <Boton tamaño="sm" icono="recargar" onClick={recargarArchivos} disabled={archivosActualizando}>{archivosActualizando ? "Actualizando…" : "Actualizar archivos"}</Boton>
              </div>
              <RecepcionCliente pendientes={recepcion} dirHandleRef={dirHandleRef} setToast={setToast} Th={Th} onGuardado={() => setVersionCarpeta(v => v + 1)} />
              <div style={{ marginBottom: 16 }}><ChecklistDocumental documentacion={formData.documentacion} onChange={v => handleFormChange("documentacion", v)} Th={Th} /></div>
              <CasoDocumentos versionCarpeta={versionCarpeta} Th={Th} caso={caso} archivos={archivos} archivosActualizando={archivosActualizando} setToast={setToast} setPreviewArchivo={setPreviewArchivo} dirHandleRef={dirHandleRef} handleCategorizarArchivo={handleCategorizarArchivo} handleRenombrarArchivo={handleRenombrarArchivo} />
            </div>
            <div {...panel("bitacora")}>
              <SeccionTimeline acciones={acciones} loading={loadingAcciones} onCrear={handleCrearAccion} onActualizar={handleActualizarAccion} onEliminar={handleEliminarAccion} Th={Th} />
            </div>
          </div>
        </div>
      </div>

      {previewArchivo && <PreviewModal archivo={previewArchivo} onClose={() => setPreviewArchivo(null)} />}

      <ModalGenerarEscrito dniInicial={formData.dni_asegurado} onDniNuevo={v => handleFormChange("dni_asegurado", v)} isOpen={modalEscrito} onClose={() => setModalEscrito(false)} caso={caso} pasId={pasId} dirHandle={dirHandleRef.current} Th={Th} onSuccess={({ guardadoEn }) => { setToast({ msg: `✓ PDF guardado en ${guardadoEn === "carpeta" ? "carpeta del caso" : "Descargas"}`, type: "success" }); if (guardadoEn === "carpeta") recargarArchivos(); }} onError={msg => setToast({ msg, type: "error" })} />
      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </>
  );
}