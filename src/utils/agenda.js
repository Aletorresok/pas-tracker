// Agenda de los casos: mediaciones, audiencias, vencimientos y reuniones (tabla pas_eventos).
import { supabase } from "../supabase.js";

export const TIPOS_EVENTO = [
  { k: "mediacion", l: "Mediación" },
  { k: "audiencia", l: "Audiencia" },
  { k: "vencimiento", l: "Vencimiento" },
  { k: "reunion", l: "Reunión" },
  { k: "otro", l: "Otro" },
];
export const tipoEvento = k => TIPOS_EVENTO.find(t => t.k === k)?.l || "Evento";

const ZONA = "America/Argentina/Buenos_Aires";
const CAMBIO = "pas-eventos-cambio"; // aviso interno para que Hoy recargue la agenda

// Fecha y hora locales → Date. Hora vacía = 9:00.
export const armarInicio = (fecha, hora) => new Date(`${fecha}T${hora || "09:00"}:00`);
const dos = n => String(n).padStart(2, "0");
export const fechaDe = d => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
export const horaDe = d => `${dos(d.getHours())}:${dos(d.getMinutes())}`;

export function describirCuando(inicio, hoy = new Date()) {
  const d = new Date(inicio);
  const dia = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const hoy0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const diff = Math.round((dia - hoy0) / 86400000);
  const hora = horaDe(d);
  if (diff === 0) return `Hoy ${hora}`;
  if (diff === 1) return `Mañana ${hora}`;
  if (diff === -1) return `Ayer ${hora}`;
  const txt = d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  return `${txt.charAt(0).toUpperCase() + txt.slice(1)} ${hora}`;
}

// "Agregar a Google Calendar": abre Google Calendar con el evento completo, listo para guardar
export function linkGoogleCalendar(ev, caso = {}) {
  const ini = new Date(ev.inicio);
  const fin = new Date(ini.getTime() + (Number(ev.duracion_min) || 60) * 60000);
  const f = d => `${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}T${dos(d.getHours())}${dos(d.getMinutes())}00`;
  const titulo = `${tipoEvento(ev.tipo)} · ${caso.asegurado || "Caso"}${caso.compania_aseguradora ? ` vs ${caso.compania_aseguradora}` : ""}`;
  const detalle = [
    ev.link && `Link: ${ev.link}`,
    caso.patente && `Patente: ${caso.patente}`,
    caso.nro_siniestro && `Siniestro: ${caso.nro_siniestro}`,
    ev.notas,
    "Cargado desde PAS Tracker",
  ].filter(Boolean).join("\n");
  const p = new URLSearchParams({ action: "TEMPLATE", text: titulo, dates: `${f(ini)}/${f(fin)}`, ctz: ZONA, details: detalle });
  if (ev.lugar || ev.link) p.set("location", ev.lugar || ev.link);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

const avisar = () => window.dispatchEvent(new Event(CAMBIO));
export const escucharCambios = fn => { window.addEventListener(CAMBIO, fn); return () => window.removeEventListener(CAMBIO, fn); };

export async function eventosDelCaso(casoId) {
  const { data, error } = await supabase.from("pas_eventos").select("*").eq("caso_id", casoId).order("inicio");
  if (error) { console.error("[agenda] eventos del caso:", error); return null; }
  return data || [];
}

// Próximos eventos (desde el comienzo de hoy) de todos los casos
export async function proximosEventos(dias = 30) {
  const desde = new Date(); desde.setHours(0, 0, 0, 0);
  const hasta = new Date(desde.getTime() + dias * 86400000);
  const { data, error } = await supabase.from("pas_eventos").select("*")
    .gte("inicio", desde.toISOString()).lt("inicio", hasta.toISOString()).order("inicio");
  if (error) { console.error("[agenda] próximos:", error); return null; }
  return data || [];
}

// Crea o actualiza un evento. Al crear, deja un movimiento en la bitácora del caso.
export async function guardarEvento(ev) {
  const fila = { caso_id: ev.caso_id, tipo: ev.tipo, inicio: new Date(ev.inicio).toISOString(), duracion_min: Number(ev.duracion_min) || 60, link: ev.link?.trim() || null, lugar: ev.lugar?.trim() || null, notas: ev.notas?.trim() || null };
  const consulta = ev.id
    ? supabase.from("pas_eventos").update(fila).eq("id", ev.id).select().single()
    : supabase.from("pas_eventos").insert([fila]).select().single();
  const { data, error } = await consulta;
  if (error) { console.error("[agenda] guardar:", error); return { error }; }
  if (!ev.id) {
    await supabase.from("acciones").insert({ caso_id: ev.caso_id, tipo: "nota", fecha: new Date().toISOString(), descripcion: `Se agendó ${tipoEvento(ev.tipo).toLowerCase()} para el ${new Date(fila.inicio).toLocaleDateString("es-AR")} a las ${horaDe(new Date(fila.inicio))}` });
  }
  avisar();
  return { data };
}

export async function borrarEvento(id) {
  const { error } = await supabase.from("pas_eventos").delete().eq("id", id);
  if (error) { console.error("[agenda] borrar:", error); return false; }
  avisar();
  return true;
}
