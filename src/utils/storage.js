import { supabase } from "../supabase.js";
import { fechaLocalISO } from "./formatters.js";

// ── GENERADOR DE UUID ──────────────────────────────────────────────────────────
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── GENERADOR DE CASO_ID ───────────────────────────────────────────────────────
let casoIdCounter = Date.now();
function generateCasoId() {
  return ++casoIdCounter;
}

// ── HISTORIAL (insert individual) ─────────────────────────────────────────────
export async function insertHistorialEntry(pasId, entry) {
  const row = {
    pas_id: parseInt(pasId, 10),
    fecha: entry.fecha || null,
    resultados: entry.resultados || [],
    nota: entry.nota || "",
    ts: entry.ts || Date.now(),
  };
  const { error } = await supabase.from("pas_historial").insert(row);
  if (error) console.error("[insertHistorialEntry] error:", error);
  return !error;
}

// ── SAVE STORAGE ──────────────────────────────────────────────────────────────
// Guarda casos, derivadores y descartados en Supabase

// Columnas de pas_casos que se copian tal cual (vacío → null)
const CAMPOS_CASO = [
  "asegurado", "dni_asegurado", "estado", "nota", "compania_aseguradora", "nro_siniestro", "fecha_siniestro",
  "ubicacion", "presupuesto", "tercero_nombre", "tercero_dni", "tercero_contacto", "vehiculo", "patente",
  "motor", "chasis", "vehiculo_tercero", "dominio_tercero", "relato", "comentarios", "fecha_derivacion",
  "fecha_contacto_asegurado", "fecha_inicio_reclamo", "fecha_ultimo_movimiento", "monto_ofrecimiento",
  "monto_cobro_asegurado", "monto_cobro_yo", "monto_comision_pas", "carpeta_path", "primer_ofrecimiento",
  "segundo_ofrecimiento", "fecha_carga", "fecha_reclamo", "fecha_ultimo_reclamo", "fecha_ofrecimiento",
  "fecha_reconsideracion", "fecha_aceptacion", "fecha_firma", "fecha_pago", "fecha_cobro", "fecha_mediacion",
  "fecha_inicio_juicio", "monto_acordado", "plazo_pago", "porcentaje_honorarios", "monto_honorarios",
  "fecha_factura", "fecha_cobro_honorarios",
];

export async function saveStorage(tabla, data) {
  try {
    let rows, onConflict = "pas_id";
    if (tabla === "pas_casos") {
      // data = { [pas_id]: [{...caso}] }
      onConflict = "id";
      rows = [];
      Object.entries(data).forEach(([pas_id, casosList]) => {
        const numPasId = parseInt(pas_id, 10);
        if (isNaN(numPasId)) { console.warn("[saveStorage] Skipping pas_id no numérico:", pas_id); return; }
        casosList.forEach(caso => {
          const isUUID = typeof caso.id === "string" && caso.id.includes("-");
          rows.push({
            ...Object.fromEntries(CAMPOS_CASO.map(k => [k, caso[k] || null])),
            id: isUUID ? caso.id : generateUUID(),
            caso_id: caso.caso_id || caso.id || generateCasoId(),
            pas_id: numPasId,
            estado_honorarios: caso.estado_honorarios || "NO_FACTURADO",
          });
        });
      });
    } else if (tabla === "pas_derivadores" || tabla === "pas_descartados") {
      // data = { [pas_id]: true/false }
      rows = Object.entries(data).map(([pas_id, activo]) => ({ pas_id: parseInt(pas_id, 10), activo: !!activo }));
    }
    if (!rows?.length) return;
    const { error } = await supabase.from(tabla).upsert(rows, { onConflict });
    if (error) console.error(`[saveStorage] ${tabla} error:`, error);
  } catch (err) {
    console.error("[saveStorage] error:", err);
  }
}

// ── LOAD STORAGE ──────────────────────────────────────────────────────────────
export async function loadStorage(tabla) {
  try {
    const { data, error } = await supabase.from(tabla).select("*");
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[loadStorage] error:", err);
    return null;
  }
}

// ── PAS MANUALES ──────────────────────────────────────────────────────────────
export async function upsertPasManual(pas) {
  const row = {
    id: pas.id,
    nombre: pas.nombre,
    mail: pas.mail || "",
    telefonos: Array.isArray(pas.telefonos) ? pas.telefonos.join(",") : (pas.telefonos || ""),
    contacto: pas.contacto || "",
    respuesta: pas.respuesta || "",
    seguimiento: pas.seguimiento || "",
  };

  const { error } = await supabase
    .from("pas_manuales")
    .upsert(row, { onConflict: "id" });

  if (error) console.error("[upsertPasManual] error:", error);
}

