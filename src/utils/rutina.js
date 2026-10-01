// Rutina (etapa 6 de ATG Lex): bloques del día, la semana y el mes, lo tildado y los días de escuela.
// Tablas del SQL 25: rutina_items, rutina_registro, dias_escuela (solo administrador).
import { supabase } from "../supabase.js";
import { fechaLocalISO, sumarDias, partesAR } from "./formatters.js";

export const FRECUENCIAS = [
  { k: "diaria", l: "Día" },
  { k: "semanal", l: "Semana" },
  { k: "mensual", l: "Mes" },
];

export const PRIORIDADES = [
  { k: "imprescindible", l: "Imprescindible", color: "var(--bad)" },
  { k: "importante", l: "Importante", color: "var(--warn)" },
  { k: "postergable", l: "Postergable", color: "var(--muted)" },
];
export const prioridad = k => PRIORIDADES.find(p => p.k === k) || PRIORIDADES[1];

export const DIAS_SEMANA = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Accesos directos: externos (link) o a una pestaña de la app
export const ACCESOS = [
  { k: "hoy", l: "Hoy", tab: "dashboard" },
  { k: "casos", l: "Casos PAS", tab: "casos" },
  { k: "expedientes", l: "Expedientes", tab: "expedientes" },
  { k: "contactos", l: "Contactos", tab: "prospeccion" },
  { k: "clientes", l: "Clientes", tab: "clientes" },
  { k: "analisis", l: "Análisis", tab: "analisis" },
  { k: "gmail", l: "Gmail", url: "https://mail.google.com" },
  { k: "pjn", l: "PJN", url: "https://scw.pjn.gov.ar/scw/home.seam" },
  { k: "mev", l: "MEV", url: "https://mev.scba.gov.ar" },
];
export const acceso = k => ACCESOS.find(a => a.k === k) || null;

// ── Fechas ────────────────────────────────────────────────────────────────────
const aFecha = iso => new Date(`${iso}T12:00:00`);
// 1 = lunes … 7 = domingo
export const diaSemana = iso => aFecha(iso).getDay() || 7;
export const lunesDe = iso => sumarDias(iso, 1 - diaSemana(iso));
export const primeroDeMes = iso => `${iso.slice(0, 7)}-01`;
export const ultimoDiaDelMes = iso => { const d = aFecha(primeroDeMes(iso)); d.setMonth(d.getMonth() + 1, 0); return d.getDate(); };

// Fecha con la que se registra lo tildado: el día, el lunes de la semana o el 1 del mes
export const clavePeriodo = (frecuencia, hoy = fechaLocalISO()) =>
  frecuencia === "semanal" ? lunesDe(hoy) : frecuencia === "mensual" ? primeroDeMes(hoy) : hoy;

// ¿Toca hoy? Los semanales y mensuales se ven desde su día hasta que termina el período (si no lo hiciste, sigue ahí).
export function tocaHoy(item, hoy = fechaLocalISO()) {
  if (!item.activo) return false;
  if (item.frecuencia === "semanal") return !item.dia || diaSemana(hoy) >= item.dia;
  if (item.frecuencia === "mensual") {
    if (item.dia === null || item.dia === undefined) return true;
    const d = Number(hoy.slice(8, 10));
    return d >= (item.dia === 0 ? ultimoDiaDelMes(hoy) : item.dia);
  }
  return true;
}

export const hhmm = t => (t ? String(t).slice(0, 5) : "");
const minutos = t => { if (!t) return null; const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };
export const minutosAhora = (d = new Date()) => partesAR(d).minutos; // hora de Argentina

// ── Días de escuela ─────────────────────────────────────────────────────────
export function escuelaDelDia(dias, hoy = fechaLocalISO()) {
  const finde = diaSemana(hoy) >= 6;
  return (dias || []).find(d => d.desde <= hoy && hoy <= d.hasta && (!finde || d.incluye_fds)) || null;
}

