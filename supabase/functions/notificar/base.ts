import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

export const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Claves VAPID propias del estudio: se generan una sola vez y quedan en la base
export let claves: { publicKey: string; privateKey: string } | null = null;
export async function vapid() {
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

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
export const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

export const ZONA = "America/Argentina/Buenos_Aires";
export const TIPOS_EVENTO: Record<string, string> = { mediacion: "Mediación", audiencia: "Audiencia", vencimiento: "Vencimiento", reunion: "Reunión", otro: "Evento" };

export type Aviso = { titulo: string; cuerpo: string; url?: string; etiqueta?: string };

// Registra la clave; si ya existía, ese aviso ya se mandó
export async function unaVez(clave: string) {
  const { error } = await sb.from("pas_avisos").insert({ clave });
  return !error;
}

export async function enviar(aviso: Aviso) {
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

export async function nombrePas(pasId: unknown) {
  if (pasId == null) return "";
  const { data: l } = await sb.from("pas_lista").select("nombre").eq("pas_id", pasId).maybeSingle();
  if (l?.nombre) return l.nombre;
  const { data: m } = await sb.from("pas_manuales").select("nombre").eq("id", String(pasId)).maybeSingle();
  if (m?.nombre) return m.nombre;
  const { data: c } = await sb.from("pas_contactos").select("nombre").eq("id", String(pasId)).maybeSingle();
  return c?.nombre || "";
}

export const reciente = (iso: string | null | undefined, horas: number) => !!iso && Date.now() - new Date(iso).getTime() < horas * 3600e3;
