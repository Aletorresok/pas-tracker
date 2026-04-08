// CasoUnificado.jsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";
import { ESTADOS_HONORARIOS, formatoFecha, diasDesde, getExtension, THEME } from "./utils/casoDetalleUtils.js";
import { Toast, PreviewModal, ArchivoRow, ChecklistDocumental } from "./components/casoDetalleComponents.jsx";
import { cargarArchivos } from "./utils/carpeta.js";
import { categorizarArchivo, renombrarArchivo } from "./utils/categorizarArchivo.js";
import { generarEscrito } from "./utils/generarEscrito.js";
import { CarpetaLocal } from "./components/CarpetaLocal.jsx";

export default function CasoUnificado({ caso: casoProp, pasId, darkMode, onUpdate, onClose }) {
  const Th = THEME(darkMode);

  // Estado local: siempre usamos una copia editable
  const [caso, setCaso] = useState(casoProp);
  const [archivos, setArchivos] = useState([]);
  const [archivosActualizando, setArchivosActualizando] = useState(false);
  const [previewArchivo, setPreviewArchivo] = useState(null);
  const [toast, setToast] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Formulario editable
  const [formData, setFormData] = useState({
    asegurado: casoProp.asegurado || "",
    compania_aseguradora: casoProp.compania_aseguradora || "",
    fecha_siniestro: casoProp.fecha_siniestro || "",
    estado: casoProp.estado || "doc_pendiente",
    monto_reclamado: casoProp.monto_reclamado || "",
    monto_ofrecimiento: casoProp.monto_ofrecimiento || "",
    estado_honorarios: casoProp.estado_honorarios || "NO_FACTURADO",
    monto_honorarios: casoProp.monto_honorarios || "",
    fecha_factura: casoProp.fecha_factura || "",
    fecha_cobro_honorarios: casoProp.fecha_cobro_honorarios || "",
    // Fechas
    fecha_derivacion: casoProp.fecha_derivacion || "",
    fecha_contacto_asegurado: casoProp.fecha_contacto_asegurado || "",
    fecha_inicio_reclamo: casoProp.fecha_inicio_reclamo || "",
    fecha_ultimo_movimiento: casoProp.fecha_ultimo_movimiento || "",
    fecha_carga: casoProp.fecha_carga || "",
    fecha_reclamo: casoProp.fecha_reclamo || "",
    fecha_ultimo_reclamo: casoProp.fecha_ultimo_reclamo || "",
    fecha_ofrecimiento: casoProp.fecha_ofrecimiento || "",
    fecha_reconsideracion: casoProp.fecha_reconsideracion || "",
    fecha_aceptacion: casoProp.fecha_aceptacion || "",
    fecha_firma: casoProp.fecha_firma || "",
    fecha_pago: casoProp.fecha_pago || "",
    fecha_cobro: casoProp.fecha_cobro || "",
    fecha_mediacion: casoProp.fecha_mediacion || "",
    fecha_inicio_juicio: casoProp.fecha_inicio_juicio || "",
    monto_cobro_asegurado: casoProp.monto_cobro_asegurado || "",
    monto_cobro_yo: casoProp.monto_cobro_yo || "",
    monto_comision_pas: casoProp.monto_comision_pas || "",
    notas_log: casoProp.notas_log || [],
  });

  const [acciones, setAcciones] = useState([]);
  const [loadingAcciones, setLoadingAcciones] = useState(false);
  const [modalEscrito, setModalEscrito] = useState(false);
  const [dniEscrito, setDniEscrito] = useState("");
  const [generandoEscrito, setGenerandoEscrito] = useState(false);

  const diasDesdeFactura = formData.fecha_factura ? diasDesde(formData.fecha_factura) : null;
  const honorariosVencidos = formData.estado_honorarios === "FACTURADO" && diasDesdeFactura && diasDesdeFactura > 30;

  useEffect(() => {
    recargarArchivos();
    cargarAcciones();
  }, [caso.id]);

  const recargarArchivos = async () => {
    setArchivosActualizando(true);
    await cargarArchivos({
      pasId,
      casoId: caso.id,
      getExtension,
      onSuccess: (lista) => setArchivos(lista),
      onError: (msg) => setToast({ msg, type: "error" }),
    });
    setArchivosActualizando(false);
  };

const cargarAcciones = async () => {
  if (!caso.id) return;
  setLoadingAcciones(true);
  try {
    const { data, error } = await supabase
      .from("acciones")
      .select("*")
      .eq("caso_id", caso.id)
      .order("fecha", { ascending: false });
    if (!error) setAcciones(data || []);
  } catch (e) {
    console.error("Error cargando acciones:", e);
  }
  setLoadingAcciones(false);
};

  const handleCategorizarArchivo = async (archivo, tipo) => {
    await categorizarArchivo({
      pasId,
      casoId: caso.id,
      archivo,
      tipo,
      archivos,
      onSuccess: ({ nuevoNombre }) => {
        setToast({ msg: `✅ Renombrado como ${nuevoNombre}`, type: "success" });
        recargarArchivos();
      },
      onError: (msg) => setToast({ msg, type: "error" }),
    });
  };

  const handleRenombrarArchivo = async (archivo, nuevoNombre) => {
  await renombrarArchivo({
    pasId,
    casoId: caso.id,
    archivo,
    nuevoNombre,
    onSuccess: ({ nuevoNombre: n }) => {
      setToast({ msg: `✅ Renombrado como ${n}`, type: "success" });
      recargarArchivos();
    },
    onError: (msg) => setToast({ msg, type: "error" }),
  });
};

  const handleGenerarEscrito = useCallback(async () => {
    setGenerandoEscrito(true);
    await generarEscrito({
      caso,
      pasId,
      dni: dniEscrito,
      onSuccess: ({ nombreArchivo, guardadoEn }) => {
        const donde = guardadoEn === "storage" ? "carpeta del caso" : "Descargas";
        setToast({ msg: `✓ PDF guardado en ${donde}`, type: "success" });
        setModalEscrito(false);
        setDniEscrito("");
        if (guardadoEn === "storage") recargarArchivos();
      },
      onError: (msg) => setToast({ msg, type: "error" }),
    });
    setGenerandoEscrito(false);
  }, [caso, pasId, dniEscrito]);

const guardarCaso = useCallback(async () => {
  setGuardando(true);
  try {
    const updated = {
      ...caso,
      ...formData,
      id: String(caso.id)
    };

    const { error } = await supabase
      .from("casos")
      .update(updated)
      .eq("id", String(caso.id));

    if (!error) {
      setCaso(updated);
      setToast({ msg: "✓ Caso guardado", type: "success" });
      onUpdate?.(updated);
    } else {
      setToast({ msg: "Error guardando caso", type: "error" });
    }
  } catch (e) {
    setToast({ msg: "Error: " + e.message, type: "error" });
  }
  setGuardando(false);
}, [caso, formData, onUpdate]);

  const handleFormChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;
  const sectionStyle = { background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        zIndex: 400,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflow: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: Th.bg,
          border: `1px solid ${Th.border}`,
          borderRadius: 16,
          width: "100%",
          maxWidth: 900,
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,.4)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div style={{ position: "sticky", top: 0, background: Th.card, borderBottom: `1px solid ${Th.border}`, padding: "18px 24px", zIndex: 50 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: Th.text }}>{formData.asegurado}</div>
              <div style={{ fontSize: 13, color: Th.muted, marginTop: 4 }}>
                {formData.compania_aseguradora && `${formData.compania_aseguradora} • `}
                {caso.fecha_derivacion && `Derivado ${formatoFecha(caso.fecha_derivacion)}`}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: Th.card2,
                border: `1px solid ${Th.border}`,
                borderRadius: 8,
                color: Th.sub,
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div style={{ padding: "24px" }}>
          {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>📋 Información del caso</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <label>
                <span style={labelStyle}>Asegurado *</span>
                <input
                  type="text"
                  value={formData.asegurado}
                  onChange={e => handleFormChange("asegurado", e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label>
                <span style={labelStyle}>Compañía aseguradora</span>
                <input
                  type="text"
                  value={formData.compania_aseguradora}
                  onChange={e => handleFormChange("compania_aseguradora", e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <label>
                <span style={labelStyle}>Fecha del siniestro</span>
                <input
                  type="date"
                  value={formData.fecha_siniestro}
                  onChange={e => handleFormChange("fecha_siniestro", e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label>
                <span style={labelStyle}>Estado del caso</span>
                <select
                  value={formData.estado}
                  onChange={e => handleFormChange("estado", e.target.value)}
                  style={inputStyle}
                >
                  <option value="doc_pendiente">📎 Doc. pendiente</option>
                  <option value="iniciado">📋 Iniciado</option>
                  <option value="reclamado">📨 Reclamado</option>
                  <option value="con_ofrecimiento">💬 Ofrecimiento</option>
                  <option value="en_mediacion">🤝 Mediación</option>
                  <option value="en_juicio">⚖️ En juicio</option>
                  <option value="esperando_pago">💳 Esperando pago</option>
                  <option value="cobrado">✅ Cobrado</option>
                </select>
              </label>
            </div>
          </div>

{/* SECCIÓN 2: DOCUMENTOS */}
<div style={sectionStyle}>
  <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>📁 Documentos del caso</div>

  {/* Carpeta local PRIMERO — siempre visible */}
  <CarpetaLocal
    Th={Th}
    onToast={setToast}
    onPreview={(arch) => setPreviewArchivo(arch)}
  />

  {/* Separador */}
  <div style={{ borderTop: `1px solid ${Th.border}`, marginTop: 16, paddingTop: 16 }}>
    <ChecklistDocumental archivos={archivos} Th={Th} />

    {archivos.length === 0 && !archivosActualizando && (
      <div style={{ textAlign: "center", padding: "16px 0", color: Th.muted, fontSize: 13 }}>
        Sin archivos en este caso
      </div>
    )}

    {archivos.map(arch => (
      <ArchivoRow
        key={arch.nombre}
        archivo={arch}
        onPreview={() => setPreviewArchivo(arch)}
        onCategorizar={tipo => handleCategorizarArchivo(arch, tipo)}
        onRenombrar={nuevoNombre => handleRenombrarArchivo(arch, nuevoNombre)}
        Th={Th}
      />
    ))}
  </div>
</div>
          {/* SECCIÓN 3: MONTOS PRINCIPALES */}
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>💰 Montos</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                <span style={labelStyle}>Monto reclamado ($)</span>
                <input
                  type="number"
                  value={formData.monto_reclamado}
                  onChange={e => handleFormChange("monto_reclamado", e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label>
                <span style={labelStyle}>Monto ofrecimiento ($)</span>
                <input
                  type="number"
                  value={formData.monto_ofrecimiento}
                  onChange={e => handleFormChange("monto_ofrecimiento", e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label>
                <span style={labelStyle}>Lo que cobró el asegurado ($)</span>
                <input
                  type="number"
                  value={formData.monto_cobro_asegurado}
                  onChange={e => handleFormChange("monto_cobro_asegurado", e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label>
                <span style={labelStyle}>Mis honorarios ($)</span>
                <input
                  type="number"
                  value={formData.monto_cobro_yo}
                  onChange={e => handleFormChange("monto_cobro_yo", e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label>
                <span style={labelStyle}>Comisión PAS ($)</span>
                <input
                  type="number"
                  value={formData.monto_comision_pas}
                  onChange={e => handleFormChange("monto_comision_pas", e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
          </div>

          {/* SECCIÓN 4: HONORARIOS */}
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>🏦 Honorarios (facturación)</div>
            <label style={{ marginBottom: 12 }}>
              <span style={labelStyle}>Monto de honorarios ($)</span>
              <input
                type="number"
                value={formData.monto_honorarios}
                onChange={e => handleFormChange("monto_honorarios", e.target.value)}
                style={inputStyle}
              />
            </label>
            <div style={{ marginBottom: 12 }}>
              <span style={labelStyle}>Estado</span>
              <div style={{ display: "flex", gap: 6 }}>
                {ESTADOS_HONORARIOS.map(e => (
                  <button
                    key={e}
                    onClick={() => handleFormChange("estado_honorarios", e)}
                    style={{
                      flex: 1,
                      padding: "8px 6px",
                      borderRadius: 6,
                      border: `1px solid ${formData.estado_honorarios === e ? "#818cf8" : Th.border}`,
                      background: formData.estado_honorarios === e ? "#6366f122" : "transparent",
                      color: formData.estado_honorarios === e ? "#818cf8" : Th.sub,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: formData.estado_honorarios === e ? 700 : 400,
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <label>
                <span style={labelStyle}>Fecha de factura</span>
                <input
                  type="date"
                  value={formData.fecha_factura}
                  onChange={e => handleFormChange("fecha_factura", e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label>
                <span style={labelStyle}>Fecha cobro honorarios</span>
                <input
                  type="date"
                  value={formData.fecha_cobro_honorarios}
                  onChange={e => handleFormChange("fecha_cobro_honorarios", e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
            {formData.estado_honorarios === "FACTURADO" && diasDesdeFactura !== null && (
              <div style={{ fontSize: 12, color: "#f97316", background: "#f9731612", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
                ⏱ Facturado hace {diasDesdeFactura} días
              </div>
            )}
            {honorariosVencidos && (
              <div style={{ fontSize: 12, color: "#ef4444", background: "#ef444412", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
                ⚠️ Cobro de honorarios vencido
              </div>
            )}
          </div>

          {/* SECCIÓN 5: FECHAS DEL EXPEDIENTE */}
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>📅 Fechas del expediente</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { k: "fecha_derivacion", l: "Derivación" },
                { k: "fecha_contacto_asegurado", l: "Contacto asegurado" },
                { k: "fecha_inicio_reclamo", l: "Inicio reclamo" },
                { k: "fecha_ultimo_movimiento", l: "Último movimiento" },
                { k: "fecha_carga", l: "Carga del caso" },
                { k: "fecha_reclamo", l: "Reclamo" },
                { k: "fecha_ultimo_reclamo", l: "Último reclamo" },
                { k: "fecha_ofrecimiento", l: "Ofrecimiento (auto)" },
                { k: "fecha_reconsideracion", l: "Reconsideración" },
                { k: "fecha_aceptacion", l: "Aceptación" },
                { k: "fecha_firma", l: "Firma acuerdo" },
                { k: "fecha_pago", l: "Pago" },
                { k: "fecha_cobro", l: "Cobro" },
                { k: "fecha_mediacion", l: "Mediación" },
                { k: "fecha_inicio_juicio", l: "Inicio de juicio" },
              ].map(f => (
                <label key={f.k}>
                  <span style={labelStyle}>{f.l}</span>
                  <input
                    type="date"
                    value={formData[f.k] || ""}
                    onChange={e => handleFormChange(f.k, e.target.value)}
                    style={inputStyle}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* SECCIÓN 6: TIMELINE */}
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>⏳ Historial de acciones</div>
            {loadingAcciones && <div style={{ color: Th.muted, fontSize: 13 }}>Cargando...</div>}
            {!loadingAcciones && acciones.length === 0 && (
              <div style={{ color: Th.muted, fontSize: 13, textAlign: "center", padding: "12px 0" }}>Sin acciones registradas aún</div>
            )}
            <div style={{ paddingLeft: 4 }}>
              {acciones.map((a, i) => (
                <div key={a.id || i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: i === 0 ? "#6366f1" : Th.border,
                        marginTop: 3,
                        flexShrink: 0,
                        border: i === 0 ? "2px solid #6366f144" : "none",
                      }}
                    />
                    {i < acciones.length - 1 && <div style={{ width: 1, flex: 1, background: Th.border, marginTop: 4, minHeight: 18 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 6 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: i === 0 ? "#6366f1" : Th.muted,
                        fontWeight: i === 0 ? 700 : 500,
                        marginBottom: 2,
                      }}
                    >
                      {formatoFecha(a.fecha?.slice(0, 10))}{i === 0 ? " · más reciente" : ""}
                      <span style={{ marginLeft: 6, background: Th.card2, borderRadius: 4, padding: "1px 6px", fontSize: 10, color: Th.muted }}>
                        {a.tipo}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: Th.sub, lineHeight: 1.5 }}>{a.descripcion}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECCIÓN 7: ACCIONES */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <button
              onClick={() => setModalEscrito(true)}
              style={{
                background: "#f97316",
                border: "none",
                borderRadius: 8,
                color: "white",
                padding: "12px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              📝 Generar escrito
            </button>
            <button
              onClick={() => recargarArchivos()}
              disabled={archivosActualizando}
              style={{
                background: archivosActualizando ? Th.card2 : "#3b82f6",
                border: "none",
                borderRadius: 8,
                color: "white",
                padding: "12px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                opacity: archivosActualizando ? 0.5 : 1,
              }}
            >
              {archivosActualizando ? "Cargando..." : "🔄 Recargar archivos"}
            </button>
          </div>

          {/* BOTONES FINALES */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingTop: 10, borderTop: `1px solid ${Th.border}` }}>
            <button
              onClick={onClose}
              style={{
                background: Th.card2,
                border: `1px solid ${Th.border}`,
                borderRadius: 8,
                color: Th.sub,
                padding: "12px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={guardarCaso}
              disabled={guardando}
              style={{
                background: guardando ? Th.card2 : "#10b981",
                border: "none",
                borderRadius: 8,
                color: "white",
                padding: "12px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                opacity: guardando ? 0.5 : 1,
              }}
            >
              {guardando ? "Guardando..." : "✓ Guardar caso"}
            </button>
          </div>
        </div>
      </div>

      {previewArchivo && <PreviewModal archivo={previewArchivo} onClose={() => setPreviewArchivo(null)} />}

      {modalEscrito && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 16, padding: "28px 24px", maxWidth: 380, width: "100%" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: Th.text, marginBottom: 18 }}>📝 Generar escrito</div>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={labelStyle}>DNI del asegurado *</span>
              <input value={dniEscrito} onChange={e => setDniEscrito(e.target.value)} placeholder="Ej: 25123456" style={inputStyle} />
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setModalEscrito(false);
                  setDniEscrito("");
                }}
                style={{
                  flex: 1,
                  background: Th.card2,
                  border: `1px solid ${Th.border}`,
                  borderRadius: 8,
                  color: Th.sub,
                  padding: "10px",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerarEscrito}
                disabled={generandoEscrito || !dniEscrito.trim()}
                style={{
                  flex: 2,
                  background: generandoEscrito || !dniEscrito.trim() ? Th.card2 : "#f97316",
                  border: "none",
                  borderRadius: 8,
                  color: "white",
                  padding: "10px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {generandoEscrito ? "Generando..." : "Generar PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}