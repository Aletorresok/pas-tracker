// Rutina (tablas rutina_items, rutina_registro y dias_escuela del SQL 25).
// Diaria = de lunes a viernes. Semanal = un día de la semana (o "cualquier día"). Mensual = un día del mes (0 = último).
// El tildado se guarda con la fecha del día, del lunes de la semana o del primero del mes, según la frecuencia.
import { supabase } from "../supabase.js";
import { sumarDiasISO as sumarDias } from "./plazos.js";

export const FRECUENCIAS = [
  { k: "diaria", l: "Diaria (lunes a viernes)" },
  { k: "semanal", l: "Semanal" },
  { k: "mensual", l: "Mensual" },
];
export const PRIORIDADES = [
  { k: "imprescindible", l: "Imprescindible", color: "var(--bad)" },
  { k: "importante", l: "Importante", color: "var(--warn)" },
  { k: "postergable", l: "Postergable", color: "var(--muted)" },
];
export const prioridad = k => PRIORIDADES.find(p => p.k === k) || PRIORIDADES[1];
export const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Accesos directos: una pestaña de la app ("app:casos") o un link
export const PESTANAS = [
  { k: "app:dashboard", l: "Hoy" }, { k: "app:casos", l: "Casos PAS" }, { k: "app:expedientes", l: "Expedientes" },
  { k: "app:prospeccion", l: "Contactos" }, { k: "app:clientes", l: "Clientes" }, { k: "app:analisis", l: "Análisis" },
  { k: "app:herramientas", l: "Herramientas" },
];

// ── Fechas ─────────────────────────────────────────────────────────────────
const aFecha = iso => new Date(`${iso}T12:00:00`);
export const diaSemana = iso => ((aFecha(iso).getDay() + 6) % 7) + 1; // 1 = lunes … 7 = domingo
export const lunesDe = iso => sumarDias(iso, 1 - diaSemana(iso));
export const primeroDelMes = iso => `${iso.slice(0, 7)}-01`;
const ultimoDiaDelMes = iso => { const d = aFecha(iso); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); };
export const minutos = hhmm => { if (!hhmm) return null; const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + (m || 0); };
export const hhmm = min => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

// Fecha con la que se guarda el tildado
export const claveRegistro = (item, iso) => (item.frecuencia === "semanal" ? lunesDe(iso) : item.frecuencia === "mensual" ? primeroDelMes(iso) : iso);

// Qué toca un día
export function itemsDelDia(items, iso) {
  const ds = diaSemana(iso);
  const dm = Number(iso.slice(8, 10));
  const ultimo = ultimoDiaDelMes(iso);
  return items.filter(i => i.activo && (
    (i.frecuencia === "diaria" && ds <= 5) ||
    (i.frecuencia === "semanal" && Number(i.dia) === ds) ||
    (i.frecuencia === "mensual" && (Number(i.dia) === dm || (Number(i.dia) === 0 && dm === ultimo) || (Number(i.dia) > ultimo && dm === ultimo)))
  ));
}

export function escuelaDelDia(dias, iso) {
  const ds = diaSemana(iso);
  return dias.find(d => d.desde <= iso && iso <= d.hasta && (ds <= 5 || d.incluye_fds)) || null;
}

// La escuela ocupa un horario: lo que choca se corre para después, en orden de prioridad.
// Lo postergable (o lo importante que ya no entra antes de las 22) queda "para otro día".
const FIN_DIA = 22 * 60;
const MINIMO = 15;
const DURACION_POR_DEFECTO = 30;
const ORDEN_PRIORIDAD = { imprescindible: 0, importante: 1, postergable: 2 };

