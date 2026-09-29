// Calendario suscribible (SQL 34 + función "calendario"): un link secreto que Google Calendar (o el calendario
// del celular) lee solo. La lista de qué incluir y el token viven en calendario_tokens.
import { supabase } from "../supabase.js";

export const INCLUIR = [
  { k: "eventos", l: "Mediaciones, audiencias y reuniones", desc: "Con hora y link de la videollamada" },
  { k: "plazos", l: "Plazos", desc: "Todo el día, el día que vencen; los fatales con aviso la tarde anterior" },
  { k: "escritos", l: "Escritos pendientes", desc: "El día de la fecha objetivo" },
  { k: "acciones", l: "Próximas acciones de los casos", desc: "Puede ser mucho: una por caso activo con plazo" },
];
export const INCLUIR_BASE = { eventos: true, plazos: true, escritos: false, acciones: false };

// { token, incluir, ultimo_uso } | null (no hay) | undefined (falta el SQL 34)
export async function cargarCalendario() {
  const { data, error } = await supabase.from("calendario_tokens").select("token, incluir, ultimo_uso, creado").eq("activo", true)
    .order("creado", { ascending: false }).limit(1).maybeSingle();
  if (error) { console.warn("[calendario]", error.message); return undefined; }
  return data || null;
}

// Crea un link nuevo (el anterior deja de andar). Devuelve el token o { error }
export async function nuevoLink(incluir) {
  const { data, error } = await supabase.rpc("nuevo_token_calendario", { p_incluir: incluir });
  if (error) { console.error("[calendario] nuevo:", error.message); return { error: error.message }; }
  return { token: data };
}

export async function guardarIncluir(token, incluir) {
  const { error } = await supabase.from("calendario_tokens").update({ incluir }).eq("token", token);
  return error ? error.message : null;
}

export const urlCalendario = token => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendario?t=${token}`;
// Abre Google Calendar con "¿Agregar este calendario?" (funciona en la compu; en el celular se agrega desde la compu)
export const linkGoogle = token => `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(urlCalendario(token).replace(/^https?:/, "webcal:"))}`;

// Prueba el link desde la app: cuántos eventos trae o por qué falla
export async function probarLink(token) {
  try {
    const r = await fetch(urlCalendario(token));
    const texto = await r.text();
    if (r.ok && texto.startsWith("BEGIN:VCALENDAR")) return { ok: true, eventos: (texto.match(/BEGIN:VEVENT/g) || []).length };
    if (r.status === 401) return { ok: false, motivo: "La función pide inicio de sesión: desplegala sin verificación de JWT (ver los pasos)." };
    if (r.status === 404 && /not.?found|NOT_FOUND/i.test(texto) && !/No encontrado/.test(texto)) return { ok: false, motivo: "Todavía no está desplegada la función \"calendario\" en Supabase." };
    if (r.status === 404) return { ok: false, motivo: "El link no es válido (¿lo regeneraste?)." };
    return { ok: false, motivo: `La función respondió ${r.status}.` };
  } catch {
    return { ok: false, motivo: "No se pudo conectar con la función \"calendario\" (¿está desplegada?)." };
  }
}
