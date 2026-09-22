import { useState, useRef } from "react";
import { ESTADOS_CASO, estadoInfo, fmtDate, fmtMoney, theme } from "./portalTheme.js";
import { subirArchivosYNotificar } from "../../utils/portalStorageUtils.js";
import { alpha } from "../../utils/theme.js";
import BarraAvance from "../ui/BarraAvance.jsx";


export default function PortalCasoCard({ caso, dark }) {
  const [open, setOpen] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const fileInputRef = useRef(null);
  
  const T = theme(dark);
  const ei = estadoInfo(caso.estado);
  const logOrdenado = [...(caso.notas_log || [])].sort((a, b) => b.ts - a.ts);
  const ultimaAccion = logOrdenado[0] || null;

  const FECHAS_PREVIEW = [
    { k: "fecha_inicio_reclamo", l: "Inicio" },
    { k: "fecha_ofrecimiento", l: "Ofrecimiento" },
    { k: "fecha_mediacion", l: "Mediación" },
    { k: "fecha_pago", l: "Pago" },
    { k: "fecha_cobro", l: "Cobro" },
  ];

  const FECHAS = [
    { k: "fecha_derivacion", l: "Derivación" },
    { k: "fecha_contacto_asegurado", l: "Contacto asegurado" },
    { k: "fecha_inicio_reclamo", l: "Inicio reclamo" },
  ];

  const MONTOS = [
    { k: "monto_ofrecimiento", l: "Ofrecimiento", c: "var(--warn)" },
    { k: "monto_cobro_asegurado", l: "Cobró asegurado", c: "var(--ok)" },
    { k: "monto_cobro_yo", l: "Honorarios", c: "var(--accent)" },
    { k: "monto_comision_pas", l: "Tu comisión", c: "var(--warn)" },
  ];

  const handleSubirNuevaDoc = async (e) => {
    const archivos = Array.from(e.target.files);
    if (!archivos.length) return;
    
    setSubiendo(true);
    try {
      // Llamada limpia a la utilidad compartida con sufijo para identificar nueva documentación
      await subirArchivosYNotificar({
        pasId: caso.pas_id,
        pasNombre: caso.pas_nombre || "Productor",
        casoData: {
          asegurado: caso.asegurado + " (NUEVA DOCUMENTACIÓN)",
          telefono: caso.tercero_contacto || "Ya registrado",
          fecha_siniestro: caso.fecha_siniestro || "Ya registrada",
          compania: caso.compania_aseguradora,
        },
        archivos
      });

      alert("Documentación adjuntada y administrador notificado.");
    } catch (err) {
      console.error("Error al subir:", err);
      alert("Ocurrió un error al intentar subir la documentación.");
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${open ? alpha(ei.color, 53) : T.border}`,
      borderRadius: 14,
      marginBottom: 12,
      overflow: "hidden",
      transition: "all .2s",
      boxShadow: "var(--shadow)",
    }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "16px 18px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, lineHeight: 1.3 }}>{caso.asegurado}</div>
          <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{open ? "▲" : "▼"}</div>
        </div>

        <BarraAvance estado={caso.estado} />

        {caso.mensaje_cliente && (
          <div style={{ marginTop: 12, background: "color-mix(in srgb, var(--warn) 10%, var(--card))", border: "1px solid color-mix(in srgb, var(--warn) 27%, transparent)", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--warn)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 800, marginBottom: 4 }}>Qué decirle al cliente</div>
            <div style={{ fontSize: 13, color: T.text, fontWeight: 500, lineHeight: 1.4 }}>{caso.mensaje_cliente}</div>
          </div>
        )}

        {FECHAS_PREVIEW.filter(f => caso[f.k]).length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {FECHAS_PREVIEW.filter(f => caso[f.k]).map(f => (
              <span key={f.k} style={{ fontSize: 11, background: T.card2, color: T.sub, borderRadius: 6, padding: "3px 8px", border: `1px solid ${T.border}` }}>{f.l}: {fmtDate(caso[f.k])}</span>
            ))}
          </div>
        )}

        {ultimaAccion && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "flex-start", gap: 8, background: T.card2, borderRadius: 8, padding: "8px 11px", border: `1px solid ${T.border}` }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", marginTop: 4, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 2 }}>{fmtDate(ultimaAccion.fecha)} · última acción{logOrdenado.length > 1 ? ` (${logOrdenado.length})` : ""}</div>
              <div style={{ fontSize: 13, color: T.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ultimaAccion.texto}</div>
            </div>
          </div>
        )}
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "16px 18px", background: dark ? T.card2 : "var(--card2)" }}>
          {FECHAS.filter(f => caso[f.k]).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 }}>Fechas</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {FECHAS.filter(f => caso[f.k]).map(f => (
                  <div key={f.k} style={{ background: T.card, borderRadius: 8, padding: "10px 12px", border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 3 }}>{f.l}</div>
                    <div style={{ fontSize: 14, color: T.text, fontWeight: 700 }}>{fmtDate(caso[f.k])}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {MONTOS.filter(f => Number(caso[f.k]) > 0).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 }}>Montos</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {MONTOS.filter(f => Number(caso[f.k]) > 0).map(f => (
                  <div key={f.k} style={{ background: T.card, borderRadius: 8, padding: "10px 12px", border: `1px solid ${alpha(f.c, 20)}` }}>
                    <div style={{ fontSize: 11, color: alpha(f.c, 67), marginBottom: 3 }}>{f.l}</div>
                    <div style={{ fontSize: 15, color: f.c, fontWeight: 800 }}>{fmtMoney(caso[f.k])}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {caso.nota && (
            <div style={{ background: T.card, borderRadius: 8, padding: "10px 12px", marginBottom: 16, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Nota del caso</div>
              <div style={{ fontSize: 13, color: T.sub, fontStyle: "italic", lineHeight: 1.5 }}>{caso.nota}</div>
            </div>
          )}

          {logOrdenado.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, marginBottom: 12 }}>Historial de acciones</div>
              <div style={{ paddingLeft: 6 }}>
                {logOrdenado.map((n, i) => (
                  <div key={n.ts} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: i === 0 ? "var(--accent)" : T.border2, marginTop: 3, flexShrink: 0, border: i === 0 ? "2px solid color-mix(in srgb, var(--accent) 27%, transparent)" : "none" }} />
                      {i < logOrdenado.length - 1 && <div style={{ width: 1, flex: 1, background: T.border, marginTop: 4, minHeight: 18 }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 6 }}>
                      <div style={{ fontSize: 11, color: i === 0 ? "var(--accent)" : T.muted, fontWeight: i === 0 ? 700 : 500, marginBottom: 3 }}>
                        {fmtDate(n.fecha)}{i === 0 ? " · más reciente" : ""}
                      </div>
                      <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>{n.texto}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, borderTop: `1px solid ${T.border}`, paddingTop: 16, textAlign: "center" }}>
            <input type="file" multiple ref={fileInputRef} style={{ display: "none" }} onChange={handleSubirNuevaDoc} />
            <button 
              onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
              disabled={subiendo}
              style={{ background: "var(--accent)", border: "none", borderRadius: 8, color: "var(--on-accent)", padding: "8px 16px", cursor: subiendo ? "default" : "pointer", fontSize: 13, fontWeight: 700 }}
            >
              {subiendo ? "Subiendo archivos..." : "Adjuntar nueva documentación"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}