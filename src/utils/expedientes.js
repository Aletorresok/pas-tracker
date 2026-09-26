// Expedientes (casos que no son de seguros) y sus plazos/escritos. Tablas del SQL 25.
import { supabase } from "../supabase.js";

export const ESTADOS_EXPEDIENTE = [
  { k: "activo", l: "Activo", color: "var(--ok)" },
  { k: "paralizado", l: "Paralizado", color: "var(--warn)" },
  { k: "sentenciado", l: "Sentenciado", color: "var(--info)" },
  { k: "en_apelacion", l: "En apelación", color: "var(--info)" },
  { k: "finalizado", l: "Finalizado", color: "var(--muted)" },
  { k: "archivado", l: "Archivado", color: "var(--muted)" },
];
export const estadoExpediente = k => ESTADOS_EXPEDIENTE.find(e => e.k === k) || ESTADOS_EXPEDIENTE[0];
export const expedienteAbierto = e => !["finalizado", "archivado"].includes(e.estado);

export const FUEROS = ["Civil y Comercial", "Laboral", "Familia", "Penal", "Contencioso Administrativo", "Federal", "Otro"];
export const JURISDICCIONES = ["CABA", "PBA", "Federal"];
export const ROLES_CLIENTE = [{ k: "actora", l: "Actora" }, { k: "demandada", l: "Demandada" }, { k: "otro", l: "Otro" }];

// Campos que se editan en la ficha (el resto los maneja la base)
export const CAMPOS_EXPEDIENTE = [
  "caratula", "fuero", "jurisdiccion", "juzgado", "secretaria", "numero", "estado", "fecha_inicio",
  "cliente_nombre", "cliente_dni", "cliente_telefono", "cliente_email", "rol_cliente", "contraparte", "letrado_contrario",
  "honorarios_pactados", "honorarios_cobrados", "proxima_accion", "proxima_accion_vence", "mensaje_cliente",
  "visible_cliente", "codigo_cliente", "notas",
];

// "" se guarda como null; honorarios como número
export function aFilaExpediente(datos) {
  const fila = {};
  CAMPOS_EXPEDIENTE.forEach(k => {
    if (!(k in datos)) return;
    const v = datos[k];
    if (k === "visible_cliente") fila[k] = !!v;
    else if (v === "" || v === undefined) fila[k] = null;
    else if (k === "honorarios_cobrados") fila[k] = Number(v) || null;
    else fila[k] = v;
  });
  return fila;
}

// Código para que el cliente entre con DNI + código: 4 letras/números, guion, 2 números (sin letras confusas)
export function generarCodigoCliente() {
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const al = n => Array.from(crypto.getRandomValues(new Uint32Array(n)), x => L[x % L.length]).join("");
  return `${al(4)}-${String(crypto.getRandomValues(new Uint32Array(1))[0] % 100).padStart(2, "0")}`;
}

// ── Base ──────────────────────────────────────────────────────────────────────
export async function cargarExpedientes() {
  const { data, error } = await supabase.from("expedientes").select("*").order("created_at", { ascending: false });
  if (error) { console.error("[expedientes] cargar:", error.message); return null; }
  return data || [];
}

export async function crearExpediente(datos) {
  const { data, error } = await supabase.from("expedientes").insert(aFilaExpediente(datos)).select().single();
  if (error) { console.error("[expedientes] crear:", error.message); return { error }; }
  return { data };
}

export async function actualizarExpediente(id, cambios) {
  const { data, error } = await supabase.from("expedientes").update(aFilaExpediente(cambios)).eq("id", id).select().single();
  if (error) { console.error("[expedientes] guardar:", error.message); return { error }; }
  return { data };
}

export async function eliminarExpediente(id) {
  // Los plazos y los eventos se borran solos (on delete cascade); la bitácora no tiene clave foránea
  const { error: errAcc } = await supabase.from("acciones").delete().eq("caso_id", id);
  if (errAcc) console.error("[expedientes] borrar bitácora:", errAcc.message);
  const { error } = await supabase.from("expedientes").delete().eq("id", id);
  if (error) { console.error("[expedientes] borrar:", error.message); return false; }
  return true;
}

// Plazos y escritos de los expedientes (los de casos PAS se cargan aparte)
export async function cargarPlazosExpedientes() {
  const { data, error } = await supabase.from("plazos").select("*").not("expediente_id", "is", null);
  if (error) { console.error("[plazos] cargar:", error.message); return []; }
  return data || [];
}

const CAMPOS_PLAZO = ["caso_id", "expediente_id", "tipo", "titulo", "fecha_notificacion", "dias", "computo", "clase", "vence", "fecha_objetivo", "estado", "cumplido_en", "notas"];
const aFilaPlazo = p => Object.fromEntries(CAMPOS_PLAZO.filter(k => k in p).map(k => [k, p[k] === "" || p[k] === undefined ? null : k === "dias" ? Number(p[k]) || null : p[k]]));

export async function guardarPlazo(plazo) {
  const fila = aFilaPlazo(plazo);
  const consulta = plazo.id
    ? supabase.from("plazos").update(fila).eq("id", plazo.id)
    : supabase.from("plazos").insert(fila);
  const { data, error } = await consulta.select().single();
  if (error) { console.error("[plazos] guardar:", error.message); return { error }; }
  return { data };
}

export async function eliminarPlazo(id) {
  const { error } = await supabase.from("plazos").delete().eq("id", id);
  if (error) { console.error("[plazos] borrar:", error.message); return false; }
  return true;
}

// ── Cálculos ──────────────────────────────────────────────────────────────────
// Fecha que importa de un pendiente: el vencimiento del plazo o la fecha objetivo del escrito
export const fechaClave = p => (p.tipo === "escrito" ? p.fecha_objetivo : p.vence) || null;

// Pendientes ordenados por fecha (los sin fecha al final)
export function pendientesOrdenados(plazos) {
  return plazos.filter(p => p.estado === "pendiente")
    .sort((a, b) => (fechaClave(a) || "9999") < (fechaClave(b) || "9999") ? -1 : 1);
}

// Lo próximo que vence de cada expediente: Map id → plazo/escrito
export function proximoPorExpediente(plazos) {
  const m = new Map();
  pendientesOrdenados(plazos).forEach(p => { if (!m.has(p.expediente_id)) m.set(p.expediente_id, p); });
  return m;
}
