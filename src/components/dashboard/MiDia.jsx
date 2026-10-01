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

// Mi día (abajo de Hoy): lo que falta de la rutina de hoy en orden de horario, con el bloque de ahora marcado;
// lo tildado desaparece. Los ítems que se pueden medir (WhatsApp y mails a PAS, reclamos quietos, pedidos de respuesta,
// próximas acciones) muestran cómo vienen y se tildan solos al cumplirse. Después, lo de la semana y el mes, y el objetivo del año.
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
        <button type="button" onClick={() => onIrA?.("ajustes")} style={link}>Armarla en Ajustes →</button>
      </section>
    );
  }

  const total = dia.bloques.reduce((s, b) => s + b.items.length, 0);
  const listos = dia.bloques.reduce((s, b) => s + b.items.filter(hecho).length, 0);
  // Una sola lista: lo pendiente de hoy en orden de horario (lo tildado desaparece), y después lo de la semana y el mes
  const pendientes = [
    ...dia.bloques.flatMap(b => b.items.filter(it => !hecho(it)).map(it => ({ it, bloque: b }))),
    ...dia.periodicos.map(it => ({ it, bloque: null })),
  ];
  const fila = ({ it, bloque }) => {
    const m = estadoMedida(it, conteo);
    const actual = bloque && dia.ahora?.bloque === bloque;
    const cuando = bloque ? [bloque.bloque, hhmm(bloque.hora_inicio)].filter(Boolean).join(" · ") : it.frecuencia === "semanal" ? "Esta semana" : "Este mes";
    return (
      <div key={it.id} style={{ borderTop: "1px solid var(--border)", paddingLeft: 8, marginLeft: -8, borderLeft: actual ? "3px solid var(--accent)" : "3px solid transparent" }}>
        <FilaItem item={it} hecho={false} onTildar={tildar} onIrA={onIrA}
          extra={[actual ? (dia.ahora.enCurso ? "Ahora" : "Lo próximo") : null, cuando, m?.texto].filter(Boolean).join(" · ")} />
        {m?.progreso && <div style={{ padding: "0 0 8px 28px" }}><BarraMeta etiqueta="Hoy" hecho={m.progreso[0]} meta={m.progreso[1]} /></div>}
        {/^prospecci/i.test(bloque?.bloque || "") && /whats ?app/i.test(it.titulo) && paraRecordar > 0 && (
          <div style={{ fontSize: 12, color: "var(--sub)", padding: "0 0 8px 28px" }}>
            <b style={{ color: "var(--text)" }}>{paraRecordar}</b> {paraRecordar === 1 ? "PAS interesado" : "PAS interesados"} sin derivar hace un mes.{" "}
            <button type="button" onClick={() => onIrA?.("prospeccion")} style={{ ...link, fontSize: 12 }}>Contactos →</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="panel-vidrio" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "0 4px" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Mi día <span className="num" style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>{listos} de {total}</span></h2>
        <button type="button" onClick={() => onIrA?.("ajustes")} style={link}>Editar rutina →</button>
      </div>
      {pendientes.length === 0
        ? <div style={{ fontSize: 14, color: "var(--sub)", padding: "6px 4px" }}>Rutina de hoy completa.</div>
        : <div className="lista-scroll" style={{ maxHeight: 360, overflowY: "auto", padding: "0 4px" }}>{pendientes.map(fila)}</div>}
      {dia.anual && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700 }}>Objetivo del año</h3>
          <TarjetaObjetivo obj={dia.anual} datos={{ allCasos, historial, rutina: { items: datos.items, registro: datos.registro } }} compacto />
        </div>
      )}
    </section>
  );
}
