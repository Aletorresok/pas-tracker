import { useState, useEffect } from "react";
import { supabase } from "../../supabase.js";
import { ESTADOS_CASO, estadoInfo, fmtDate, fmtMoney, theme } from "./portalTheme.js";

// Reutilizamos la barra visual
function PipelineBarCliente({ estado, dark }) {
  const T = theme(dark);
  const idx = ESTADOS_CASO.findIndex(e => e.key === estado);
  const ei = ESTADOS_CASO[idx];
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
        {ESTADOS_CASO.map((e, i) => (
          <div key={e.key} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= idx ? e.color : T.border, transition: "background .3s" }} />
        ))}
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: (ei?.color || "#64748b") + (dark ? "22" : "18"), border: `1px solid ${(ei?.color || "#64748b")}44`, borderRadius: 20, padding: "4px 12px" }}>
        <span style={{ fontSize: 14 }}>{ei?.emoji}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: ei?.color || T.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>{ei?.label}</span>
      </div>
    </div>
  );
}

export default function PortalCliente({ dark, onToggleDark }) {
  const T = theme(dark);
  const [patente, setPatente] = useState("");
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  // Leer la URL por si ingresaron mediante link directo (ej: /cliente?caso=12345)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const casoId = params.get("caso");
    if (casoId) {
      buscarPorFiltro("id", casoId);
    }
  }, []);

  const buscarPorFiltro = async (columna, valor) => {
    if (!valor.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);

    try {
      // SOLO traemos los datos seguros para el cliente (nada de comisiones ni honorarios)
      const { data, error: err } = await supabase
        .from("pas_casos")
        .select("id, asegurado, compania, compania_aseguradora, estado, fecha_inicio_reclamo, fecha_ofrecimiento, fecha_pago, monto_ofrecimiento, monto_cobro_asegurado, mensaje_cliente, patente")
        .eq(columna, valor.trim().toUpperCase());

      if (err) throw err;
      if (!data || data.length === 0) {
        setError("No encontramos ningún caso con esos datos. Verificá la información.");
        setCasos([]);
      } else {
        setCasos(data);
      }
    } catch (e) {
      console.error(e);
      setError("Ocurrió un error al buscar el caso. Intentá nuevamente más tarde.");
    } finally {
      setLoading(false);
    }
  };

  const FECHAS = [
    { k: "fecha_inicio_reclamo", l: "Inicio del Reclamo" },
    { k: "fecha_ofrecimiento", l: "Fecha Ofrecimiento" },
    { k: "fecha_pago", l: "Pago Estimado" },
  ];

  const MONTOS = [
    { k: "monto_ofrecimiento", l: "Indemnización Ofrecida", c: "#f97316" },
    { k: "monto_cobro_asegurado", l: "Monto a Cobrar Neto", c: "#22c55e" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", transition: "background .3s" }}>
      
      {/* Botón Dark Mode Opcional */}
      <button onClick={onToggleDark} style={{ position: "absolute", top: 16, right: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16, color: T.sub }}>
        {dark ? "☀️" : "🌙"}
      </button>

      {/* Cabecera Pública */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🚗</div>
        <div style={{ fontSize: 12, color: "#6366f1", textTransform: "uppercase", letterSpacing: 3, marginBottom: 8, fontWeight: 800 }}>Seguimiento en línea</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: T.text, letterSpacing: -0.5 }}>Estado de tu Reclamo</div>
      </div>

      {/* Si no hay casos cargados, mostramos el buscador */}
      {casos.length === 0 && !loading && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: "40px 32px", width: "100%", maxWidth: 420, boxShadow: dark ? "0 24px 60px #0008" : "0 8px 40px #0000001a" }}>
          <label style={{ display: "block", marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>Ingresá tu patente</div>
            <input 
              type="text" 
              value={patente} 
              onChange={e => setPatente(e.target.value.toUpperCase())} 
              onKeyDown={e => e.key === "Enter" && buscarPorFiltro("patente", patente)} 
              placeholder="Ej: AB123CD" 
              style={{ ...T.input, textTransform: "uppercase", fontSize: 18, padding: "14px", textAlign: "center", letterSpacing: 2, fontWeight: 700 }} 
            />
          </label>

          {error && <div style={{ background: "#ef444415", border: "1px solid #ef444433", borderRadius: 10, padding: "12px", color: "#ef4444", fontSize: 13, marginBottom: 20, textAlign: "center", fontWeight: 500 }}>{error}</div>}

          <button onClick={() => buscarPorFiltro("patente", patente)} disabled={!patente.trim()} style={{ width: "100%", background: patente.trim() ? "#6366f1" : (dark ? "#334155" : "#e2e8f0"), border: "none", borderRadius: 12, color: patente.trim() ? "white" : T.muted, padding: "14px", cursor: patente.trim() ? "pointer" : "default", fontSize: 15, fontWeight: 800, transition: "all .2s" }}>
            Buscar mi caso 🔍
          </button>
        </div>
      )}

      {loading && <div style={{ color: T.muted, fontSize: 16, marginTop: 40, fontWeight: 600 }}>Buscando información...</div>}

      {/* Listado de Casos Encontrados */}
      {casos.length > 0 && (
        <div style={{ width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", gap: 20 }}>
          
          {casos.length > 1 && (
            <div style={{ fontSize: 13, color: T.muted, textAlign: "center", marginBottom: -10 }}>
              Encontramos {casos.length} trámites asociados a la patente <b>{patente}</b>:
            </div>
          )}

          {casos.map(caso => (
            <div key={caso.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", boxShadow: dark ? "0 10px 40px #0004" : "0 4px 20px #00000010" }}>
              
              <div style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>
                  Reclamo contra {caso.compania_aseguradora || caso.compania || "Aseguradora"}
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: T.text }}>{caso.asegurado}</div>
              </div>

              <PipelineBarCliente estado={caso.estado} dark={dark} />

              {/* Mensaje del PAS para el cliente */}
              {caso.mensaje_cliente && (
                <div style={{ marginTop: 20, background: dark ? "#3b82f615" : "#eff6ff", border: "1px solid #3b82f644", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#2563eb", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 800, marginBottom: 6 }}>👨‍💼 Novedades de tu asesor</div>
                  <div style={{ fontSize: 14, color: T.text, fontWeight: 500, lineHeight: 1.5 }}>{caso.mensaje_cliente}</div>
                </div>
              )}

              {/* Grilla de Fechas */}
              {FECHAS.filter(f => caso[f.k]).length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, marginBottom: 10 }}>Fechas Clave</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                    {FECHAS.filter(f => caso[f.k]).map(f => (
                      <div key={f.k} style={{ background: T.card2, borderRadius: 10, padding: "12px", border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{f.l}</div>
                        <div style={{ fontSize: 15, color: T.text, fontWeight: 800 }}>{fmtDate(caso[f.k])}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grilla de Montos (Netos para el cliente) */}
              {MONTOS.filter(f => Number(caso[f.k]) > 0).length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, marginBottom: 10 }}>Liquidación</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                    {MONTOS.filter(f => Number(caso[f.k]) > 0).map(f => (
                      <div key={f.k} style={{ background: T.card2, borderRadius: 10, padding: "14px 16px", border: `1px solid ${f.c}44` }}>
                        <div style={{ fontSize: 11, color: f.c, marginBottom: 4, fontWeight: 600 }}>{f.l}</div>
                        <div style={{ fontSize: 20, color: f.c, fontWeight: 900 }}>{fmtMoney(caso[f.k])}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ))}

          <button onClick={() => { setCasos([]); setPatente(""); }} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 12, color: T.sub, padding: "12px", cursor: "pointer", fontSize: 14, fontWeight: 700, marginTop: 10 }}>
            Volver a buscar
          </button>
        </div>
      )}
    </div>
  );
}