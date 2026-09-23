import { useState, useEffect, useMemo } from "react";
import { proximosEventos, escucharCambios, describirCuando, tipoEvento, linkGoogleCalendar, fechaDe } from "../../utils/agenda.js";
import { fechaLocalISO } from "../../utils/formatters.js";

const DIAS = 14;

// Mediaciones, audiencias y vencimientos de las próximas 2 semanas (de todos los casos)
export default function AgendaHoy({ allCasos, onAbrir }) {
  const [eventos, setEventos] = useState(null);
  const [falla, setFalla] = useState(false);

  useEffect(() => {
    const cargar = () => proximosEventos(DIAS).then(d => { setFalla(d === null); setEventos(d || []); });
    cargar();
    return escucharCambios(cargar);
  }, []);

  const porId = useMemo(() => Object.fromEntries(allCasos.map(c => [String(c.id), c])), [allCasos]);
  const hoy = fechaLocalISO();
  if (falla) return null; // la tabla todavía no existe (falta el SQL de la agenda)

  const link = { fontSize: 12, fontWeight: 600, color: "var(--accent-ink)", textDecoration: "none", whiteSpace: "nowrap" };

  return (
    <section style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Agenda</h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>próximos {DIAS} días</span>
      </div>
      {eventos === null && <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>Cargando…</div>}
      {eventos && !eventos.length && (
        <div style={{ fontSize: 13, color: "var(--sub)", padding: "8px 0", lineHeight: 1.5 }}>Sin mediaciones ni audiencias. Se agendan desde la ficha del caso (Resumen → Agenda).</div>
      )}
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {(eventos || []).map((e, i) => {
          const c = porId[String(e.caso_id)] || {};
          const esHoy = fechaDe(new Date(e.inicio)) === hoy;
          return (
            <div key={e.id} style={{ padding: "8px 0", borderTop: i ? "1px solid var(--border)" : "none", display: "flex", flexDirection: "column", gap: 3 }}>
              <button type="button" onClick={() => c.id && onAbrir(c)} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit" }}>
                <span style={{ minWidth: 0, fontSize: 14 }}>
                  <b style={{ fontWeight: 600 }}>{tipoEvento(e.tipo)}</b>
                  <span style={{ color: "var(--sub)" }}> · {c.asegurado || "caso"}</span>
                </span>
                <span className="num" style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", color: esHoy ? "var(--warn)" : "var(--text)" }}>{describirCuando(e.inicio)}</span>
              </button>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {c.compania_aseguradora && <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.compania_aseguradora}</span>}
                {e.link && <a href={e.link} target="_blank" rel="noreferrer" style={link}>Unirse →</a>}
                <a href={linkGoogleCalendar(e, c)} target="_blank" rel="noreferrer" style={{ ...link, color: "var(--sub)", fontWeight: 500 }}>+ Google Calendar</a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
