import { sb, ZONA, TIPOS_EVENTO, unaVez, enviar, nombrePas, reciente } from "./base.ts";

// Caso nuevo que derivó un PAS desde el portal
export async function casoNuevo(id: string) {
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
export async function subidaCliente(id: string) {
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
export async function agendaDeManana() {
  const manana = new Date(Date.now() - 3 * 3600e3 + 24 * 3600e3).toISOString().slice(0, 10);
  const { data: evs } = await sb.from("pas_eventos").select("id, caso_id, expediente_id, tipo, inicio, lugar, link")
    .gte("inicio", `${manana}T00:00:00-03:00`).lte("inicio", `${manana}T23:59:59-03:00`).order("inicio");
  let enviados = 0;
  for (const ev of evs || []) {
    if (!(await unaVez(`agenda:${ev.id}:${manana}`))) continue;
    const { data: c } = ev.expediente_id
      ? await sb.from("expedientes").select("asegurado:caratula").eq("id", ev.expediente_id).maybeSingle()
      : await sb.from("pas_casos").select("asegurado, compania_aseguradora").eq("id", ev.caso_id).maybeSingle();
    const hora = new Date(ev.inicio).toLocaleTimeString("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false });
    enviados += await enviar({
      titulo: `Mañana ${hora} hs · ${TIPOS_EVENTO[ev.tipo] || "Evento"}`,
      cuerpo: [c?.asegurado, c?.compania_aseguradora, ev.link ? "con link" : ev.lugar].filter(Boolean).join(" · "),
      url: ev.expediente_id ? `/?abrir=expediente-${ev.expediente_id}` : `/?abrir=caso-${ev.caso_id}`, etiqueta: `agenda-${ev.id}`,
    });
  }
  return enviados;
}

// Plazos (SQL 33, vista plazos_para_avisar): los que entraron en sus días de aviso. Los fatales tienen aviso propio
// (uno por día y por plazo, con link a la ficha); todos cuentan en el resumen. Sin el SQL 33 no hace nada.
export type PlazoAviso = { id: string; titulo: string; vence: string; clase: string; caso_id: string | null; expediente_id: string | null; de: string | null; dias_restantes: number };
export async function plazosParaAvisar(): Promise<PlazoAviso[]> {
  const { data, error } = await sb.from("plazos_para_avisar").select("*");
  if (error) { console.warn("[plazos]", error.message); return []; }
  return (data || []) as PlazoAviso[];
}
export const cuandoVence = (d: number, vence: string) => {
  const dm = vence.slice(8, 10) + "/" + vence.slice(5, 7);
  return d < 0 ? `Venció el ${dm}` : d === 0 ? "Vence hoy" : d === 1 ? "Vence mañana" : `Vence el ${dm}`;
};
export async function avisosDePlazos() {
  const hoy = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  let enviados = 0;
  for (const p of await plazosParaAvisar()) {
    if (p.clase !== "fatal" || p.dias_restantes < -3) continue; // vencidos hace más de 3 días: solo en el resumen
    if (!(await unaVez(`plazo:${p.id}:${hoy}`))) continue;
    enviados += await enviar({
      titulo: `${cuandoVence(p.dias_restantes, p.vence)}: ${p.titulo}`,
      cuerpo: `${p.de || "Sin nombre"} · plazo fatal`,
      url: p.expediente_id ? `/?abrir=expediente-${p.expediente_id}` : `/?abrir=caso-${p.caso_id}`,
      etiqueta: `plazo-${p.id}`,
    });
    await sb.from("plazos").update({ avisado_en: hoy }).eq("id", p.id);
  }
  return enviados;
}
