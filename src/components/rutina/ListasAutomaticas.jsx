import { useEffect, useMemo, useState } from "react";
import { fechaLocalISO, sumarDias, diasDesde } from "../../utils/formatters.js";
import { esActivo } from "../../utils/metricas.js";
import { cargarPlazosPendientes, cargarExpedientes } from "../../utils/expedientes.js";
import Icono from "../ui/Icono.jsx";
import { proximosEventos, tipoEvento, fechaDe, horaDe } from "../../utils/agenda.js";

export const DIAS_SIN_NOVEDADES = 15;

const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 };

// Listas que arma la app sola para la rutina del día
export default function ListasAutomaticas({ allCasos, onAbrirCaso, onAbrirExpediente }) {
  const [extra, setExtra] = useState({ plazos: [], expedientes: [], eventos: [] });
  useEffect(() => {
    let vivo = true;
    Promise.all([cargarPlazosPendientes(), cargarExpedientes(), proximosEventos(2)]).then(([plazos, expedientes, eventos]) => {
      if (vivo) setExtra({ plazos: plazos || [], expedientes: expedientes || [], eventos: eventos || [] });
    });
    return () => { vivo = false; };
  }, []);

  const listas = useMemo(() => {
    const hoy = fechaLocalISO(), manana = sumarDias(hoy, 1);
    const activos = allCasos.filter(esActivo);
    const porCaso = Object.fromEntries(allCasos.map(c => [String(c.id), c]));
    const exps = Object.fromEntries(extra.expedientes.map(e => [e.id, e]));
    const desdeNovedad = c => String(c.mensaje_cliente_fecha || c.fecha_derivacion || "").slice(0, 10);
    const dias = iso => (iso ? diasDesde(iso) : null);

    const fila = (c, detalle) => ({ id: c.id, titulo: c.asegurado || "Sin nombre", detalle, abrir: () => onAbrirCaso(c) });
    return [
      { k: "audiencias", titulo: "Preparar para mañana", vacio: "Mañana no hay mediaciones ni audiencias.",
        filas: extra.eventos.filter(e => fechaDe(new Date(e.inicio)) === manana).map(e => {
          const c = e.caso_id ? porCaso[String(e.caso_id)] : null;
          const x = e.expediente_id ? exps[e.expediente_id] : null;
          return { id: e.id, titulo: `${tipoEvento(e.tipo)} ${horaDe(new Date(e.inicio))}`, detalle: c?.asegurado || x?.caratula || "",
            abrir: c ? () => onAbrirCaso(c) : x ? () => onAbrirExpediente(x.id) : null };
        }) },
      { k: "novedades", titulo: `Clientes sin novedades hace ${DIAS_SIN_NOVEDADES} días`, vacio: "Todos tus clientes tuvieron novedades hace poco.",
        filas: activos.filter(c => { const d = dias(desdeNovedad(c)); return d !== null && d >= DIAS_SIN_NOVEDADES; })
          .sort((a, b) => desdeNovedad(a).localeCompare(desdeNovedad(b)))
          .map(c => fila(c, `Último mensaje hace ${dias(desdeNovedad(c))} d`)) },
      { k: "documentacion", titulo: "Documentación pendiente", vacio: "Ningún caso espera documentación.",
        filas: activos.filter(c => c.estado === "doc_pendiente")
          .sort((a, b) => String(a.fecha_derivacion || "").localeCompare(String(b.fecha_derivacion || "")))
          .map(c => fila(c, c.fecha_derivacion ? `Derivado hace ${dias(String(c.fecha_derivacion).slice(0, 10))} d` : "")) },
      { k: "ofrecimientos", titulo: "Ofrecimientos sin respuesta", vacio: "No hay ofrecimientos esperando respuesta.",
        filas: activos.filter(c => c.estado === "con_ofrecimiento")
          .map(c => fila(c, c.fecha_ofrecimiento ? `Ofrecido hace ${dias(String(c.fecha_ofrecimiento).slice(0, 10))} d` : c.compania_aseguradora || "")) },
      { k: "escritos", titulo: "Escritos colgados", vacio: "No hay escritos colgados.",
        filas: extra.plazos.filter(p => p.tipo === "escrito" && p.fecha_objetivo && p.fecha_objetivo < hoy).map(p => {
          const x = p.expediente_id ? exps[p.expediente_id] : null;
          const c = p.caso_id ? porCaso[String(p.caso_id)] : null;
          return { id: p.id, titulo: p.titulo, detalle: `${x?.caratula || c?.asegurado || ""} · colgado ${dias(p.fecha_objetivo)} d`,
            abrir: x ? () => onAbrirExpediente(x.id) : c ? () => onAbrirCaso(c) : null };
        }) },
    ];
  }, [allCasos, extra, onAbrirCaso, onAbrirExpediente]);

  return (
    <section style={{ ...tarjeta, padding: "12px 16px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Listas de hoy</h2>
      {listas.map((l, i) => (
        <details key={l.k} open={l.k === "audiencias" && l.filas.length > 0} style={{ borderTop: i ? "1px solid var(--border)" : "none", padding: "8px 0" }}>
          <summary className="lista-auto" style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: l.filas.length ? "var(--text)" : "var(--muted)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, listStyle: "none" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icono nombre="chevron" size={14} />{l.titulo}</span>
            <span className="num" style={{ color: l.filas.length ? "var(--accent-ink)" : "var(--muted)" }}>{l.filas.length}</span>
          </summary>
          {!l.filas.length && <div style={{ fontSize: 13, color: "var(--muted)", padding: "6px 0 0" }}>{l.vacio}</div>}
          <div style={{ maxHeight: 260, overflowY: "auto", marginTop: 4 }}>
            {l.filas.map(f => (
              <button key={f.id} type="button" onClick={f.abrir || undefined} disabled={!f.abrir}
                style={{ display: "flex", justifyContent: "space-between", gap: 8, width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 0", cursor: f.abrir ? "pointer" : "default", font: "inherit", color: "var(--text)" }}>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.titulo}</span>
                <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>{f.detalle}</span>
              </button>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
