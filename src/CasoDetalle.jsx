// CasoDetalle.jsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";
import { TIPOS_DOC, ESTADOS_HONORARIOS, formatoFecha, diasDesde, getExtension, THEME } from "./utils/casoDetalleUtils.js";
import { Toast, PreviewModal, ArchivoRow } from "./components/casoDetalleComponents.jsx";
import { cargarArchivos } from "./utils/carpeta.js";
import { categorizarArchivo } from "./utils/categorizarArchivo.js";
import { generarEscrito } from "./utils/generarEscrito.js";

export default function CasoDetalle({ caso, pasId, darkMode, onUpdate, onClose }) {
  const Th = THEME(darkMode);

  const [archivos, setArchivos] = useState([]);
  const [archivosActualizando, setArchivosActualizando] = useState(false);
  const [previewArchivo, setPreviewArchivo] = useState(null);
  const [toast, setToast] = useState(null);

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
        .from("caso_acciones")
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

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;
  const sectionStyle = { background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, overflow: "auto" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "90vh", overflow: "auto", padding: 0 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${Th.border}`, position: "sticky", top: 0, background: Th.card, zIndex: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: Th.text }}>📋 {caso.numero_caso || "Sin número"}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setModalEscrito(true)}
              style={{ background: "#f9731622", border: "1px solid #f9731644", borderRadius: 8, color: "#f97316", padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
            >
              📝 Generar escrito
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: Th.sub, cursor: "pointer", fontSize: 20 }}>×</button>
          </div>
        </div>

        <div style={{ padding: "20px" }}>

          {/* Archivos */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: Th.text }}>📂 Documentos del caso</div>
              <button
                onClick={recargarArchivos}
                disabled={archivosActualizando}
                style={{ background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 6, color: Th.sub, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}
              >
                {archivosActualizando ? "Cargando..." : "🔄 Actualizar"}
              </button>
            </div>

            {/* Checklist */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14 }}>
              {TIPOS_DOC.map(tipo => {
                const tiene = tipo === "FOTO"
                  ? archivos.some(a => /^FOTO_\d+\.(jpg|jpeg|png)$/i.test(a.nombre))
                  : archivos.some(a => a.nombre.toLowerCase() === `${tipo.toLowerCase()}.pdf`);
                return (
                  <div key={tipo} style={{ background: tiene ? "#22c55e14" : "#ef444410", border: `1px solid ${tiene ? "#22c55e44" : "#ef444430"}`, borderRadius: 8, padding: "7px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: 16 }}>{tiene ? "✅" : "❌"}</div>
                    <div style={{ fontSize: 9, color: tiene ? "#22c55e" : "#ef4444", fontWeight: 700, marginTop: 2 }}>{tipo}</div>
                  </div>
                );
              })}
            </div>

            {archivos.length === 0 && !archivosActualizando && (
              <div style={{ textAlign: "center", padding: "16px 0", color: Th.muted, fontSize: 13 }}>Sin archivos en este caso</div>
            )}
            {archivos.map(arch => (
              <ArchivoRow
                key={arch.nombre}
                archivo={arch}
                onPreview={() => setPreviewArchivo(arch)}
                onCategorizar={tipo => handleCategorizarArchivo(arch, tipo)}
                Th={Th}
              />
            ))}
          </div>

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
            }} style={{ background: "#10b981", border: "none", borderRadius: 8, color: "white", padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, marginTop: 10 }}>Guardar monto</button>
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

          {/* Fechas */}
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 16, padding: "28px 24px", maxWidth: 380, width: "100%" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: Th.text, marginBottom: 18 }}>📝 Generar escrito de representación</div>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={labelStyle}>DNI del asegurado *</span>
              <input value={dniEscrito} onChange={e => setDniEscrito(e.target.value)} placeholder="Ej: 25123456" style={inputStyle} />
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setModalEscrito(false); setDniEscrito(""); }} style={{ flex: 1, background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 8, color: Th.sub, padding: "10px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
              <button onClick={handleGenerarEscrito} disabled={generandoEscrito || !dniEscrito.trim()} style={{ flex: 2, background: generandoEscrito || !dniEscrito.trim() ? Th.card2 : "#f97316", border: "none", borderRadius: 8, color: "white", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
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