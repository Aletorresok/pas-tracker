import { useState } from "react";
import { ESTADOS_CASO, estadoInfo, fmtDate, fmtMoney, theme } from "./portalTheme.js";

function PipelineBar({ estado, dark }) {
  const T = theme(dark);
  const idx = ESTADOS_CASO.findIndex(e => e.key === estado);
  const ei = ESTADOS_CASO[idx];
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
        {ESTADOS_CASO.map((e, i) => (
          <div key={e.key} title={e.label} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= idx ? e.color : T.border, transition: "background .3s" }} />
        ))}
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: (ei?.color || "#64748b") + (dark ? "22" : "18"), border: `1px solid ${(ei?.color || "#64748b")}44`, borderRadius: 20, padding: "3px 10px" }}>
        <span style={{ fontSize: 12 }}>{ei?.emoji}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: ei?.color || T.sub }}>{ei?.label}</span>
      </div>
    </div>
  );
}

export default function PortalCasoCard({ caso, dark }) {
  const [open, setOpen] = useState(false);
  const T = theme(dark);
  const ei = estadoInfo(caso.estado);
  const logOrdenado = [...(caso.notas_log || [])].sort((a, b) => b.ts - a.ts);
  const ultimaAccion = logOrdenado[0] || null;

  const FECHAS = [
    { k: "fecha_derivacion", l: "Derivación" },
    { k: "fecha_contacto_asegurado", l: "Contacto asegurado" },
    { k: "fecha_inicio_reclamo", l: "Inicio reclamo" },
    { k: "fecha_ofrecimiento", l: "Ofrecimiento" },
    { k: "fecha_firma", l: "Firma" },
    { k: "fecha_mediacion", l: "Mediación" },
    { k: "fecha_pago", l: "Pago" },
    { k: "fecha_cobro", l: "Cobro" },
    { k: "fecha_ultimo_movimiento", l: "Último movimiento" },
  ];

  const MONTOS = [
    { k: "monto_ofrecimiento", l: "Ofrecimiento", c: "#f97316" },
    { k: "monto_cobro_asegurado", l: "Cobró asegurado", c: "#22c55e" },
    { k: "monto_cobro_yo", l: "Honorarios", c: "#6366f1" },
    { k: "monto_comision_pas", l: "Tu comisión", c: "#eab308" },
  ];

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${open ? ei.color + "88" : T.border}`,
      borderRadius: 14,
      marginBottom: 12,
      overflow: "hidden",
      transition: "all .2s",
      boxShadow: dark ? "none" : "0 1px 4px #0000000a",
    }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "16px 18px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, lineHeight: 1.3 }}>{caso.asegurado}</div>
          <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{open ? "▲" : "▼"}</div>
        </div>

        <PipelineBar estado={caso.estado} dark={dark} />

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {caso.fecha_derivacion && (
            <span style={{ fontSize: 11, background: T.card2, color: T.sub, borderRadius: 6, padding: "3px 8px", border: `1px solid ${T.border}` }}>📅 {fmtDate(caso.fecha_derivacion)}</span>
          )}
          {caso.monto_ofrecimiento && (
            <span style={{ fontSize: 11, background: "#f9731618", color: "#f97316", borderRadius: 6, padding: "3px 8px", border: "1px solid #f9731633", fontWeight: 600 }}>💬 Ofrecim. {fmtMoney(caso.monto_ofrecimiento)}</span>
          )}
          {caso.estado === "cobrado" && caso.monto_cobro_asegurado && (
            <span style={{ fontSize: 11, background: "#22c55e18", color: "#22c55e", borderRadius: 6, padding: "3px 8px", border: "1px solid #22c55e33", fontWeight: 600 }}>✅ {fmtMoney(caso.monto_cobro_asegurado)}</span>
          )}
        </div>

        {ultimaAccion && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "flex-start", gap: 8, background: T.card2, borderRadius: 8, padding: "8px 11px", border: `1px solid ${T.border}` }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", marginTop: 4, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, marginBottom: 2 }}>{fmtDate(ultimaAccion.fecha)} · última acción{logOrdenado.length > 1 ? ` (${logOrdenado.length})` : ""}</div>
              <div style={{ fontSize: 13, color: T.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ultimaAccion.texto}</div>
            </div>
          </div>
        )}
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "16px 18px", background: dark ? T.card2 : "#fafbfc" }}>
          {FECHAS.filter(f => caso[f.k]).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 }}>Fechas</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {FECHAS.filter(f => caso[f.k]).map(f => (
                  <div key={f.k} style={{ background: T.card, borderRadius: 8, padding: "10px 12px", border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 10, color: T.muted, marginBottom: 3 }}>{f.l}</div>
                    <div style={{ fontSize: 14, color: T.text, fontWeight: 700 }}>{fmtDate(caso[f.k])}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {MONTOS.filter(f => caso[f.k]).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 }}>Montos</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {MONTOS.filter(f => caso[f.k]).map(f => (
                  <div key={f.k} style={{ background: T.card, borderRadius: 8, padding: "10px 12px", border: `1px solid ${f.c}33` }}>
                    <div style={{ fontSize: 10, color: f.c + "aa", marginBottom: 3 }}>{f.l}</div>
                    <div style={{ fontSize: 15, color: f.c, fontWeight: 800 }}>{fmtMoney(caso[f.k])}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {caso.nota && (
            <div style={{ background: T.card, borderRadius: 8, padding: "10px 12px", marginBottom: 16, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 10, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Nota del caso</div>
              <div style={{ fontSize: 13, color: T.sub, fontStyle: "italic", lineHeight: 1.5 }}>{caso.nota}</div>
            </div>
          )}

          {logOrdenado.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, marginBottom: 12 }}>Historial de acciones</div>
              <div style={{ paddingLeft: 6 }}>
                {logOrdenado.map((n, i) => (
                  <div key={n.ts} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: i === 0 ? "#6366f1" : T.border2, marginTop: 3, flexShrink: 0, border: i === 0 ? "2px solid #6366f144" : "none" }} />
                      {i < logOrdenado.length - 1 && <div style={{ width: 1, flex: 1, background: T.border, marginTop: 4, minHeight: 18 }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 6 }}>
                      <div style={{ fontSize: 11, color: i === 0 ? "#6366f1" : T.muted, fontWeight: i === 0 ? 700 : 500, marginBottom: 3 }}>
                        {fmtDate(n.fecha)}{i === 0 ? " · más reciente" : ""}
                      </div>
                      <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>{n.texto}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
