import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabase.js";
import { esActivo } from "../../utils/metricas.js";
import { tipoEvento, horaDe } from "../../utils/agenda.js";
import { sumarDiasISO } from "../../utils/plazos.js";
import { tarjeta } from "./comunes.jsx";

const dias = (a, b) => Math.round((new Date(`${String(b).slice(0, 10)}T12:00:00`) - new Date(`${String(a).slice(0, 10)}T12:00:00`)) / 86400000);
const SIN_NOVEDADES = 15;
const OFRECIMIENTO_QUIETO = 7;

// Listas que arma la app sola con los datos de los casos, la agenda y los escritos
export default function PendientesAuto({ allCasos, hoy, onIr }) {
  const [manana, setManana] = useState([]);
  const [colgados, setColgados] = useState([]);
  const [abierta, setAbierta] = useState(null);

  useEffect(() => {
    const desde = new Date(`${sumarDiasISO(hoy, 1)}T00:00:00`), hasta = new Date(`${sumarDiasISO(hoy, 2)}T00:00:00`);
    supabase.from("pas_eventos").select("*").gte("inicio", desde.toISOString()).lt("inicio", hasta.toISOString()).in("tipo", ["mediacion", "audiencia"])
      .then(({ data }) => setManana(data || []));
    supabase.from("plazos").select("id, titulo, fecha_objetivo, caso_id, expedientes(caratula)").eq("tipo", "escrito").eq("estado", "pendiente").lt("fecha_objetivo", hoy)
      .then(({ data }) => setColgados(data || []));
  }, [hoy]);

  const porId = useMemo(() => Object.fromEntries(allCasos.map(c => [String(c.id), c])), [allCasos]);
  const listas = useMemo(() => {
    const activos = allCasos.filter(esActivo);
    return [
      { k: "manana", titulo: "Mañana: preparar", ir: "casos", filas: manana.map(e => ({ id: e.id, texto: `${tipoEvento(e.tipo)} de ${porId[String(e.caso_id)]?.asegurado || "un expediente"}`, detalle: horaDe(new Date(e.inicio)) })) },
      { k: "colgados", titulo: "Escritos colgados", ir: "expedientes", filas: colgados.map(p => ({ id: p.id, texto: `${p.titulo} · ${p.expedientes?.caratula || porId[String(p.caso_id)]?.asegurado || ""}`, detalle: `hace ${dias(p.fecha_objetivo, hoy)} d` })) },
      { k: "documentacion", titulo: "Documentación pendiente", ir: "casos", filas: activos.filter(c => c.estado === "doc_pendiente").map(c => ({ id: c.id, texto: c.asegurado || "Sin nombre", detalle: c.fecha_derivacion ? `hace ${dias(c.fecha_derivacion, hoy)} d` : "" })) },
      { k: "ofrecimientos", titulo: "Ofrecimientos sin respuesta", ir: "casos", filas: activos.filter(c => c.estado === "con_ofrecimiento" && dias(c.fecha_ultimo_movimiento || c.fecha_derivacion || hoy, hoy) >= OFRECIMIENTO_QUIETO).map(c => ({ id: c.id, texto: c.asegurado || "Sin nombre", detalle: `hace ${dias(c.fecha_ultimo_movimiento || c.fecha_derivacion, hoy)} d` })) },
      { k: "novedades", titulo: `Clientes sin novedades hace ${SIN_NOVEDADES} días`, ir: "casos", filas: activos.filter(c => dias(c.mensaje_cliente_fecha || c.fecha_derivacion || hoy, hoy) >= SIN_NOVEDADES).map(c => ({ id: c.id, texto: c.asegurado || "Sin nombre", detalle: c.mensaje_cliente_fecha ? `último aviso hace ${dias(c.mensaje_cliente_fecha, hoy)} d` : "nunca se le avisó" })) },
    ];
  }, [allCasos, manana, colgados, porId, hoy]);

  return (
    <div style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Lo que la app encontró</div>
      {listas.map(l => (
        <div key={l.k} style={{ borderTop: "1px solid var(--border)", padding: "8px 0" }}>
          <button type="button" onClick={() => setAbierta(a => (a === l.k ? null : l.k))} aria-expanded={abierta === l.k} disabled={!l.filas.length}
            style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0, font: "inherit", fontSize: 14, color: l.filas.length ? "var(--text)" : "var(--muted)", cursor: l.filas.length ? "pointer" : "default", textAlign: "left" }}>
            <span>{l.titulo}</span>
            <span className="num" style={{ fontWeight: 700, color: l.filas.length ? (l.k === "manana" || l.k === "colgados" ? "var(--warn)" : "var(--text)") : "var(--muted)" }}>{l.filas.length || "—"}</span>
          </button>
          {abierta === l.k && (
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
              {l.filas.slice(0, 8).map(f => (
                <div key={f.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.texto}</span>
                  <span className="num" style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{f.detalle}</span>
                </div>
              ))}
              {l.filas.length > 8 && <div style={{ fontSize: 12, color: "var(--muted)" }}>y {l.filas.length - 8} más</div>}
              <button type="button" onClick={() => onIr(l.ir)} style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, marginTop: 2, color: "var(--accent-ink)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                Ir a {l.ir === "casos" ? "Casos PAS" : "Expedientes"} →
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
