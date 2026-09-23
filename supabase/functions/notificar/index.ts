// Función "notificar" (Supabase Edge Function): manda notificaciones push a los dispositivos del estudio.
// La llaman:
//   · Webhook de base de datos en pas_casos (INSERT)            → "Nuevo caso del portal"
//   · Webhook de base de datos en pas_subidas_cliente (UPDATE)  → "El cliente mandó documentación"
//   · Cron diario ({"tipo":"agenda"})                            → mediaciones/audiencias de mañana
//   · La app ({"tipo":"prueba"}, solo el administrador)          → notificación de prueba
// Secretos necesarios: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…).
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase solo.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const ZONA = "America/Argentina/Buenos_Aires";
const TIPOS_EVENTO: Record<string, string> = { mediacion: "Mediación", audiencia: "Audiencia", vencimiento: "Vencimiento", reunion: "Reunión", otro: "Evento" };

type Aviso = { titulo: string; cuerpo: string; url?: string; etiqueta?: string };

// Registra la clave; si ya existía, ese aviso ya se mandó
async function unaVez(clave: string) {
  const { error } = await sb.from("pas_avisos").insert({ clave });
  return !error;
}

async function enviar(aviso: Aviso) {
  const { data: subs } = await sb.from("pas_push_suscripciones").select("endpoint, p256dh, auth");
  let enviados = 0;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(aviso), { TTL: 86400 });
      enviados++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from("pas_push_suscripciones").delete().eq("endpoint", s.endpoint); // el dispositivo ya no existe
      else console.error("[push]", code, e);
    }
  }
  return enviados;
}

async function nombrePas(pasId: unknown) {
  if (pasId == null) return "";
  const { data: l } = await sb.from("pas_lista").select("nombre").eq("pas_id", pasId).maybeSingle();
  if (l?.nombre) return l.nombre;
  const { data: m } = await sb.from("pas_manuales").select("nombre").eq("id", String(pasId)).maybeSingle();
  if (m?.nombre) return m.nombre;
  const { data: c } = await sb.from("pas_contactos").select("nombre").eq("id", String(pasId)).maybeSingle();
  return c?.nombre || "";
}

const reciente = (iso: string | null | undefined, horas: number) => !!iso && Date.now() - new Date(iso).getTime() < horas * 3600e3;

// Caso nuevo que derivó un PAS desde el portal
async function casoNuevo(id: string) {
  const { data: c } = await sb.from("pas_casos").select("id, asegurado, compania_aseguradora, pas_id, origen, created_at").eq("id", id).maybeSingle();
  if (!c || c.origen !== "portal" || !reciente(c.created_at, 24)) return 0;
  if (!(await unaVez(`caso:${c.id}`))) return 0;
  const pas = await nombrePas(c.pas_id);
  return enviar({
    titulo: "Nuevo caso del portal",
    cuerpo: [c.asegurado || "Sin nombre", pas && `derivado por ${pas}`, c.compania_aseguradora].filter(Boolean).join(" · "),
    url: "/", etiqueta: `caso-${c.id}`,
  });
}

// Documentación que subió el cliente: un aviso por caso cada 30 minutos (aunque suba varios archivos)
async function subidaCliente(id: string) {
  const { data: s } = await sb.from("pas_subidas_cliente").select("id, caso_id, estado, creado").eq("id", id).maybeSingle();
  if (!s || s.estado !== "subida" || !reciente(s.creado, 2)) return 0;
  if (!(await unaVez(`subida:${s.caso_id}:${Math.floor(Date.now() / 1800e3)}`))) return 0;
  const { data: c } = await sb.from("pas_casos").select("asegurado, patente").eq("id", s.caso_id).maybeSingle();
  return enviar({
    titulo: "El cliente mandó documentación",
    cuerpo: `${c?.asegurado || "Un cliente"}${c?.patente ? ` (${c.patente})` : ""} subió archivos. Guardalos desde Hoy.`,
    url: "/", etiqueta: `subida-${s.caso_id}`,
  });
}

// Eventos de mañana (hora de Argentina)
async function agendaDeManana() {
  const manana = new Date(Date.now() - 3 * 3600e3 + 24 * 3600e3).toISOString().slice(0, 10);
  const { data: evs } = await sb.from("pas_eventos").select("id, caso_id, tipo, inicio, lugar, link")
    .gte("inicio", `${manana}T00:00:00-03:00`).lte("inicio", `${manana}T23:59:59-03:00`).order("inicio");
  let enviados = 0;
  for (const ev of evs || []) {
    if (!(await unaVez(`agenda:${ev.id}:${manana}`))) continue;
    const { data: c } = await sb.from("pas_casos").select("asegurado, compania_aseguradora").eq("id", ev.caso_id).maybeSingle();
    const hora = new Date(ev.inicio).toLocaleTimeString("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false });
    enviados += await enviar({
      titulo: `Mañana ${hora} hs · ${TIPOS_EVENTO[ev.tipo] || "Evento"}`,
      cuerpo: [c?.asegurado, c?.compania_aseguradora, ev.link ? "con link" : ev.lugar].filter(Boolean).join(" · "),
      url: "/", etiqueta: `agenda-${ev.id}`,
    });
  }
  return enviados;
}

async function esAdmin(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await sb.auth.getUser(token);
  if (!data?.user) return false;
  const { data: a } = await sb.from("pas_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return !!a;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const body = await req.json().catch(() => ({}));
  try {
    // Webhooks de base de datos
    if (body.table === "pas_casos" && body.type === "INSERT") return responder({ enviados: await casoNuevo(body.record?.id) });
    if (body.table === "pas_subidas_cliente" && body.type === "UPDATE" && body.record?.estado === "subida" && body.old_record?.estado !== "subida")
      return responder({ enviados: await subidaCliente(body.record?.id) });
    // Cron
    if (body.tipo === "agenda") return responder({ enviados: await agendaDeManana() });
    // Prueba desde la app
    if (body.tipo === "prueba") {
      if (!(await esAdmin(req))) return responder({ error: "no autorizado" }, 401);
      return responder({ enviados: await enviar({ titulo: "PAS Tracker", cuerpo: "Las notificaciones funcionan en este dispositivo ✓", url: "/", etiqueta: "prueba" }) });
    }
    return responder({ enviados: 0 });
  } catch (e) {
    console.error("[notificar]", e);
    return responder({ error: String(e) }, 500);
  }
});
