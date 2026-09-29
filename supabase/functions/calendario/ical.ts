import { createClient } from "npm:@supabase/supabase-js@2";

export const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
export const APP = "https://pas-tracker20.vercel.app";
export const ZONA = "America/Argentina/Buenos_Aires";

export const TIPOS: Record<string, string> = {
  mediacion: "Mediación", audiencia: "Audiencia", vencimiento: "Vencimiento", reunion: "Reunión", otro: "Evento",
};

// ── iCalendar ────────────────────────────────────────────────────────────────
export const esc = (s: unknown) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Plegado de líneas a 75 bytes (RFC 5545 §3.1), sin partir un carácter acentuado
export const bytes = (s: string) => new TextEncoder().encode(s).length;
export function plegar(l: string) {
  const partes: string[] = []; let actual = "";
  for (const ch of l) {
    if (bytes(actual + ch) > (partes.length ? 74 : 75)) { partes.push(actual); actual = ""; }
    actual += ch;
  }
  partes.push(actual);
  return partes.join("\r\n ");
}
export const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export const dia = (iso: string) => iso.slice(0, 10).replace(/-/g, "");
export const diaSiguiente = (iso: string) => {
  const d = new Date(iso.slice(0, 10) + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
};

export type Ev = { uid: string; titulo: string; detalle?: string; url?: string; lugar?: string;
            inicio?: Date; fin?: Date; diaCompleto?: string; alarma?: boolean };

export function vevent(e: Ev, ahora: string) {
  const l = ["BEGIN:VEVENT", `UID:${e.uid}@atglex`, `DTSTAMP:${ahora}`, `SUMMARY:${esc(e.titulo)}`];
  if (e.diaCompleto) l.push(`DTSTART;VALUE=DATE:${dia(e.diaCompleto)}`, `DTEND;VALUE=DATE:${diaSiguiente(e.diaCompleto)}`, "TRANSP:TRANSPARENT");
  else l.push(`DTSTART:${utc(e.inicio!)}`, `DTEND:${utc(e.fin!)}`);
  if (e.detalle) l.push(`DESCRIPTION:${esc(e.detalle + (e.url ? `\n\nAbrir en ATG Lex: ${e.url}` : ""))}`);
  if (e.url) l.push(`URL:${e.url}`);
  if (e.lugar) l.push(`LOCATION:${esc(e.lugar)}`);
  if (e.alarma) l.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.titulo)}`, "TRIGGER:-PT15H", "END:VALARM");
  l.push("END:VEVENT");
  return l.map(plegar).join("\r\n");
}
