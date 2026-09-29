// Novedades que ve el cliente (SQL 35): movimientos de la bitácora (tabla acciones) marcados "Lo ve el cliente",
// con un texto opcional escrito para él. El PAS sigue viendo toda la bitácora en el portal (política del SQL 06).
import { supabase } from "../supabase.js";
import { linkWhatsApp, linkVistaCliente, clientePuedeEntrar } from "./mensajes.js";
import { primerNombre } from "./formatters.js";

// ¿Está corrido el SQL 35? (una sola consulta por sesión)
let soporte = null;
export function hayNovedadesCliente() {
  if (!soporte) soporte = supabase.from("acciones").select("visible_cliente").limit(1).then(({ error }) => !error);
  return soporte;
}

// Vista del cliente (casos PAS): patente + últimos 3 del DNI. [] si no hay; null si falla o falta el SQL 35.
export async function novedadesDelCaso({ patente, dni, casoId }) {
  const { data, error } = await supabase.rpc("movimientos_cliente", { p_patente: patente, p_dni: dni, p_caso_id: casoId });
  if (error) { console.warn("[novedades]", error.message); return null; }
  return Array.isArray(data) ? data : [];
}

// Vista del cliente (expedientes): DNI completo + código. null = no coincide; lanza "demasiados_intentos".
export async function consultarExpedienteCliente({ dni, codigo }) {
  const { data, error } = await supabase.rpc("consultar_expediente_cliente", { p_dni: dni, p_codigo: codigo });
  if (error) throw error;
  return data || null;
}

export const linkVistaExpediente = codigo => `${window.location.origin}/?vista=expediente&codigo=${encodeURIComponent(codigo || "")}`;

// Texto para mandarle al cliente por WhatsApp cuando se marca una novedad como visible
export function avisoNovedad({ caso = null, expediente = null, texto }) {
  if (caso) {
    const nombre = primerNombre(caso.asegurado || "");
    const ver = clientePuedeEntrar(caso) ? ` Lo podés ver en ${linkVistaCliente(caso.patente)} (entrás con la patente y los últimos 3 números de tu DNI).` : "";
    return linkWhatsApp(caso.telefono_asegurado, `Hola${nombre ? ` ${nombre}` : ""}, novedades de tu reclamo: ${texto}.${ver}`);
  }
  if (expediente) {
    const nombre = primerNombre(expediente.cliente_nombre || "");
    const ver = expediente.visible_cliente && expediente.codigo_cliente
      ? ` Lo podés ver en ${linkVistaExpediente(expediente.codigo_cliente)} (entrás con tu DNI y el código ${expediente.codigo_cliente}).` : "";
    return linkWhatsApp(expediente.cliente_telefono, `Hola${nombre ? ` ${nombre}` : ""}, novedades de tu expediente: ${texto}.${ver}`);
  }
  return null;
}

// Estado del expediente en palabras para el cliente
export const ESTADO_EXPEDIENTE_CLIENTE = {
  activo: { l: "En trámite", d: "El expediente avanza en el juzgado. Te avisamos cada novedad importante." },
  paralizado: { l: "En espera", d: "Por ahora no hay movimientos: estamos esperando que el juzgado o la otra parte avancen." },
  sentenciado: { l: "Con sentencia", d: "El juzgado ya resolvió. Te explicamos qué significa y cuáles son los próximos pasos." },
  en_apelacion: { l: "En apelación", d: "La sentencia fue apelada y la revisa un tribunal superior." },
  finalizado: { l: "Terminado", d: "El expediente terminó." },
  archivado: { l: "Archivado", d: "El expediente está archivado." },
};