// Bloques del día en orden de horario. Con escuela, lo que choca se reacomoda según la prioridad:
// imprescindible se queda (con aviso), importante pasa a la salida, postergable queda para otro día.
export function bloquesDelDia(items, escuela) {
  const entrada = escuela ? minutos(escuela.hora_entrada) : null;
  const salida = escuela ? minutos(escuela.hora_salida) : null;
  const choca = it => {
    if (!escuela) return false;
    const ini = minutos(it.hora_inicio), fin = minutos(it.hora_fin) ?? (ini !== null ? ini + 30 : null);
    return ini !== null && ini < salida && fin > entrada;
  };
  const grupos = new Map();
  const postergados = [];
  items.forEach(it => {
    let ini = it.hora_inicio, fin = it.hora_fin, aviso = null;
    if (choca(it)) {
      if (it.prioridad === "postergable") { postergados.push(it); return; }
      if (it.prioridad === "importante") {
        const dur = (minutos(it.hora_fin) ?? minutos(it.hora_inicio) + 30) - minutos(it.hora_inicio);
        const nuevoIni = salida;
        const aHora = m => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        ini = aHora(nuevoIni); fin = aHora(nuevoIni + Math.max(dur, 15));
        aviso = `Pasa a la salida de la escuela (${hhmm(escuela.hora_salida)})`;
      } else {
        aviso = "Choca con la escuela: hacelo antes o después";
      }
    }
    const clave = `${it.bloque}|${ini || ""}`;
    if (!grupos.has(clave)) grupos.set(clave, { bloque: it.bloque, hora_inicio: ini, hora_fin: fin, items: [], aviso: null });
    const g = grupos.get(clave);
    if (fin && (!g.hora_fin || minutos(fin) > minutos(g.hora_fin))) g.hora_fin = fin;
    if (aviso) g.aviso = aviso;
    g.items.push(it);
  });
  const bloques = [...grupos.values()].sort((a, b) => (minutos(a.hora_inicio) ?? 9999) - (minutos(b.hora_inicio) ?? 9999));
  bloques.forEach(b => b.items.sort((a, c) => (a.orden || 0) - (c.orden || 0)));
  return { bloques, postergados };
}

// Bloque en curso (o el próximo, si ahora no hay ninguno). null si ya pasaron todos.
export function ahoraToca(bloques, ahora = minutosAhora()) {
  const conHora = bloques.filter(b => b.hora_inicio);
  const actual = conHora.find(b => minutos(b.hora_inicio) <= ahora && ahora < (minutos(b.hora_fin) ?? minutos(b.hora_inicio) + 30));
  if (actual) return { bloque: actual, enCurso: true };
  const proximo = conHora.find(b => minutos(b.hora_inicio) > ahora);
  return proximo ? { bloque: proximo, enCurso: false } : null;
}

// ── Base ──────────────────────────────────────────────────────────────────────
// null = falta la tabla (SQL 25) o no hay conexión
export async function cargarRutina() {
  const hoy = fechaLocalISO();
  const desde = sumarDias(primeroDeMes(hoy), -400); // alcanza para la rutina cumplida del año
  const [items, registro, escuela] = await Promise.all([
    supabase.from("rutina_items").select("*").order("orden"),
    supabase.from("rutina_registro").select("*").gte("fecha", desde),
    supabase.from("dias_escuela").select("*").order("desde"),
  ]);
  if (items.error || registro.error || escuela.error) {
    console.error("[rutina] cargar:", items.error || registro.error || escuela.error);
    return null;
  }
  return { items: items.data || [], registro: registro.data || [], escuela: escuela.data || [] };
}

const CAMPOS_ITEM = ["frecuencia", "bloque", "hora_inicio", "hora_fin", "dia", "titulo", "prioridad", "acceso", "orden", "activo"];
const aFilaItem = it => Object.fromEntries(CAMPOS_ITEM.filter(k => k in it).map(k => [k, it[k] === "" || it[k] === undefined ? null : it[k]]));

export async function guardarItem(item) {
  const fila = aFilaItem(item);
  const q = item.id ? supabase.from("rutina_items").update(fila).eq("id", item.id) : supabase.from("rutina_items").insert(fila);
  const { data, error } = await q.select().single();
  if (error) { console.error("[rutina] guardar ítem:", error.message); return null; }
  return data;
}

export async function borrarItem(id) {
  const { error } = await supabase.from("rutina_items").delete().eq("id", id);
  if (error) { console.error("[rutina] borrar ítem:", error.message); return false; }
  return true;
}

export async function cargarSugerida() {
  const { data, error } = await supabase.from("rutina_items").insert(RUTINA_SUGERIDA.map((it, i) => ({ ...it, orden: i }))).select();
  if (error) { console.error("[rutina] cargar sugerida:", error.message); return null; }
  return data || [];
}

export async function tildar(item, hecho, hoy = fechaLocalISO()) {
  const fecha = clavePeriodo(item.frecuencia, hoy);
  const { error } = hecho
    ? await supabase.from("rutina_registro").upsert({ item_id: item.id, fecha })
    : await supabase.from("rutina_registro").delete().eq("item_id", item.id).eq("fecha", fecha);
  if (error) { console.error("[rutina] tildar:", error.message); return null; }
  return { item_id: item.id, fecha };
}

