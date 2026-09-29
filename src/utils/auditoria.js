// Auditoría de cambios (tabla `auditoria`, SQL 31): cada alta, cambio o borrado en las tablas importantes
// queda registrado solo, con los campos que cambiaron ({campo: [antes, después]}), quién y cuándo.
// La app solo la lee (Bitácora → "Cambios de datos"); "Volver a este valor" cambia el campo en la ficha
// y lo guarda el autoguardado, así que la vuelta atrás también queda registrada.
import { supabase } from "../supabase.js";
import { estadoInfo } from "../constants.js";
import { estadoExpediente } from "./expedientes.js";

// null = falta correr el SQL 31
export async function historialDe(tabla, filaId, limite = 200) {
  if (!filaId) return [];
  const { data, error } = await supabase.from("auditoria").select("*")
    .eq("tabla", tabla).eq("fila_id", String(filaId)).order("en", { ascending: false }).limit(limite);
  if (error) { console.warn("[auditoria] historial:", error.message); return null; }
  return data || [];
}

// ── Cómo se lee cada campo ──────────────────────────────────────────────────
const ETIQUETAS = {
  // Casos PAS
  asegurado: "Asegurado", dni_asegurado: "DNI", telefono_asegurado: "Teléfono del cliente", patente: "Patente",
  compania_aseguradora: "Compañía", nro_siniestro: "N° de siniestro", fecha_siniestro: "Fecha del siniestro",
  estado: "Estado", estado_honorarios: "Estado de honorarios", documentacion: "Checklist de documentación",
  proxima_accion: "Próxima acción", proxima_accion_vence: "Plazo de la próxima acción", mensaje_cliente: "Mensaje al cliente",
  fecha_derivacion: "Fecha de derivación", fecha_contacto_asegurado: "Contacto con el asegurado", fecha_carga: "Fecha de carga",
  fecha_inicio_reclamo: "Inicio de reclamo", fecha_reclamo: "Primer pedido de respuesta", fecha_ultimo_reclamo: "Último reclamo",
  fecha_ultimo_movimiento: "Último movimiento", fecha_ofrecimiento: "Fecha del ofrecimiento", fecha_reconsideracion: "Reconsideración",
  fecha_mediacion: "Mediación", fecha_inicio_juicio: "Inicio de juicio", fecha_aceptacion: "Aceptación", fecha_firma: "Firma del convenio",
  fecha_pago: "Pago estimado", fecha_cobro: "Cobro de la indemnización", fecha_factura: "Fecha de factura",
  fecha_cobro_honorarios: "Cobro de honorarios", fecha_pago_comision: "Pago de la comisión al PAS", fecha_doc_completa: "Documentación completa",
  monto_reclamado: "Monto reclamado", monto_ofrecimiento: "Último ofrecimiento", primer_ofrecimiento: "Primer ofrecimiento",
  segundo_ofrecimiento: "Segundo ofrecimiento", monto_acordado: "Monto acordado", monto_cobro_asegurado: "Lo que cobró el asegurado",
  monto_cobro_yo: "Mis honorarios", monto_honorarios: "Honorarios", monto_comision_pas: "Comisión PAS", presupuesto: "Presupuesto",
  porcentaje_honorarios: "% de honorarios", plazo_pago: "Plazo de pago (días)", nro_factura: "N° de factura", hilo_gmail: "Hilo de Gmail",
  pas_id: "PAS", vehiculo: "Vehículo", relato: "Relato", comentarios: "Comentarios", nota: "Nota", ubicacion: "Ubicación",
  tercero_nombre: "Tercero", tercero_dni: "DNI del tercero", tercero_contacto: "Contacto del tercero",
  domicilio_asegurado: "Domicilio del asegurado", localidad_asegurado: "Localidad del asegurado",
  // Expedientes
  caratula: "Carátula", fuero: "Fuero", jurisdiccion: "Jurisdicción", juzgado: "Juzgado", secretaria: "Secretaría",
  numero: "N° de expediente", fecha_inicio: "Fecha de inicio", cliente_nombre: "Cliente", cliente_dni: "DNI del cliente",
  cliente_telefono: "Teléfono del cliente", cliente_email: "Mail del cliente", rol_cliente: "Rol del cliente", contraparte: "Contraparte",
  letrado_contrario: "Letrado contrario", honorarios_pactados: "Honorarios pactados", honorarios_cobrados: "Honorarios cobrados",
  visible_cliente: "Visible para el cliente", codigo_cliente: "Código del cliente", notas: "Notas",
};
const MONTOS = /^(monto_|primer_ofrecimiento|segundo_ofrecimiento|presupuesto|honorarios_cobrados)/;
const FECHA = /^\d{4}-\d{2}-\d{2}(T|$)/;

