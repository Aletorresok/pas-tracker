// Consultas de la web (SQL 47): lo que deja en /reclamo alguien que todavía no es cliente.
// La página escribe solo con la función nueva_consulta (sin cuenta); la app (administrador) las lee y las atiende en Hoy.
import { supabase } from "../supabase.js";
import { fechaLocalISO } from "./formatters.js";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const LINK_APP = "https://pas-tracker20.vercel.app";

// Envía el formulario. Devuelve { id } o { error } con un texto para mostrar.
export async function enviarConsulta(c) {
  const { data, error } = await supabase.rpc("nueva_consulta", {
    p_nombre: c.nombre, p_telefono: c.telefono, p_patente: c.patente || null, p_fecha: c.fecha || null,
    p_compania: c.compania || null, p_lesiones: !!c.lesiones, p_relato: c.relato || null, p_ref: c.ref || null,
  });
  if (!error) { avisarPorMail(c); return { id: data }; }
  const m = error.message || "";
  if (m.includes("nombre_invalido")) return { error: "Escribí tu nombre." };
  if (m.includes("telefono_invalido")) return { error: "Revisá el número de WhatsApp: tiene que tener la característica (ej.: 11 2345-6789)." };
  if (m.includes("demasiadas_consultas")) return { error: "Ya recibimos tu consulta. Si querés sumar algo, escribinos por WhatsApp." };
  return { error: "No pudimos enviar la consulta. Probá de nuevo o escribinos por WhatsApp." };
}

// Aviso por mail con la plantilla de derivaciones de EmailJS (si no está configurada, no hace nada: la consulta ya quedó en Hoy)
function avisarPorMail(c) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) return;
  const detalle = [c.relato && `Qué pasó: ${c.relato}`, c.lesiones && "Hubo lesiones.", c.ref && `Llegó por: ${c.ref}`].filter(Boolean).join("\n");
  fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
    body: JSON.stringify({ service_id: SERVICE_ID, template_id: TEMPLATE_ID, user_id: PUBLIC_KEY, template_params: {
      pas_nombre: "Consulta desde la web (sin PAS)",
      asegurado: `${c.nombre} (CONSULTA WEB)`,
      telefono: c.telefono,
      fecha_siniestro: c.fecha || "N/D",
      compania: c.compania || "N/D",
      links_archivos: `${detalle || "Sin detalle."}\n\nAtendela en ATG Lex → Hoy → "Consultas de la web": ${LINK_APP}`,
    } }),
  }).catch(e => console.error("[consultas] no se pudo mandar el mail:", e));
}

// Medianas por compañía (solo las que tienen 3 casos o más). [] si todavía no se corrió el SQL 47.
export async function cargarPlazosPublicos() {
  const { data, error } = await supabase.rpc("plazos_publicos");
  return error || !Array.isArray(data) ? [] : data;
}

// ── App (administrador) ──────────────────────────────────────────────
// Nuevas y contactadas, lo más nuevo arriba. null si falta el SQL 47.
export async function cargarConsultasAbiertas() {
  const { data, error } = await supabase.from("consultas").select("*").in("estado", ["nueva", "contactada"]).order("created_at", { ascending: false });
  return error ? null : data || [];
}

export async function marcarConsulta(id, estado, extra = {}) {
  const { error } = await supabase.from("consultas").update({ estado, atendida_en: new Date().toISOString(), ...extra }).eq("id", id);
  return error ? error.message : null;
}

// Crea el caso directo (PAS "Sin Pas") con lo que dejó la persona y marca la consulta. Devuelve { caso, pasId } o { error }.
export async function pasarConsultaACaso(consulta, pasSinPas) {
  if (!pasSinPas) return { error: "No encontré el PAS \"Sin Pas\" (casos directos). Crealo en Clientes y probá de nuevo." };
  const id = globalThis.crypto?.randomUUID?.() || "10000000-1000-4000-8000-100000000000".replace(/[018]/g, ch => (ch ^ (Math.random() * 16) >> (ch / 4)).toString(16));
  const notas = [consulta.relato && `Consulta web: ${consulta.relato}`, consulta.lesiones && "Hubo lesiones.", consulta.ref && `Llegó por: ${consulta.ref}`].filter(Boolean).join(" ");
  const fila = {
    id, pas_id: parseInt(pasSinPas.id, 10), origen: "estudio", revisado_en: new Date().toISOString(),
    asegurado: consulta.nombre, telefono_asegurado: consulta.telefono, patente: consulta.patente || null,
    compania_aseguradora: consulta.compania_tercero || null, fecha_siniestro: consulta.fecha_siniestro || null,
    estado: "doc_pendiente", fecha_derivacion: fechaLocalISO(), nota: notas || null,
  };
  const { error } = await supabase.from("pas_casos").insert([fila]);
  if (error) return { error: "No se pudo crear el caso: " + error.message };
  await marcarConsulta(consulta.id, "caso", { caso_id: id });
  return { caso: fila, pasId: String(pasSinPas.id) };
}
