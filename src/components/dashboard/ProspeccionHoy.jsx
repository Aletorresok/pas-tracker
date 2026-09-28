import { MAILS_POR_DIA, esMailEnviado, recordatorioPendiente, RESULTADO_RECORDATORIO } from "../../utils/mensajes.js";
import { fechaLocalISO } from "../../utils/formatters.js";
import BarraMeta from "../ui/BarraMeta.jsx";

// Cupo diario de prospección: PAS contactados por WhatsApp (o teléfono) y mails de presentación
export const WHATSAPP_POR_DIA = 15;

export function contactosDeHoy(historial, hoyISO = fechaLocalISO()) {
  let whatsapp = 0, mails = 0;
  Object.values(historial || {}).forEach(lista => (lista || []).forEach(e => {
    if (String(e?.fecha).slice(0, 10) !== hoyISO) return;
    if (esMailEnviado(e)) mails++;
    else if (!((e.resultados || []).includes(RESULTADO_RECORDATORIO) && e.nota === "Recordatorio descartado")) whatsapp++;
  }));
  return { whatsapp, mails };
}

export default function ProspeccionHoy({ historial, derivadores = {}, descartados = {}, onIr }) {
  const { whatsapp, mails } = contactosDeHoy(historial);
  const paraRecordar = Object.entries(historial || {}).filter(([id, lista]) => !derivadores[id] && !descartados[id] && recordatorioPendiente(lista)).length;
  const listo = whatsapp >= WHATSAPP_POR_DIA && mails >= MAILS_POR_DIA;
  return (
    <section style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Prospección del día</h2>
        <button type="button" onClick={onIr} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontSize: 13, fontWeight: 600, color: "var(--accent-ink)", cursor: "pointer" }}>
          {listo ? "Ver Contactos →" : "Seguir en Contactos →"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <BarraMeta etiqueta="WhatsApp a PAS" hecho={whatsapp} meta={WHATSAPP_POR_DIA} />
        <BarraMeta etiqueta="Mails de presentación" hecho={mails} meta={MAILS_POR_DIA} />
      </div>
      {paraRecordar > 0 && (
        <div style={{ fontSize: 13, color: "var(--sub)", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <b style={{ color: "var(--text)" }}>{paraRecordar}</b> {paraRecordar === 1 ? "PAS interesado" : "PAS interesados"} sin derivar hace un mes: en Contactos → <b>Para recordar</b>.
        </div>
      )}
    </section>
  );
}
