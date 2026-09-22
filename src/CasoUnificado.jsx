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
import CasoFooter from "./components/caso/CasoFooter.jsx";

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
  "fecha_cobro_honorarios","compania_aseguradora","monto_reclamado","pas_id", "proxima_accion",
  "patente", "mensaje_cliente"
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

export default function CasoUnificado({ caso: casoProp, pasId, pasNombre, darkMode, onUpdate, onClose, companias, onAgregarCompania }) {
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
    monto_comision_pas: casoProp.monto_comision_pas || "", notas_log: casoProp.notas_log || [], proxima_accion: casoProp.proxima_accion || "",
    patente: casoProp.patente || "",
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
    await categorizarArchivo({ pasId, casoId: caso.id, archivo, tipo, archivos, onSuccess: ({ nuevoNombre }) => { setToast({ msg: `✅ Renombrado como ${nuevoNombre}`, type: "success" }); recargarArchivos(); }, onError: msg => setToast({ msg, type: "error" }) });
  };

  const handleRenombrarArchivo = async (archivo, nuevoNombre) => {
    await renombrarArchivo({ pasId, casoId: caso.id, archivo, nuevoNombre, onSuccess: ({ nuevoNombre: n }) => { setToast({ msg: `✅ Renombrado como ${n}`, type: "success" }); recargarArchivos(); }, onError: msg => setToast({ msg, type: "error" }) });
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
    setToast({ msg: "✅ Acción registrada", type: "success" });
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
    setToast({ msg: "✅ Acción actualizada", type: "success" });
    await cargarAcciones();
  };

  const handleEliminarAccion = async (accionId) => {
    if (!confirm("¿Eliminar esta acción?")) return;
    const { error } = await supabase.from("acciones").delete().eq("id", accionId);
    if (error) { setToast({ msg: "Error: " + error.message, type: "error" }); return; }
    setToast({ msg: "✅ Acción eliminada", type: "success" });
    await cargarAcciones();
  };

  const guardarCaso = useCallback(async () => {
    setGuardando(true);
    try {
      const updated = { ...caso, ...formData, id: caso.id || generateUUID(), caso_id: caso.caso_id || Date.now(), pas_id: parseInt(pasId, 10), estado_honorarios: formData.estado_honorarios || "NO_FACTURADO" };
      const { error } = await supabase.from("pas_casos").upsert([pickCols(updated)]);
      if (!error) { setCaso(updated); setToast({ msg: "✓ Caso guardado", type: "success" }); onUpdate?.(updated); }
      else setToast({ msg: "Error: " + (error.message || "desconocido"), type: "error" });
    } catch (e) { setToast({ msg: "Error: " + e.message, type: "error" }); }
    setGuardando(false);
  }, [caso, formData, onUpdate, pasId]);

  useEffect(() => { guardarCasoRef.current = guardarCaso; }, [guardarCaso]);

  const handleFormChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
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

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 400 }} onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 401, width: "100%", maxWidth: 900, maxHeight: "90vh", overflow: "auto", padding: 16 }}>
        <div style={{ background: Th.bg, border: `1px solid ${Th.border}`, borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>

          {/* Header */}
          <div style={{ position: "sticky", top: 0, background: Th.card, borderBottom: `1px solid ${Th.border}`, padding: "18px 24px", zIndex: 50 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: Th.text }}>{formData.asegurado}</div>
                <div style={{ fontSize: 13, color: Th.muted, marginTop: 4 }}>
                  {formData.compania_aseguradora && `${formData.compania_aseguradora} • `}
                  {caso.fecha_derivacion && `Derivado ${formatoFecha(caso.fecha_derivacion)}`}
                </div>
              </div>
              <button onClick={onClose} style={{ background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 8, color: Th.sub, padding: "8px 12px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>✕</button>
            </div>
          </div>

          <div style={{ padding: 24 }}>
            <CasoProximaAccion formData={formData} onChange={handleFormChange} Th={Th} />
            <SeccionInfo formData={formData} onChange={handleFormChange} darkMode={darkMode} Th={Th} companias={companias} onAgregarCompania={onAgregarCompania} />
            
            <CasoDocumentos Th={Th} caso={caso} archivos={archivos} archivosActualizando={archivosActualizando} setToast={setToast} setPreviewArchivo={setPreviewArchivo} dirHandleRef={dirHandleRef} handleCategorizarArchivo={handleCategorizarArchivo} handleRenombrarArchivo={handleRenombrarArchivo} />

            <SeccionMontos formData={formData} onChange={handleFormChange} Th={Th} />
            <SeccionHonorarios formData={formData} onChange={handleFormChange} Th={Th} />
            <SeccionFechas formData={formData} onChange={handleFormChange} Th={Th} />
            
            <SeccionTimeline 
              acciones={acciones} 
              loading={loadingAcciones} 
              onCrear={handleCrearAccion} 
              onActualizar={handleActualizarAccion} 
              onEliminar={handleEliminarAccion} 
              Th={Th} 
            />

            <CasoFooter Th={Th} setModalEscrito={setModalEscrito} handleExportarPDF={handleExportarPDF} exportandoPDF={exportandoPDF} recargarArchivos={recargarArchivos} archivosActualizando={archivosActualizando} onClose={onClose} guardarCaso={guardarCaso} guardando={guardando} />
          </div>
        </div>
      </div>

      {previewArchivo && <PreviewModal archivo={previewArchivo} onClose={() => setPreviewArchivo(null)} />}

      <ModalGenerarEscrito isOpen={modalEscrito} onClose={() => setModalEscrito(false)} caso={caso} pasId={pasId} dirHandle={dirHandleRef.current} Th={Th} onSuccess={({ guardadoEn }) => { setToast({ msg: `✓ PDF guardado en ${guardadoEn === "carpeta" ? "carpeta del caso" : "Descargas"}`, type: "success" }); if (guardadoEn === "carpeta") recargarArchivos(); }} onError={msg => setToast({ msg, type: "error" })} />
      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </>
  );
}