import { createClient } from '@supabase/supabase-js';

// Cliente separado para Agenda Legal (proyecto distinto)
export const supabaseAgenda = createClient(
  'https://ecefqwbqunqzbpwgsnmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZWZxd2JxdW5xemJwd2dzbm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzY4OTMsImV4cCI6MjA4NzYxMjg5M30.Z02Jk-z_CyDceMz0LYl8eMVCj4KhXwW55UcxtEifbpo'
);

// ── MAPEO DE ESTADOS ──────────────────────────────────────────────────────────────
function mapEstadoPasToAgenda(estado) {
  return {
    doc_pendiente:    "Paralizado",
    iniciado:         "Activo",
    reclamado:        "Activo",
    con_ofrecimiento: "Activo",
    en_mediacion:     "Activo",
    en_juicio:        "Activo",
    esperando_pago:   "Sentenciado",
    cobrado:          "Finalizado",
  }[estado] || "Activo";
}

// ── BUILDER DE FILA AGENDA ────────────────────────────────────────────────────────
export function buildAgendaCaso(caso, pasNombre) {
  const notas = [
    caso.nota            ? `📝 ${caso.nota}`                  : "",
    pasNombre            ? `📋 PAS: ${pasNombre}`             : "",
    caso.compania        ? `🏢 Compañía: ${caso.compania}`    : "",
    caso.fecha_siniestro ? `📅 Siniestro: ${caso.fecha_siniestro}` : "",
  ].filter(Boolean).join("\n");

  return {
    id:                `pas_${caso.id}`,
    caratula:          `${caso.asegurado}${caso.compania ? ` c/ ${caso.compania}` : ""}${pasNombre ? ` [PAS: ${pasNombre}]` : ""}`,
    fuero:             "Civil y Comercial",
    juzgado:           null,
    secretaria:        null,
    expediente:        null,
    cliente:           caso.asegurado || null,
    cliente_tel:       null,
    contraparte:       caso.compania  || null,
    abogado_contrario: null,
    estado_expediente: mapEstadoPasToAgenda(caso.estado),
    fecha_inicio:      caso.fecha_derivacion || caso.fecha_carga || null,
    notas:             notas || null,
  };
}

// ── SYNC CASO → AGENDA LEGAL ──────────────────────────────────────────────────────
export async function syncCasoToAgenda(caso, pasNombre) {
  try {
    const row = buildAgendaCaso(caso, pasNombre);
    const { error } = await supabaseAgenda.from("casos").upsert(row, { onConflict: "id" });
    if (error) console.error("[sync→AgendaLegal] upsert error:", error);
  } catch (e) {
    console.error("[sync→AgendaLegal] exception:", e);
  }
}

// ── DELETE CASO DE AGENDA LEGAL ───────────────────────────────────────────────────
export async function deleteCasoFromAgenda(casoId) {
  try {
    await supabaseAgenda.from("casos").delete().eq("id", `pas_${casoId}`);
  } catch (e) {
    console.error("[sync→AgendaLegal] delete error:", e);
  }
}

// ── SYNC MASIVO: TODOS LOS CASOS ──────────────────────────────────────────────────
export async function syncMasivoCasos(casos) {
  if (!casos || Object.keys(casos).length === 0) {
    console.log("[sync→Masivo] Sin casos para sincronizar");
    return { success: 0, errors: 0 };
  }

  let success = 0;
  let errors = 0;

  for (const [pasId, casosList] of Object.entries(casos)) {
    if (!Array.isArray(casosList)) continue;
    for (const caso of casosList) {
      try {
        await syncCasoToAgenda(caso, null);
        success++;
      } catch (e) {
        console.error(`[sync→Masivo] Error sincronizando caso ${caso.id}:`, e);
        errors++;
      }
    }
  }

  return { success, errors };
}