export async function guardarEscuela(d) {
  const fila = { desde: d.desde, hasta: d.hasta, hora_entrada: d.hora_entrada, hora_salida: d.hora_salida, incluye_fds: !!d.incluye_fds };
  const { data, error } = await supabase.from("dias_escuela").insert(fila).select().single();
  if (error) { console.error("[rutina] días de escuela:", error.message); return null; }
  return data;
}

export async function borrarEscuela(id) {
  const { error } = await supabase.from("dias_escuela").delete().eq("id", id);
  if (error) { console.error("[rutina] borrar días de escuela:", error.message); return false; }
  return true;
}

// ── Rutina cumplida: % de lo diario tildado en días hábiles (lunes a viernes) entre dos fechas ──
export function rutinaCumplida(items, registro, desde, hasta) {
  const diarios = items.filter(it => it.frecuencia === "diaria" && it.activo);
  if (!diarios.length) return null;
  const ids = new Set(diarios.map(it => it.id));
  let dias = 0;
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) if (diaSemana(d) <= 5) dias++;
  if (!dias) return null;
  const hechos = registro.filter(r => ids.has(r.item_id) && r.fecha >= desde && r.fecha <= hasta && diaSemana(r.fecha) <= 5).length;
  return Math.min(100, Math.round((hechos / (diarios.length * dias)) * 100));
}

// Rutina de arranque: se carga con un botón y se edita a gusto
export const RUTINA_SUGERIDA = [
  { frecuencia: "diaria", bloque: "Arranque", hora_inicio: "08:30", hora_fin: "09:00", titulo: "Revisar Hoy: plazos, vencimientos y lo nuevo del portal", prioridad: "imprescindible", acceso: "hoy" },
  { frecuencia: "diaria", bloque: "Arranque", hora_inicio: "08:30", hora_fin: "09:00", titulo: "Notificaciones en PJN y MEV", prioridad: "imprescindible", acceso: "pjn" },
  { frecuencia: "diaria", bloque: "Arranque", hora_inicio: "08:30", hora_fin: "09:00", titulo: "Mails del estudio", prioridad: "importante", acceso: "gmail" },
  { frecuencia: "diaria", bloque: "Siniestros con compañías", hora_inicio: "09:00", hora_fin: "11:00", titulo: "Reiterar reclamos quietos", prioridad: "importante", acceso: "casos" },
  { frecuencia: "diaria", bloque: "Siniestros con compañías", hora_inicio: "09:00", hora_fin: "11:00", titulo: "Pedir respuesta a los iniciados (día 7 a 14)", prioridad: "importante", acceso: "hoy" },
  { frecuencia: "diaria", bloque: "Siniestros con compañías", hora_inicio: "09:00", hora_fin: "11:00", titulo: "Seguir la documentación pendiente", prioridad: "importante", acceso: "casos" },
  { frecuencia: "diaria", bloque: "Prospección", hora_inicio: "11:00", hora_fin: "12:00", titulo: "15 WhatsApp a PAS", prioridad: "importante", acceso: "contactos" },
  { frecuencia: "diaria", bloque: "Prospección", hora_inicio: "11:00", hora_fin: "12:00", titulo: "30 mails de presentación", prioridad: "postergable", acceso: "contactos" },
  { frecuencia: "diaria", bloque: "Escritos", hora_inicio: "14:00", hora_fin: "16:00", titulo: "Avanzar escritos pendientes", prioridad: "importante", acceso: "expedientes" },
  { frecuencia: "diaria", bloque: "Cierre", hora_inicio: "18:00", hora_fin: "18:30", titulo: "Actualizar el mensaje a los clientes con novedades", prioridad: "postergable", acceso: "casos" },
  { frecuencia: "diaria", bloque: "Cierre", hora_inicio: "18:00", hora_fin: "18:30", titulo: "Dejar cargadas las próximas acciones de mañana", prioridad: "postergable", acceso: "hoy" },
  { frecuencia: "semanal", dia: 1, bloque: "Revisión semanal", titulo: "Repasar los casos que te tocan a vos", prioridad: "importante", acceso: "casos" },
  { frecuencia: "semanal", dia: 5, bloque: "Revisión semanal", titulo: "Llamar a los PAS dormidos", prioridad: "importante", acceso: "clientes" },
  { frecuencia: "mensual", dia: 1, bloque: "Cierre del mes", titulo: "Facturar honorarios pendientes", prioridad: "importante", acceso: "analisis" },
  { frecuencia: "mensual", dia: 1, bloque: "Cierre del mes", titulo: "Pagar comisiones a PAS", prioridad: "importante", acceso: "hoy" },
  { frecuencia: "mensual", dia: 0, bloque: "Cierre del mes", titulo: "Revisar los objetivos del mes", prioridad: "importante", acceso: null },
];
