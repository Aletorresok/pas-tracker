// Función "notificar" (Supabase Edge Function): manda notificaciones push a los dispositivos del estudio.
// La llaman:
//   · Webhook de base de datos en pas_casos (INSERT)            → "Nuevo caso del portal"
//   · Webhook de base de datos en pas_subidas_cliente (UPDATE)  → "El cliente mandó documentación"
//   · Cron diario ({"tipo":"agenda"}, 9 hs)                      → mediaciones/audiencias de mañana + resumen del día
//   · La app ({"tipo":"resumen"}, solo el administrador)         → el resumen del día, para probarlo
//   · La app ({"tipo":"prueba"}, solo el administrador)          → notificación de prueba
//   · La app ({"tipo":"clave"})                                  → clave pública para activar un dispositivo
// No hace falta cargar secretos: la primera vez genera su par de claves VAPID y lo guarda en pas_config
// (tabla sin permisos para la app; solo la lee esta función). SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Claves VAPID propias del estudio: se generan una sola vez y quedan en la base
let claves: { publicKey: string; privateKey: string } | null = null;
async function vapid() {
  if (claves) return claves;
  const { data } = await sb.from("pas_config").select("valor").eq("clave", "vapid").maybeSingle();
  if (data?.valor) claves = JSON.parse(data.valor);
  else {
    const nuevas = webpush.generateVAPIDKeys();
    const { error } = await sb.from("pas_config").insert({ clave: "vapid", valor: JSON.stringify(nuevas) });
    if (error) { // otra llamada las creó al mismo tiempo: usar esas
      const { data: otra } = await sb.from("pas_config").select("valor").eq("clave", "vapid").maybeSingle();
      claves = JSON.parse(otra!.valor);
    } else claves = nuevas;
  }
  webpush.setVapidDetails("https://pas-tracker20.vercel.app", claves!.publicKey, claves!.privateKey);
  return claves!;
}

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
  await vapid();
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

// Resumen del día (9 hs): tareas vencidas y de hoy, pagos que ya deberían haber entrado, mediaciones y audiencias
// de la semana, casos nuevos del portal sin abrir y comisiones que le debés a un PAS. Una vez por día (salvo `forzar`).
const agregar = (y: string, m: string, d: string, dias: number) => {
  const f = new Date(`${y}-${m}-${d}T12:00:00Z`);
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().slice(0, 10);
};
async function resumenDelDia(forzar = false) {
  const hoy = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  if (!forzar && !(await unaVez(`resumen:${hoy}`))) return 0;
  const { data: casos } = await sb.from("pas_casos")
    .select("estado, proxima_accion, proxima_accion_vence, fecha_firma, plazo_pago, fecha_pago, origen, revisado_en, monto_cobro_yo, monto_comision_pas, fecha_cobro_honorarios, estado_honorarios, fecha_pago_comision");
  const activos = (casos || []).filter(c => !["cobrado", "desistido"].includes(c.estado));
  const conAccion = activos.filter(c => (c.proxima_accion || "").trim() && c.proxima_accion_vence);
  const vencidas = conAccion.filter(c => String(c.proxima_accion_vence).slice(0, 10) < hoy).length;
  const deHoy = conAccion.filter(c => String(c.proxima_accion_vence).slice(0, 10) === hoy).length;
  const pagosVencidos = activos.filter(c => {
    if (c.estado !== "esperando_pago") return false;
    let f = c.fecha_pago ? String(c.fecha_pago).slice(0, 10) : null;
    if (c.fecha_firma && Number(c.plazo_pago)) { const [y, m, d] = String(c.fecha_firma).slice(0, 10).split("-"); f = agregar(y, m, d, Number(c.plazo_pago)); }
    return !!f && f <= hoy;
  }).length;
  const nuevos = (casos || []).filter(c => c.origen === "portal" && !c.revisado_en).length;
  const honorariosCobrados = (c: Record<string, unknown>) => !!c.fecha_cobro_honorarios || c.estado_honorarios === "COBRADO" || c.estado === "cobrado";
  const comisiones = (casos || []).filter(c => Number(c.monto_comision_pas) > 0 && c.estado !== "desistido" && honorariosCobrados(c) && !c.fecha_pago_comision).length;
  const [y, m, d] = hoy.split("-");
  const { count: eventos } = await sb.from("pas_eventos").select("id", { count: "exact", head: true })
    .in("tipo", ["mediacion", "audiencia"]).gte("inicio", `${hoy}T00:00:00-03:00`).lte("inicio", `${agregar(y, m, d, 6)}T23:59:59-03:00`);

  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
  const partes = [
    vencidas && plural(vencidas, "tarea vencida", "tareas vencidas"),
    deHoy && plural(deHoy, "tarea para hoy", "tareas para hoy"),
    pagosVencidos && plural(pagosVencidos, "pago que ya debería haber entrado", "pagos que ya deberían haber entrado"),
    eventos && plural(eventos, "mediación o audiencia esta semana", "mediaciones o audiencias esta semana"),
    nuevos && plural(nuevos, "caso nuevo del portal sin abrir", "casos nuevos del portal sin abrir"),
    comisiones && plural(comisiones, "comisión por pagar a un PAS", "comisiones por pagar a PAS"),
  ].filter(Boolean);
  return enviar({
    titulo: partes.length ? "Tu día en PAS Tracker" : "Todo al día",
    cuerpo: partes.length ? partes.join(" · ") : "No hay tareas vencidas ni pendientes para hoy.",
    url: "/", etiqueta: `resumen-${hoy}`,
  });
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
    if (body.tipo === "agenda") return responder({ enviados: (await agendaDeManana()) + (await resumenDelDia()) });
    // Resumen del día a pedido (para probarlo desde la app)
    if (body.tipo === "resumen") {
      if (!(await esAdmin(req))) return responder({ error: "no autorizado" }, 401);
      return responder({ enviados: await resumenDelDia(true) });
    }
    // Clave pública para que la app active un dispositivo (no es secreta)
    if (body.tipo === "clave") return responder({ clave: (await vapid()).publicKey });
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