// Papelera (SQL 26): eliminar copia el caso con todo lo suyo a pas_papelera y lo borra, en una sola operación.
// Se recupera tal cual durante 30 días; después lo borra un cron.
const FALTA_SQL_26 = "Falta correr el SQL 26 (papelera) en Supabase.";
const errorPapelera = (error, texto) => (error?.code === "PGRST202" || error?.code === "42P01" ? FALTA_SQL_26 : `${texto}: ${error?.message || "error desconocido"}`);

export async function deleteCaso(id) {
  const { data, error } = await supabase.rpc("eliminar_caso", { p_caso_id: id });
  if (error) { console.error("[deleteCaso]", error); return { error: errorPapelera(error, "No se pudo eliminar el caso") }; }
  return { papeleraId: data };
}

export async function restaurarCaso(papeleraId) {
  const { data, error } = await supabase.rpc("restaurar_caso", { p_papelera_id: papeleraId });
  if (error) { console.error("[restaurarCaso]", error); return { error: errorPapelera(error, "No se pudo recuperar el caso") }; }
  return { caso: data };
}

export async function listarPapelera() {
  const { data, error } = await supabase.from("pas_papelera")
    .select("id, caso_id, pas_id, asegurado, patente, compania, eliminado_en")
    .order("eliminado_en", { ascending: false });
  if (error) { console.error("[listarPapelera]", error); return { error: errorPapelera(error, "No se pudo cargar la papelera") }; }
  return { lista: data || [] };
}

export async function deletePasManual(id) {
  const { error } = await supabase
    .from("pas_manuales")
    .delete()
    .eq("id", id);

  if (error) console.error("[deletePasManual] error:", error);
}
// Marca un caso del portal como revisado (sale de la bandeja "Nuevos del portal").
// Con `contactado`, además guarda hoy como fecha de primer contacto con el asegurado.
// Devuelve los campos guardados, o null si falló.
export async function marcarRevisado(id, { contactado = false } = {}) {
  const hoy = new Date();
  const cambios = { revisado_en: hoy.toISOString() };
  if (contactado) cambios.fecha_contacto_asegurado = fechaLocalISO(hoy);
  const { error } = await supabase.from("pas_casos").update(cambios).eq("id", id);
  if (error) { console.error("[marcarRevisado] error:", error); return null; }
  return cambios;
}

// Registra que reiteraste el reclamo hoy: deja el movimiento en la bitácora y reinicia la cuenta de "reclamo quieto".
// Devuelve los campos guardados del caso, o null si falló.
export async function registrarReiteracion(caso) {
  const hoy = fechaLocalISO();
  const cia = caso.compania_aseguradora ? ` a ${caso.compania_aseguradora}` : "";
  const { error: errAcc } = await supabase.from("acciones").insert({ caso_id: caso.id, tipo: "nota", fecha: new Date().toISOString(), descripcion: `Se reiteró el reclamo${cia}` });
  if (errAcc) { console.error("[registrarReiteracion] acción:", errAcc); return null; }
  const cambios = { fecha_ultimo_reclamo: hoy, fecha_ultimo_movimiento: hoy };
  const { error } = await supabase.from("pas_casos").update(cambios).eq("id", caso.id);
  if (error) { console.error("[registrarReiteracion] caso:", error); return null; }
  return cambios;
}

// Desde Hoy: da por hecha la próxima acción (queda en la bitácora) y carga la nueva con su plazo.
// Sin `nueva`, el caso queda sin próxima acción. Devuelve los campos guardados del caso, o null si falló.
export async function completarAccion(caso, { nueva = "", vence = null } = {}) {
  const hecha = caso.proxima_accion?.trim();
  if (hecha && !(await registrarAccion(caso.id, `Hecho: ${hecha}`))) return null;
  const texto = nueva.trim();
  const cambios = { proxima_accion: texto || null, proxima_accion_vence: texto ? vence : null, fecha_ultimo_movimiento: fechaLocalISO() };
  const { error } = await supabase.from("pas_casos").update(cambios).eq("id", caso.id);
  if (error) { console.error("[completarAccion]", error); return null; }
  return cambios;
}

// Corre el plazo de la próxima acción. Devuelve los campos guardados, o null si falló.
export async function posponerAccion(caso, vence) {
  const cambios = { proxima_accion_vence: vence };
  const { error } = await supabase.from("pas_casos").update(cambios).eq("id", caso.id);
  if (error) { console.error("[posponerAccion]", error); return null; }
  return cambios;
}

// Deja una nota en la bitácora del caso. Interna por defecto (SQL 43); con visiblePas la ve también el PAS en su portal
// (cambios de etapa y lo que se carga a mano). Devuelve true si se guardó.
export async function registrarAccion(casoId, descripcion, { visiblePas = false } = {}) {
  if (!casoId) return false;
  const { error } = await supabase.from("acciones").insert({ caso_id: casoId, tipo: "nota", fecha: new Date().toISOString(), descripcion, ...(visiblePas ? { visible_pas: true } : {}) });
  if (error) { console.error("[registrarAccion]", error); return false; }
  return true;
}
