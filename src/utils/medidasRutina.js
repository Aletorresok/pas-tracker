// Ítems de la rutina que se miden solos con los datos de la app (se reconocen por el título).
// Si se cumplen, Hoy los tilda solo. Para que un ítem nuevo se mida, el título tiene que nombrar lo que mide.
import { fechaLocalISO } from "./formatters.js";
import { esActivo } from "./metricas.js";
import { esMailEnviado, RESULTADO_RECORDATORIO } from "./mensajes.js";

// PAS contactados hoy: por WhatsApp (o teléfono) y mails de presentación (los recordatorios descartados no cuentan)
export function contactosDeHoy(historial, hoyISO = fechaLocalISO()) {
  let whatsapp = 0, mails = 0;
  Object.values(historial || {}).forEach(lista => (lista || []).forEach(e => {
    if (String(e?.fecha).slice(0, 10) !== hoyISO) return;
    if (esMailEnviado(e)) mails++;
    else if (!((e.resultados || []).includes(RESULTADO_RECORDATORIO) && e.nota === "Recordatorio descartado")) whatsapp++;
  }));
  return { whatsapp, mails };
}

const MEDIDAS = [
  { k: "whatsapp", re: /whats ?app/i, meta: 15 },
  { k: "mails", re: /mails? de presentaci/i, meta: 30 },
  { k: "quietos", re: /quieto/i },
  { k: "pedir", re: /pedir respuesta|iniciados/i },
  { k: "acciones", re: /pr[oó]ximas acciones/i },
];

export const medidaDe = item => MEDIDAS.find(m => m.re.test(item?.titulo || "")) || null;

// Lo que hace falta para medir: contactos del día, tareas de Hoy y casos
export function contarParaRutina({ contactos, tareas, allCasos, hoy = fechaLocalISO() }) {
  return {
    whatsapp: contactos.whatsapp,
    mails: contactos.mails,
    quietos: tareas.filter(t => t.tipo === "quieto").length,
    pedir: tareas.filter(t => t.tipo === "pedir_respuesta").length,
    sinAccion: allCasos.filter(c => esActivo(c) && !(c.proxima_accion?.trim() && c.proxima_accion_vence && c.proxima_accion_vence >= hoy)).length,
  };
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// { cumple, texto, progreso: [hecho, meta] | null } o null si el ítem no se mide
export function estadoMedida(item, n) {
  const m = medidaDe(item);
  if (!m) return null;
  if (m.k === "whatsapp" || m.k === "mails") {
    const meta = Number(item.titulo.match(/\d+/)?.[0]) || m.meta;
    const hecho = m.k === "whatsapp" ? n.whatsapp : n.mails;
    return { cumple: hecho >= meta, texto: null, progreso: [hecho, meta] };
  }
  const falta = m.k === "quietos" ? n.quietos : m.k === "pedir" ? n.pedir : n.sinAccion;
  const texto = m.k === "quietos" ? plural(falta, "reclamo quieto sin reiterar", "reclamos quietos sin reiterar")
    : m.k === "pedir" ? plural(falta, "iniciado para pedir respuesta", "iniciados para pedir respuesta")
    : plural(falta, "caso sin próxima acción al día", "casos sin próxima acción al día");
  return { cumple: falta === 0, texto: falta ? `Faltan: ${texto}` : "Al día", progreso: null };
}