export const etiquetaCampo = k =>
  ETIQUETAS[k] || (k.charAt(0).toUpperCase() + k.slice(1)).replace(/_/g, " ");

const vacio = v => v === null || v === undefined || String(v).trim() === "";
const dma = iso => String(iso).slice(0, 10).split("-").reverse().join("/");

// Valor legible de un campo, según la tabla
export function valorLegible(tabla, campo, v) {
  if (vacio(v)) return "vacío";
  if (campo === "estado") return tabla === "expedientes" ? estadoExpediente(v).l : estadoInfo(v).label;
  if (campo === "estado_honorarios") return { NO_FACTURADO: "No facturado", FACTURADO: "Facturado", COBRADO: "Cobrado" }[v] || String(v);
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (MONTOS.test(campo) && !isNaN(Number(v))) return "$ " + Number(v).toLocaleString("es-AR");
  if (typeof v === "string" && FECHA.test(v)) return dma(v);
  if (typeof v === "object") return "(lista)";
  const s = String(v);
  return s.length > 90 ? s.slice(0, 88) + "…" : s;
}

// El checklist de documentación ({TIPO: fecha}) se cuenta por lo que se tildó y destildó
function describirChecklist(antes, despues) {
  const a = Object.keys(antes || {}), d = Object.keys(despues || {});
  const suma = d.filter(k => !a.includes(k)), saca = a.filter(k => !d.includes(k));
  return [suma.length && `tildó ${suma.join(", ")}`, saca.length && `destildó ${saca.join(", ")}`].filter(Boolean).join(" · ") || "cambió";
}

export const QUIEN = { admin: "Vos", pas: "PAS", cliente: "Cliente", sistema: "Automático" };

/**
 * Filas de auditoría → renglones para mostrar, del más nuevo al más viejo:
 * { id, en, quien, tipo: "cambio" | "alta" | "baja", campo?, etiqueta, antes?, despues?, valorAntes?, texto? }
 */
export function renglonesDe(filas = [], tabla) {
  const out = [];
  filas.forEach(f => {
    const base = { id: f.id, en: f.en, quien: QUIEN[f.rol] || f.rol };
    if (f.operacion === "INSERT") { out.push({ ...base, key: `${f.id}`, tipo: "alta", etiqueta: "Se creó" }); return; }
    if (f.operacion === "DELETE") { out.push({ ...base, key: `${f.id}`, tipo: "baja", etiqueta: "Se eliminó" }); return; }
    Object.entries(f.cambios || {}).sort(([a], [b]) => etiquetaCampo(a).localeCompare(etiquetaCampo(b))).forEach(([campo, par]) => {
      const [antes, despues] = Array.isArray(par) ? par : [undefined, par];
      const r = { ...base, key: `${f.id}-${campo}`, tipo: "cambio", campo, etiqueta: etiquetaCampo(campo), valorAntes: antes };
      if (campo === "documentacion") r.texto = describirChecklist(antes, despues);
      else { r.antes = valorLegible(tabla, campo, antes); r.despues = valorLegible(tabla, campo, despues); }
      out.push(r);
    });
  });
  return out;
}

// Valor de la base → valor del formulario de la ficha (los formularios usan "" en lugar de null)
export function aValorFormulario(campo, v) {
  if (campo === "documentacion") return v && typeof v === "object" ? v : {};
  return v === null || v === undefined ? "" : v;
}
