import { useEffect, useMemo, useRef } from "react";
import { useRutina } from "../../hooks/useRutina.js";
import { tocaHoy, escuelaDelDia, bloquesDelDia, ahoraToca, hhmm } from "../../utils/rutina.js";
import { rangoPeriodo } from "../../utils/objetivos.js";
import { recordatorioPendiente } from "../../utils/mensajes.js";
import { estadoMedida } from "../../utils/medidasRutina.js";
import { FilaItem } from "../rutina/ChecklistRutina.jsx";
import { TarjetaObjetivo } from "../rutina/ObjetivosPanel.jsx";
import BarraMeta from "../ui/BarraMeta.jsx";

const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "12px 16px", minWidth: 0 };
const link = { background: "none", border: "none", padding: 0, font: "inherit", fontSize: 13, fontWeight: 600, color: "var(--accent-ink)", cursor: "pointer", whiteSpace: "nowrap" };

// Mi día (abajo de Hoy): la rutina completa del día por bloques, con el de ahora resaltado.
// Los ítems que se pueden medir (WhatsApp y mails a PAS, reclamos quietos, pedidos de respuesta, próximas acciones)
// muestran cómo vienen y se tildan solos al cumplirse. Debajo, lo semanal y mensual que toca y el objetivo del año.
export default function MiDia({ conteo, allCasos, historial, derivadores = {}, descartados = {}, onIrA }) {
  const { datos, falta, hecho, tildar } = useRutina();

  const dia = useMemo(() => {
    if (!datos) return null;
    const deHoy = f => datos.items.filter(it => it.frecuencia === f && tocaHoy(it));
    const { bloques } = bloquesDelDia(deHoy("diaria"), escuelaDelDia(datos.escuela));
    const { inicio } = rangoPeriodo("anio");
    const delAnio = datos.objetivos.filter(o => o.periodo === "anio" && o.inicio === inicio);
    return { bloques, ahora: ahoraToca(bloques), periodicos: [...deHoy("semanal"), ...deHoy("mensual")].filter(it => !hecho(it)), anual: delAnio.find(o => o.metrica) || delAnio[0] || null };
  }, [datos, hecho]);

  // Lo que se cumplió solo queda tildado (una vez por ítem y por carga)
  const intentados = useRef(new Set());
  useEffect(() => {
    if (!dia) return;
    dia.bloques.flatMap(b => b.items).forEach(it => {
      const m = estadoMedida(it, conteo);
      if (m?.cumple && !hecho(it) && !intentados.current.has(it.id)) { intentados.current.add(it.id); tildar(it, true); }
    });
  }, [dia, conteo, hecho, tildar]);

  const paraRecordar = useMemo(() => Object.entries(historial || {})
    .filter(([id, lista]) => !derivadores[id] && !descartados[id] && recordatorioPendiente(lista)).length, [historial, derivadores, descartados]);

  if (!datos || falta || !dia) return null;
  if (!datos.items.length) {
    return (
      <section style={{ ...tarjeta, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 14, color: "var(--sub)" }}>
        Armá tu rutina: acá vas a ver qué toca en cada momento del día y cómo venís.
        <button type="button" onClick={() => onIrA?.("rutina")} style={link}>Ir a Rutina →</button>
      </section>
    );
  }

  const total = dia.bloques.reduce((s, b) => s + b.items.length, 0);
  const listos = dia.bloques.reduce((s, b) => s + b.items.filter(hecho).length, 0);
  const fila = it => {
    const m = estadoMedida(it, conteo);
    return (
      <div key={it.id} style={{ borderTop: "1px solid var(--border)" }}>
        <FilaItem item={it} hecho={hecho(it)} onTildar={tildar} onIrA={onIrA} extra={m?.texto || undefined} />
        {m?.progreso && <div style={{ padding: "0 0 8px 28px" }}><BarraMeta etiqueta="Hoy" hecho={m.progreso[0]} meta={m.progreso[1]} /></div>}
      </div>
    );
  };

  return (
    <section className="panel-vidrio" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "0 4px" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Mi día <span className="num" style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>{listos} de {total}</span></h2>
        <button type="button" onClick={() => onIrA?.("rutina")} style={link}>Rutina y objetivos →</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, alignItems: "start" }}>
        {dia.bloques.map(b => {
          const actual = dia.ahora?.bloque === b;
          const completo = b.items.every(hecho);
          return (
            <div key={`${b.bloque}|${b.hora_inicio}`} style={{ ...tarjeta, borderColor: actual ? "var(--accent)" : "var(--border)", boxShadow: actual ? "0 0 0 1px var(--accent)" : "none", opacity: completo && !actual ? 0.7 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                  {b.bloque}
                  {actual && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "var(--accent-ink)", textTransform: "uppercase", letterSpacing: 0.4 }}>{dia.ahora.enCurso ? "Ahora" : "Lo próximo"}</span>}
                </h3>
                <span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{hhmm(b.hora_inicio)}{b.hora_fin ? `–${hhmm(b.hora_fin)}` : ""}</span>
              </div>
              {b.aviso && <div style={{ fontSize: 12, color: "var(--warn)" }}>{b.aviso}</div>}
              {b.items.map(fila)}
              {/^prospecci/i.test(b.bloque) && paraRecordar > 0 && (
                <div style={{ fontSize: 12, color: "var(--sub)", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <b style={{ color: "var(--text)" }}>{paraRecordar}</b> {paraRecordar === 1 ? "PAS interesado" : "PAS interesados"} sin derivar hace un mes.{" "}
                  <button type="button" onClick={() => onIrA?.("prospeccion")} style={{ ...link, fontSize: 12 }}>Contactos →</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(dia.periodicos.length > 0 || dia.anual) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, alignItems: "start" }}>
          {dia.periodicos.length > 0 && (
            <div style={tarjeta}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Esta semana y este mes</h3>
              {dia.periodicos.map(fila)}
            </div>
          )}
          {dia.anual && (
            <div style={tarjeta}>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Objetivo del año</h3>
              <TarjetaObjetivo obj={dia.anual} datos={{ allCasos, historial, rutina: { items: datos.items, registro: datos.registro } }} compacto={false} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
