// CasoDetalle.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";
import { createClient } from '@supabase/supabase-js';
import { TIPOS_DOC, EXTENSIONES_VALIDAS, ESTADOS_HONORARIOS, sanitizarNombre, formatoFecha, formatoFechaCarpeta, fmtMoney, diasDesde, sumarDias, getExtension, verificarPermiso, THEME } from "./utils/casoDetalleUtils.js";
import { Toast, PreviewModal, ArchivoRow } from "./components/casoDetalleComponents.jsx";

const supabaseAgenda = createClient(
  'https://ecefqwbqunqzbpwgsnmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZWZxd2JxdW5xemJwd2dzbm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzY4OTMsImV4cCI6MjA4NzYxMjg5M30.Z02Jk-z_CyDceMz0LYl8eMVCj4KhXwW55UcxtEifbpo'
);

const _dirHandleCache = {};

export default function CasoDetalle({ caso, pasId, darkMode, onUpdate, onClose }) {
  const Th = THEME(darkMode);

  const [dirHandle, setDirHandle] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [archivosAcualizando, setArchivosAcualizando] = useState(false);
  const [previewArchivo, setPreviewArchivo] = useState(null);
  const [toast, setToast] = useState(null);

  // Formularios
  const [montoReclamado, setMontoReclamado] = useState(caso.monto_reclamado || "");
  const [estado_honorarios, setEstado_honorarios] = useState(caso.estado_honorarios || "NO_FACTURADO");
  const [monto_honorarios, setMonto_honorarios] = useState(caso.monto_honorarios || "");
  const [fecha_factura, setFecha_factura] = useState(caso.fecha_factura || "");
  const [fecha_cobro_honorarios, setFecha_cobro_honorarios] = useState(caso.fecha_cobro_honorarios || "");
  const [acciones, setAcciones] = useState([]);
  const [loadingAcciones, setLoadingAcciones] = useState(false);
  const [modalEscrito, setModalEscrito] = useState(false);
  const [dniEscrito, setDniEscrito] = useState("");
  const [generandoEscrito, setGenerandoEscrito] = useState(false);
  const [fechas, setFechas] = useState({
    fecha_carga: caso.fecha_carga || "",
    fecha_reclamo: caso.fecha_reclamo || "",
    fecha_ultimo_reclamo: caso.fecha_ultimo_reclamo || "",
    fecha_ofrecimiento: caso.fecha_ofrecimiento || "",
    fecha_reconsideracion: caso.fecha_reconsideracion || "",
    fecha_aceptacion: caso.fecha_aceptacion || "",
    fecha_firma: caso.fecha_firma || "",
    fecha_pago: caso.fecha_pago || "",
    fecha_cobro: caso.fecha_cobro || "",
    fecha_mediacion: caso.fecha_mediacion || "",
    fecha_inicio_juicio: caso.fecha_inicio_juicio || "",
  });

  const diasDesdeFactura = fecha_factura ? diasDesde(fecha_factura) : null;
  const honorariosVencidos = estado_honorarios === "FACTURADO" && diasDesdeFactura && diasDesdeFactura > 30;

  useEffect(() => {
    cargarArchivos();
    cargarAcciones();
  }, [caso.id]);

  const cargarArchivos = async () => {
    if (!caso.id) return;
    setArchivosAcualizando(true);
    try {
      const { data, error } = await supabase.storage.from("casos").list(`${pasId}/${caso.id}`);
      if (!error && data) {
        const archivosLocal = await Promise.all(
          data.map(async (f) => {
            try {
              const { data: blob } = await supabase.storage.from("casos").download(`${pasId}/${caso.id}/${f.name}`);
              return { nombre: f.name, ext: getExtension(f.name), tipo: f.metadata?.tipo || "", tamaño: f.metadata?.size || blob?.size || 0, blob };
            } catch {
              return null;
            }
          })
        );
        setArchivos(archivosLocal.filter(Boolean));
      }
    } catch (e) {
      console.error("Error cargando archivos:", e);
    }
    setArchivosAcualizando(false);
  };

  const cargarAcciones = async () => {
    if (!caso.id) return;
    setLoadingAcciones(true);
    try {
      const { data, error } = await supabase.from("caso_acciones").select("*").eq("caso_id", caso.id).order("fecha", { ascending: false });
      if (!error) setAcciones(data || []);
    } catch (e) {
      console.error("Error cargando acciones:", e);
    }
    setLoadingAcciones(false);
  };

  const guardarHonorarios = useCallback(async () => {
    try {
      const updated = {
        ...caso,
        estado_honorarios,
        monto_honorarios: monto_honorarios || null,
        fecha_factura: fecha_factura || null,
        fecha_cobro_honorarios: fecha_cobro_honorarios || null,
      };
      const { error } = await supabase.from("casos").update(updated).eq("id", caso.id);
      if (!error) {
        setToast({ msg: "✓ Honorarios guardados", type: "success" });
        onUpdate?.(updated);
      } else {
        setToast({ msg: "Error guardando honorarios", type: "error" });
      }
    } catch (e) {
      setToast({ msg: "Error: " + e.message, type: "error" });
    }
  }, [caso, estado_honorarios, monto_honorarios, fecha_factura, fecha_cobro_honorarios, onUpdate]);

  const guardarFechas = useCallback(async () => {
    try {
      const updated = { ...caso, ...fechas };
      const { error } = await supabase.from("casos").update(updated).eq("id", caso.id);
      if (!error) {
        setToast({ msg: "✓ Fechas guardadas", type: "success" });
        onUpdate?.(updated);
      } else {
        setToast({ msg: "Error guardando fechas", type: "error" });
      }
    } catch (e) {
      setToast({ msg: "Error: " + e.message, type: "error" });
    }
  }, [caso, fechas, onUpdate]);

  const generarEscrito = useCallback(async () => {
    if (!dniEscrito.trim()) {
      setToast({ msg: "DNI requerido", type: "warn" });
      return;
    }
    setGenerandoEscrito(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: `Genera un escrito de representación legal para un asegurado con DNI ${dniEscrito} en un caso de seguros. Incluye encabezado formal, datos del asegurado, representación letrada y firma.`
          }]
        })
      });
      const data = await response.json();
      const contenido = data.content?.[0]?.text || "";
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(12);
      doc.text(contenido, 10, 10, { maxWidth: 190 });
      doc.save(`escrito_${dniEscrito}.pdf`);
      setToast({ msg: "✓ PDF generado", type: "success" });
      setModalEscrito(false);
      setDniEscrito("");
    } catch (e) {
      setToast({ msg: "Error generando PDF: " + e.message, type: "error" });
    }
    setGenerandoEscrito(false);
  }, [dniEscrito]);

  const handleCategorizarArchivo = async (tipo) => {
    // Implementar si es necesario
  };

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;
  const sectionStyle = { background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, overflow: "auto" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "90vh", overflow: "auto", padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${Th.border}`, position: "sticky", top: 0, background: Th.card, zIndex: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: Th.text }}>📋 {caso.numero_caso || "Sin número"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: Th.sub, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        <div style={{ padding: "20px" }}>
          {/* Monto reclamado */}
          <div style={sectionStyle}>
            <label>
              <span style={labelStyle}>Monto reclamado</span>
              <input type="number" value={montoReclamado} onChange={e => setMontoReclamado(e.target.value)} style={inputStyle} />
            </label>
            <button onClick={() => {
              supabase.from("casos").update({ monto_reclamado: montoReclamado }).eq("id", caso.id).then(() => {
                setToast({ msg: "✓ Monto guardado", type: "success" });
                onUpdate?.({ ...caso, monto_reclamado: montoReclamado });
              });
            }} style={{ background: "#10b981", border: "none", borderRadius: 8, color: "white", padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Guardar monto</button>
          </div>

          {/* Honorarios */}
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>💰 Honorarios</div>
            <label style={{ marginBottom: 12 }}>
              <span style={labelStyle}>Monto de honorarios</span>
              <input type="number" value={monto_honorarios} onChange={e => setMonto_honorarios(e.target.value)} style={inputStyle} />
            </label>
            <div style={{ marginBottom: 12 }}>
              <span style={labelStyle}>Estado</span>
              <div style={{ display: "flex", gap: 6 }}>
                {ESTADOS_HONORARIOS.map(e => (
                  <button key={e} onClick={() => setEstado_honorarios(e)} style={{ flex: 1, padding: "8px 6px", borderRadius: 6, border: `1px solid ${estado_honorarios === e ? "#818cf8" : Th.border}`, background: estado_honorarios === e ? "#6366f122" : "transparent", color: estado_honorarios === e ? "#818cf8" : Th.sub, cursor: "pointer", fontSize: 12, fontWeight: estado_honorarios === e ? 700 : 400 }}>{e}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <label>
                <span style={labelStyle}>Fecha de factura</span>
                <input type="date" value={fecha_factura} onChange={e => setFecha_factura(e.target.value)} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Fecha cobro honorarios</span>
                <input type="date" value={fecha_cobro_honorarios} onChange={e => setFecha_cobro_honorarios(e.target.value)} style={inputStyle} />
              </label>
            </div>
            {estado_honorarios === "FACTURADO" && diasDesdeFactura !== null && (
              <div style={{ fontSize: 12, color: "#f97316", background: "#f9731612", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
                ⏱ Facturado hace {diasDesdeFactura} días
              </div>
            )}
            {honorariosVencidos && (
              <div style={{ fontSize: 12, color: "#ef4444", background: "#ef444412", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
                ⚠️ Cobro de honorarios vencido — aún no marcado como COBRADO
              </div>
            )}
            <button onClick={guardarHonorarios} style={{ background: "#6366f1", border: "none", borderRadius: 8, color: "white", padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Guardar honorarios</button>
          </div>

          {/* Fechas del expediente */}
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>📅 Fechas del expediente</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
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
                  <input type="date" value={fechas[f.k] || ""} onChange={e => setFechas(prev => ({ ...prev, [f.k]: e.target.value }))} style={inputStyle} />
                </label>
              ))}
            </div>
            <button onClick={guardarFechas} style={{ background: "#3b82f6", border: "none", borderRadius: 8, color: "white", padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Guardar fechas</button>
          </div>

          {/* Timeline */}
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>⏳ Timeline de acciones</div>
            {loadingAcciones && <div style={{ color: Th.muted, fontSize: 13 }}>Cargando...</div>}
            {!loadingAcciones && acciones.length === 0 && (
              <div style={{ color: Th.muted, fontSize: 13, textAlign: "center", padding: "12px 0" }}>Sin acciones registradas aún</div>
            )}
            <div style={{ paddingLeft: 4 }}>
              {acciones.map((a, i) => (
                <div key={a.id || i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: i === 0 ? "#6366f1" : Th.border, marginTop: 3, flexShrink: 0, border: i === 0 ? "2px solid #6366f144" : "none" }} />
                    {i < acciones.length - 1 && <div style={{ width: 1, flex: 1, background: Th.border, marginTop: 4, minHeight: 18 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 6 }}>
                    <div style={{ fontSize: 11, color: i === 0 ? "#6366f1" : Th.muted, fontWeight: i === 0 ? 700 : 500, marginBottom: 2 }}>
                      {formatoFecha(a.fecha?.slice(0, 10))}{i === 0 ? " · más reciente" : ""}
                      <span style={{ marginLeft: 6, background: Th.card2, borderRadius: 4, padding: "1px 6px", fontSize: 10, color: Th.muted }}>{a.tipo}</span>
                    </div>
                    <div style={{ fontSize: 13, color: Th.sub, lineHeight: 1.5 }}>{a.descripcion}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {previewArchivo && <PreviewModal archivo={previewArchivo} onClose={() => setPreviewArchivo(null)} />}

      {modalEscrito && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 16, padding: "28px 24px", maxWidth: 380, width: "100%" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: Th.text, marginBottom: 18 }}>📝 Generar escrito de representación</div>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={labelStyle}>DNI del asegurado *</span>
              <input value={dniEscrito} onChange={e => setDniEscrito(e.target.value)} placeholder="Ej: 25123456" style={inputStyle} />
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setModalEscrito(false); setDniEscrito(""); }} style={{ flex: 1, background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 8, color: Th.sub, padding: "10px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
              <button onClick={generarEscrito} disabled={generandoEscrito || !dniEscrito.trim()} style={{ flex: 2, background: generandoEscrito || !dniEscrito.trim() ? Th.card2 : "#f97316", border: "none", borderRadius: 8, color: "white", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
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