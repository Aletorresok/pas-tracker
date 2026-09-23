import { useState, useRef } from "react";
import { fmtDate, fmtMoney } from "./portalTheme.js";
import { subirArchivosYNotificar } from "../../utils/portalStorageUtils.js";
import BarraAvance from "../ui/BarraAvance.jsx";
import EstadoPill from "../ui/EstadoPill.jsx";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";

const FECHAS = [
  { k: "fecha_derivacion", l: "Derivación" },
  { k: "fecha_inicio_reclamo", l: "Inicio del reclamo" },
  { k: "fecha_ofrecimiento", l: "Ofrecimiento" },
  { k: "fecha_mediacion", l: "Mediación" },
  { k: "fecha_pago", l: "Pago" },
  { k: "fecha_cobro", l: "Cobro" },
];
const MONTOS = [
  { k: "monto_ofrecimiento", l: "Ofrecimiento" },
  { k: "monto_cobro_asegurado", l: "Cobró el asegurado" },
  { k: "monto_comision_pas", l: "Tu comisión", destacado: true },
];

// Tarjeta de un caso en el portal del PAS: lo esencial arriba, el detalle al tocar
export default function PortalCasoCard({ caso, proximoEvento }) {
  const [open, setOpen] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo, texto }
  const fileInputRef = useRef(null);

  const historial = [...(caso.notas_log || [])].sort((a, b) => b.ts - a.ts);
  const ultima = historial[0];
  const fechas = FECHAS.filter(f => caso[f.k]);
  const montos = MONTOS.filter(f => Number(caso[f.k]) > 0);

  const subir = async (e) => {
    const archivos = Array.from(e.target.files || []);
    if (!archivos.length) return;
    setSubiendo(true);
    setAviso(null);
    try {
      await subirArchivosYNotificar({
        pasId: caso.pas_id,
        pasNombre: caso.pas_nombre || "Productor",
        casoData: {
          asegurado: caso.asegurado + " (NUEVA DOCUMENTACIÓN)",
          telefono: caso.telefono_asegurado || caso.tercero_contacto || "Ya registrado",
          fecha_siniestro: caso.fecha_siniestro || "Ya registrada",
          compania: caso.compania_aseguradora,
        },
        archivos,
      });
      setAviso({ tipo: "ok", texto: `${archivos.length === 1 ? "Archivo enviado" : `${archivos.length} archivos enviados`}. Ya le avisamos al estudio.` });
    } catch (err) {
      console.error("Error al subir:", err);
      setAviso({ tipo: "error", texto: "No se pudo subir. Revisá la conexión y probá de nuevo." });
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  return (
    <article style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)", overflowWrap: "anywhere" }}>{caso.asegurado || "Sin nombre"}</h3>
            <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {caso.compania_aseguradora && <span>{caso.compania_aseguradora}</span>}
              {caso.patente && <span style={{ fontFamily: "var(--mono)" }}>{caso.patente}</span>}
              {caso.fecha_derivacion && <span>derivado {fmtDate(caso.fecha_derivacion)}</span>}
            </div>
          </div>
          <EstadoPill estado={caso.estado} size="sm" />
        </div>

        <BarraAvance estado={caso.estado} conPill={false} conEtiquetas />

        {proximoEvento && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text)", background: "color-mix(in srgb, var(--info) 10%, var(--card))", border: "1px solid color-mix(in srgb, var(--info) 30%, transparent)", borderRadius: 8, padding: "8px 10px" }}>
            <Icono nombre="calendario" size={16} />
            <span><b>{proximoEvento.tipo === "audiencia" ? "Audiencia" : "Mediación"}:</b> <span className="num">{new Date(proximoEvento.inicio).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}, {new Date(proximoEvento.inicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} hs</span></span>
          </div>
        )}

        {caso.origen === "portal" && (
          <div style={{ fontSize: 12, color: caso.revisado_en ? "var(--ok)" : "var(--muted)" }}>
            {caso.revisado_en ? `✓ El estudio tomó el caso el ${fmtDate(String(caso.revisado_en).slice(0, 10))}` : "Recibido · el estudio todavía no lo abrió"}
          </div>
        )}

        {caso.mensaje_cliente && (
          <div style={{ background: "color-mix(in srgb, var(--accent) 9%, var(--card))", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-ink)", marginBottom: 3 }}>Mensaje del estudio</div>
            <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.45 }}>{caso.mensaje_cliente}</div>
          </div>
        )}

        {ultima && (
          <div style={{ fontSize: 13, color: "var(--sub)" }}>
            <span className="num" style={{ color: "var(--muted)" }}>{fmtDate(ultima.fecha)} · </span>{ultima.texto}
          </div>
        )}

        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
          {open ? "Ocultar detalle" : "Ver detalle y adjuntar documentación"}
        </button>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--border)", background: "var(--card2)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {montos.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
              {montos.map(m => (
                <div key={m.k} style={{ background: "var(--card)", borderRadius: 8, padding: "8px 10px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 12, color: "var(--sub)" }}>{m.l}</div>
                  <div className="num" style={{ fontSize: 16, fontWeight: 700, color: m.destacado ? "var(--accent-ink)" : "var(--text)" }}>{fmtMoney(caso[m.k])}</div>
                </div>
              ))}
            </div>
          )}

          {fechas.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 13 }}>
              {fechas.map(f => (
                <span key={f.k}><span style={{ color: "var(--muted)" }}>{f.l}: </span><span className="num" style={{ color: "var(--text)" }}>{fmtDate(caso[f.k])}</span></span>
              ))}
            </div>
          )}

          {historial.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Movimientos</div>
              {historial.map((n, i) => (
                <div key={n.ts || i} style={{ display: "grid", gridTemplateColumns: "64px minmax(0, 1fr)", gap: 8, padding: "5px 0", borderTop: i ? "1px solid var(--border)" : "none", fontSize: 13 }}>
                  <span className="num" style={{ color: "var(--muted)" }}>{fmtDate(n.fecha)}</span>
                  <span style={{ color: "var(--sub)" }}>{n.texto}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <input type="file" multiple accept="image/*,application/pdf" ref={fileInputRef} style={{ display: "none" }} onChange={subir} />
            <Boton variante="primario" icono="adjuntar" onClick={() => fileInputRef.current?.click()} disabled={subiendo}>
              {subiendo ? "Subiendo…" : "Adjuntar documentación"}
            </Boton>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Fotos o PDF. Desde el celular podés sacar la foto en el momento.</div>
            {aviso && (
              <div role="status" style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: aviso.tipo === "ok" ? "var(--ok)" : "var(--bad)" }}>{aviso.texto}</div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
