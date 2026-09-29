// Función "calendario" (Supabase Edge Function): tu agenda de ATG Lex como calendario suscribible (iCalendar).
// Se despliega SIN verificación de JWT, porque Google Calendar pide la URL sin credenciales; el token de la URL es el secreto:
//   supabase functions deploy calendario --no-verify-jwt      (o en el panel: "Enforce JWT verification" apagado)
//
// GET /functions/v1/calendario?t=<token>  →  text/calendar. Token y qué incluir: tabla calendario_tokens (SQL 34),
// se crean desde Herramientas → Calendario en el celular. Incluye, según calendario_tokens.incluir:
//   eventos  → pas_eventos (mediaciones, audiencias, reuniones, vencimientos) con hora, de los últimos 30 días en adelante
//   plazos   → plazos pendientes (todo el día, "VENCE (fatal): ..."; los fatales con alarma la tarde anterior)
//   escritos → escritos pendientes con fecha objetivo (todo el día)
//   acciones → próxima acción con fecha de los casos activos (todo el día)
// Cada evento lleva el link que abre la ficha en ATG Lex (?abrir=caso-ID / ?abrir=expediente-ID).

import { sb, APP, ZONA, TIPOS, esc, utc, vevent } from "./ical.ts";
import type { Ev } from "./ical.ts";

// ── Datos ────────────────────────────────────────────────────────────────────
async function armar(incluir: Record<string, boolean>) {
  const evs: Ev[] = [];
  const desde = new Date(Date.now() - 30 * 86400e3).toISOString();
  const hoy = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

  if (incluir.eventos) {
    const { data } = await sb.from("pas_eventos")
      .select("id, tipo, inicio, duracion_min, lugar, link, notas, caso_id, expediente_id, pas_casos(asegurado, compania_aseguradora, patente), expedientes(caratula, juzgado)")
      .gte("inicio", desde).order("inicio");
    for (const e of data || []) {
      const c = (e as any).pas_casos, x = (e as any).expedientes;
      const de = x ? x.caratula : `${c?.asegurado || "Caso"}${c?.compania_aseguradora ? ` vs ${c.compania_aseguradora}` : ""}`;
      const ini = new Date(e.inicio);
      evs.push({
        uid: `evento-${e.id}`, titulo: `${TIPOS[e.tipo] || "Evento"} · ${de}`,
        inicio: ini, fin: new Date(ini.getTime() + (Number(e.duracion_min) || 60) * 60000),
        lugar: e.lugar || e.link || x?.juzgado || undefined,
        detalle: [e.link && `Link: ${e.link}`, c?.patente && `Patente: ${c.patente}`, e.notas].filter(Boolean).join("\n"),
        url: e.expediente_id ? `${APP}/?abrir=expediente-${e.expediente_id}` : `${APP}/?abrir=caso-${e.caso_id}`,
      });
    }
  }

  if (incluir.plazos || incluir.escritos) {
    const { data } = await sb.from("plazos")
      .select("id, tipo, titulo, vence, fecha_objetivo, clase, caso_id, expediente_id, pas_casos(asegurado), expedientes(caratula)")
      .eq("estado", "pendiente");
    for (const p of data || []) {
      const de = (p as any).expedientes?.caratula || (p as any).pas_casos?.asegurado || "";
      const url = p.expediente_id ? `${APP}/?abrir=expediente-${p.expediente_id}` : `${APP}/?abrir=caso-${p.caso_id}`;
      if (p.tipo === "plazo" && incluir.plazos && p.vence)
        evs.push({ uid: `plazo-${p.id}`, diaCompleto: p.vence, alarma: p.clase === "fatal",
                   titulo: `${p.clase === "fatal" ? "VENCE (fatal)" : "Vence"}: ${p.titulo} · ${de}`, detalle: `Plazo ${p.clase}`, url });
      if (p.tipo === "escrito" && incluir.escritos && p.fecha_objetivo)
        evs.push({ uid: `escrito-${p.id}`, diaCompleto: p.fecha_objetivo, titulo: `Escrito: ${p.titulo} · ${de}`, url });
    }
  }

  if (incluir.acciones) {
    const { data } = await sb.from("pas_casos")
      .select("id, asegurado, proxima_accion, proxima_accion_vence, estado")
      .not("proxima_accion_vence", "is", null).gte("proxima_accion_vence", hoy)
      .not("estado", "in", "(cobrado,desistido)");
    for (const c of data || []) if ((c.proxima_accion || "").trim())
      evs.push({ uid: `accion-${c.id}-${c.proxima_accion_vence}`, diaCompleto: c.proxima_accion_vence,
                 titulo: `${c.proxima_accion} · ${c.asegurado || ""}`, url: `${APP}/?abrir=caso-${c.id}` });
  }
  return evs;
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const token = new URL(req.url).searchParams.get("t") || "";
  if (token.length < 32) return new Response("No encontrado", { status: 404, headers: CORS });
  const { data: tk } = await sb.from("calendario_tokens").select("token, nombre, incluir").eq("token", token).eq("activo", true).maybeSingle();
  if (!tk) return new Response("No encontrado", { status: 404, headers: CORS });
  sb.from("calendario_tokens").update({ ultimo_uso: new Date().toISOString() }).eq("token", token).then(() => {});

  const ahora = utc(new Date());
  const cuerpo = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ATG Lex//Agenda//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(tk.nombre || "ATG Lex")}`, `X-WR-TIMEZONE:${ZONA}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
    ...(await armar(tk.incluir || {})).map(e => vevent(e, ahora)),
    "END:VCALENDAR",
  ].join("\r\n") + "\r\n";

  return new Response(cuerpo, { headers: {
    ...CORS,
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": 'inline; filename="atg-lex.ics"',
    "Cache-Control": "max-age=900",
  } });
});