export function reacomodar(items, escuela) {
  const conHora = items.filter(i => i.hora_inicio).map(i => {
    const ini = minutos(i.hora_inicio);
    const fin = minutos(i.hora_fin) ?? ini + DURACION_POR_DEFECTO;
    return { ...i, ini, fin: Math.max(fin, ini + 5) };
  });
  const sinHora = items.filter(i => !i.hora_inicio);
  if (!escuela) return { agenda: conHora.sort((a, b) => a.ini - b.ini || a.orden - b.orden), postergados: [], sinHora };

  const E = minutos(escuela.hora_entrada), S = minutos(escuela.hora_salida);
  // Los ítems del mismo bloque y horario se mueven juntos
  const unidades = [];
  for (const i of conHora) {
    const u = unidades.find(x => x.bloque === i.bloque && x.ini === i.ini && x.fin === i.fin);
    if (u) u.items.push(i); else unidades.push({ bloque: i.bloque, ini: i.ini, fin: i.fin, items: [i] });
  }
  // Si la escuela tapa solo una parte del bloque, se acorta (si quedan al menos 15 minutos); si lo tapa todo, se corre
  const fijas = [], aMover = [];
  for (const u of unidades) {
    if (!(u.ini < S && u.fin > E)) fijas.push(u);
    else if (u.ini < E && E - u.ini >= MINIMO) fijas.push({ ...u, fin: E, acortado: true });
    else if (u.fin > S && u.fin - S >= MINIMO) fijas.push({ ...u, ini: S, acortado: true });
    else aMover.push(u);
  }
  // Primer hueco desde la salida que no pise lo que ya está en la agenda
  const ocupado = fijas.map(u => [u.ini, u.fin]);
  const hueco = (desde, dur) => {
    let ini = desde, pisa;
    while ((pisa = ocupado.find(([a, b]) => ini < b && ini + dur > a))) ini = pisa[1];
    return ini;
  };
  const prioridadDe = u => Math.min(...u.items.map(i => ORDEN_PRIORIDAD[i.prioridad] ?? 1));
  const movidas = [];
  const postergados = [];
  aMover.sort((a, b) => prioridadDe(a) - prioridadDe(b) || a.ini - b.ini).forEach(u => {
    const dur = u.fin - u.ini;
    const ini = hueco(S, dur);
    const p = prioridadDe(u);
    if (p === ORDEN_PRIORIDAD.postergable || (p === ORDEN_PRIORIDAD.importante && ini + dur > FIN_DIA)) { postergados.push(...u.items); return; }
    movidas.push({ ...u, antes: hhmm(u.ini), ini, fin: ini + dur });
    ocupado.push([ini, ini + dur]);
  });
  const agenda = [...fijas, ...movidas].flatMap(u => u.items.map(i => ({ ...i, ini: u.ini, fin: u.fin, antes: u.antes, acortado: u.acortado })));
  return { agenda: agenda.sort((a, b) => a.ini - b.ini || a.orden - b.orden), postergados, sinHora, escuela: { E, S } };
}

// Bloques (para mostrar agrupado): mismo nombre de bloque y mismo horario
export function agruparEnBloques(agenda) {
  const bloques = [];
  for (const i of agenda) {
    const ult = bloques[bloques.length - 1];
    if (ult && ult.bloque === i.bloque && ult.ini === i.ini) ult.items.push(i);
    else bloques.push({ bloque: i.bloque, ini: i.ini, fin: i.fin, items: [i], movido: Boolean(i.antes), acortado: Boolean(i.acortado) });
  }
  return bloques;
}

// ── Datos ──────────────────────────────────────────────────────────────────
const ok = (error, contexto) => { if (error) console.error(`[rutina] ${contexto}:`, error.message); return !error; };

export async function cargarRutina() {
  const [items, escuela] = await Promise.all([
    supabase.from("rutina_items").select("*").order("orden").order("hora_inicio", { nullsFirst: false }),
    supabase.from("dias_escuela").select("*").order("desde"),
  ]);
  if (items.error) return { error: items.error.message };
  return { items: items.data || [], escuela: escuela.data || [] };
}

export async function cargarRegistro(desde, hasta) {
  const { data, error } = await supabase.from("rutina_registro").select("item_id, fecha").gte("fecha", desde).lte("fecha", hasta);
  ok(error, "registro");
  return new Set((data || []).map(r => `${r.item_id}|${r.fecha}`));
}

export async function tildar(item, iso, hecho) {
  const fecha = claveRegistro(item, iso);
  const { error } = hecho
    ? await supabase.from("rutina_registro").upsert({ item_id: item.id, fecha, hecho_en: new Date().toISOString() })
    : await supabase.from("rutina_registro").delete().eq("item_id", item.id).eq("fecha", fecha);
  return ok(error, "tildar");
}

const CAMPOS_ITEM = ["frecuencia", "bloque", "hora_inicio", "hora_fin", "dia", "titulo", "prioridad", "acceso", "orden", "activo"];
const aFilaItem = i => Object.fromEntries(CAMPOS_ITEM.filter(k => k in i).map(k => [k, i[k] === "" || i[k] === undefined ? null : i[k]]));

