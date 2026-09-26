import { useState } from "react";
import { fmtMoney, formatoFecha, fechaLocalISO } from "../../utils/formatters.js";
import CasoProximaAccion from "./CasoProximaAccion.jsx";
import AvisarWhatsApp from "./AvisarWhatsApp.jsx";
import AgendaCaso from "./AgendaCaso.jsx";
import SeccionPagos from "./SeccionPagos.jsx";
import AvisoEstadoCliente, { EtiquetaMensajeCliente, VistaPreviaMensaje, AvisoPrescripcion } from "./AvisoEstadoCliente.jsx";

const num = v => Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0;

// Pestaña "Resumen": lo que se mira todos los días
export default function ResumenCaso({ recepcionNuevos = 0, casoId, nroSiniestro, pasNombre, pasTelefono, tercero_contacto, formData, onChange, acciones, onCrearAccion, irA, Th }) {
  const [nueva, setNueva] = useState("");
  const [guardandoAccion, setGuardandoAccion] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const tieneDni = /\d{3}/.test(String(formData.dni_asegurado || "").replace(/\D/g, ""));
  const copiarLink = async () => {
    const url = `${window.location.origin}/?vista=cliente&patente=${encodeURIComponent((formData.patente || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase())}`;
    try { await navigator.clipboard.writeText(url); } catch { window.prompt("Copiá el link:", url); }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };
  const reclamado = num(formData.monto_reclamado), ofrecido = num(formData.monto_ofrecimiento);
  const filas = [
    ["Reclamado", reclamado],
    ["Ofrecido", ofrecido],
    ["Diferencia", reclamado && ofrecido ? ofrecido - reclamado : 0],
    ["Comisión PAS", num(formData.monto_comision_pas)],
  ];
  const agregar = async (e) => {
    e.preventDefault();
    if (!nueva.trim()) return;
    setGuardandoAccion(true);
    await onCrearAccion({ fecha: fechaLocalISO(), descripcion: nueva.trim() });
    setNueva("");
    setGuardandoAccion(false);
  };
  const caja = { background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16 };
  const link = { background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 };

  return (
    <div className="resumen-caso" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        {recepcionNuevos > 0 && (
          <button type="button" onClick={() => irA("documentos")}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))", background: "color-mix(in srgb, var(--accent) 8%, var(--card))", color: Th.text, font: "inherit", fontSize: 14, cursor: "pointer", textAlign: "left" }}>
            <span><b>El cliente mandó {recepcionNuevos === 1 ? "1 archivo" : `${recepcionNuevos} archivos`}</b> desde su vista</span>
            <span style={{ color: "var(--accent-ink)", fontWeight: 600, whiteSpace: "nowrap" }}>Guardar →</span>
          </button>
        )}
        <AvisoPrescripcion caso={formData} />
        <AvisoEstadoCliente caso={formData} onCambiar={e => onChange("estado", e)} />
        <CasoProximaAccion formData={formData} onChange={onChange} Th={Th} />

        <div style={caja}>
          <label htmlFor="mensaje-cliente" style={{ display: "block", fontSize: 14, fontWeight: 700, color: Th.text, marginBottom: 8 }}>
            Mensaje para el cliente <EtiquetaMensajeCliente />
          </label>
          <textarea id="mensaje-cliente" value={formData.mensaje_cliente || ""} onChange={e => onChange("mensaje_cliente", e.target.value)}
            placeholder="Ej: El reclamo está en la compañía. Estimamos novedades en 10 días."
            style={{ ...Th.input, minHeight: 60, resize: "vertical" }} />
          <VistaPreviaMensaje caso={formData} />
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 8, fontSize: 12, color: Th.muted }}>
            {formData.patente && <button type="button" onClick={copiarLink} style={link}>{copiado ? "✓ Link copiado" : "Copiar link del cliente"}</button>}
            {!tieneDni && <span>Sin DNI cargado: el cliente no puede entrar. <button type="button" onClick={() => irA("datos")} style={{ ...link, fontSize: 12 }}>Cargar DNI</button></span>}
          </div>
          <div style={{ marginTop: 10 }}>
            <AvisarWhatsApp caso={{ ...formData, tercero_contacto }} pasNombre={pasNombre} pasTelefono={pasTelefono}
              onTelefonoCliente={v => onChange("telefono_asegurado", v)}
              onUsarComoMensaje={t => onChange("mensaje_cliente", t)} />
          </div>
        </div>

        <div style={caja}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: Th.text }}>Últimos movimientos</span>
            <button type="button" onClick={() => irA("bitacora")} style={link}>Ver bitácora →</button>
          </div>
          <form onSubmit={agregar} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Agregar movimiento de hoy y Enter…" aria-label="Nuevo movimiento"
              style={{ ...Th.input, padding: "8px 12px" }} />
            <button type="submit" disabled={guardandoAccion || !nueva.trim()}
              style={{ flex: "none", padding: "0 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 600, cursor: "pointer", opacity: guardandoAccion || !nueva.trim() ? 0.5 : 1 }}>
              {guardandoAccion ? "…" : "Agregar"}
            </button>
          </form>
          {acciones.length === 0 && <div style={{ fontSize: 13, color: Th.muted }}>Todavía no hay movimientos.</div>}
          {acciones.slice(0, 3).map(a => (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: "72px minmax(0, 1fr)", gap: 8, padding: "6px 0", borderTop: `1px solid ${Th.border}`, fontSize: 13 }}>
              <span className="num" style={{ color: Th.muted }}>{formatoFecha(a.fecha?.slice(0, 10))}</span>
              <span style={{ color: Th.sub }}>{a.descripcion}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
      <AgendaCaso casoId={casoId} caso={{ ...formData, nro_siniestro: nroSiniestro }} onChange={onChange} Th={Th} />

      <div style={caja}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: Th.text }}>Números del caso</span>
          <button type="button" onClick={() => irA("montos")} style={link}>Editar →</button>
        </div>
        {filas.map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: `1px solid ${Th.border}`, fontSize: 13, color: Th.sub }}>
            <span>{l}</span>
            <b className="num" style={{ color: l === "Diferencia" && v < 0 ? "var(--warn)" : Th.text, fontWeight: 600 }}>
              {v ? (l === "Diferencia" && v < 0 ? `− ${fmtMoney(-v)}` : fmtMoney(v)) : "—"}
            </b>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0 2px", borderTop: `1px solid ${Th.border}`, fontSize: 14 }}>
          <span style={{ color: Th.text, fontWeight: 600 }}>Mis honorarios</span>
          <b className="num" style={{ color: "var(--accent-ink)", fontSize: 16 }}>{num(formData.monto_cobro_yo) ? fmtMoney(num(formData.monto_cobro_yo)) : "—"}</b>
        </div>
        {(["esperando_pago", "cobrado"].includes(formData.estado) || formData.fecha_cobro || formData.fecha_cobro_honorarios)
          ? <SeccionPagos formData={formData} onChange={onChange} Th={Th} compacto />
          : formData.estado_honorarios === "FACTURADO" && <div style={{ fontSize: 12, color: Th.muted, marginTop: 4 }}>Honorarios: facturados</div>}
      </div>
      </div>
    </div>
  );
}
