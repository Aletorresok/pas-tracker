// Función "notificar" (Supabase Edge Function): manda notificaciones push a los dispositivos del estudio.
// La llaman:
//   · Webhook de base de datos en pas_casos (INSERT)            → "Nuevo caso del portal"
//   · Webhook de base de datos en pas_subidas_cliente (UPDATE)  → "El cliente mandó documentación"
//   · Cron diario ({"tipo":"agenda"}, 9 hs)                      → plazos fatales por vencer (SQL 33) + mediaciones/audiencias
//                                                                  de mañana + resumen del día (con los plazos)
//   · La app ({"tipo":"resumen"}, solo el administrador)         → el resumen del día, para probarlo
//   · La app ({"tipo":"prueba"}, solo el administrador)          → notificación de prueba
//   · La app ({"tipo":"clave"})                                  → clave pública para activar un dispositivo
// No hace falta cargar secretos: la primera vez genera su par de claves VAPID y lo guarda en pas_config
// (tabla sin permisos para la app; solo la lee esta función). SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase.

import { casoNuevo, subidaCliente, agendaDeManana, avisosDePlazos } from "./avisos.ts";
import { sb, vapid, CORS, responder, enviar } from "./base.ts";
import { resumenDelDia } from "./resumen.ts";

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
    if (body.tipo === "agenda") return responder({ enviados: (await avisosDePlazos()) + (await agendaDeManana()) + (await resumenDelDia()) });
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
      return responder({ enviados: await enviar({ titulo: "ATG Lex", cuerpo: "Las notificaciones funcionan en este dispositivo ✓", url: "/", etiqueta: "prueba" }) });
    }
    return responder({ enviados: 0 });
  } catch (e) {
    console.error("[notificar]", e);
    return responder({ error: String(e) }, 500);
  }
});