export async function guardarItem(item) {
  const fila = aFilaItem(item);
  const { error } = item.id
    ? await supabase.from("rutina_items").update(fila).eq("id", item.id)
    : await supabase.from("rutina_items").insert(fila);
  return ok(error, "guardar ítem");
}
export async function borrarItem(id) {
  const { error } = await supabase.from("rutina_items").delete().eq("id", id);
  return ok(error, "borrar ítem");
}
export async function guardarEscuela(d) {
  const fila = { desde: d.desde, hasta: d.hasta, hora_entrada: d.hora_entrada, hora_salida: d.hora_salida, incluye_fds: Boolean(d.incluye_fds) };
  const { error } = d.id ? await supabase.from("dias_escuela").update(fila).eq("id", d.id) : await supabase.from("dias_escuela").insert(fila);
  return ok(error, "guardar escuela");
}
export async function borrarEscuela(id) {
  const { error } = await supabase.from("dias_escuela").delete().eq("id", id);
  return ok(error, "borrar escuela");
}

// Punto de partida para editar (se carga solo si el usuario lo pide)
export const RUTINA_EJEMPLO = [
  { frecuencia: "diaria", bloque: "Arranque", hora_inicio: "08:30", hora_fin: "09:00", titulo: "Revisar mails y WhatsApp", prioridad: "imprescindible", acceso: "https://mail.google.com", orden: 1 },
  { frecuencia: "diaria", bloque: "Arranque", hora_inicio: "08:30", hora_fin: "09:00", titulo: "Mirar la agenda y los plazos de hoy", prioridad: "imprescindible", acceso: "app:dashboard", orden: 2 },
  { frecuencia: "diaria", bloque: "Siniestros con compañías", hora_inicio: "09:00", hora_fin: "11:00", titulo: "Reiterar los reclamos quietos", prioridad: "imprescindible", acceso: "app:casos", orden: 3 },
  { frecuencia: "diaria", bloque: "Siniestros con compañías", hora_inicio: "09:00", hora_fin: "11:00", titulo: "Responder ofrecimientos", prioridad: "imprescindible", acceso: "app:casos", orden: 4 },
  { frecuencia: "diaria", bloque: "Expedientes", hora_inicio: "11:00", hora_fin: "12:30", titulo: "Revisar novedades de los expedientes", prioridad: "importante", acceso: "app:expedientes", orden: 5 },
  { frecuencia: "diaria", bloque: "Expedientes", hora_inicio: "11:00", hora_fin: "12:30", titulo: "Avanzar escritos pendientes", prioridad: "importante", acceso: "app:expedientes", orden: 6 },
  { frecuencia: "diaria", bloque: "Prospección", hora_inicio: "15:00", hora_fin: "16:00", titulo: "15 WhatsApp a PAS", prioridad: "importante", acceso: "app:prospeccion", orden: 7 },
  { frecuencia: "diaria", bloque: "Prospección", hora_inicio: "15:00", hora_fin: "16:00", titulo: "30 mails de presentación", prioridad: "importante", acceso: "app:prospeccion", orden: 8 },
  { frecuencia: "diaria", bloque: "Cierre", hora_inicio: "18:00", hora_fin: "18:30", titulo: "Actualizar próximas acciones de los casos", prioridad: "postergable", acceso: "app:casos", orden: 9 },
  { frecuencia: "diaria", bloque: "Cierre", hora_inicio: "18:00", hora_fin: "18:30", titulo: "Avisar novedades a clientes", prioridad: "postergable", acceso: "app:casos", orden: 10 },
  { frecuencia: "semanal", dia: 1, bloque: "Revisión semanal", hora_inicio: "09:00", hora_fin: "09:30", titulo: "Casos sin movimiento y próximos vencimientos", prioridad: "importante", acceso: "app:casos", orden: 11 },
  { frecuencia: "semanal", dia: 5, bloque: "Revisión semanal", hora_inicio: "17:00", hora_fin: "17:30", titulo: "Novedades a los PAS que derivan", prioridad: "postergable", acceso: "app:clientes", orden: 12 },
  { frecuencia: "mensual", dia: 1, bloque: "Mes", titulo: "Resumen del mes a cada PAS", prioridad: "importante", acceso: "app:clientes", orden: 13 },
  { frecuencia: "mensual", dia: 0, bloque: "Mes", titulo: "Facturar los honorarios cobrados", prioridad: "imprescindible", orden: 14 },
];

export async function cargarEjemplo() {
  const { error } = await supabase.from("rutina_items").insert(RUTINA_EJEMPLO.map(i => ({ ...i, activo: true })));
  return ok(error, "ejemplo");
}
