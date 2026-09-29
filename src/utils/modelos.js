// Modelos de escritos (tabla modelos_escrito, SQL 32) e historial de lo generado (escritos_generados).
import { supabase } from "../supabase.js";

export const CATEGORIAS_MODELO = [
  { k: "reclamo", l: "Reclamo" },
  { k: "seguimiento", l: "Seguimiento" },
  { k: "acuerdo", l: "Acuerdo" },
  { k: "intimacion", l: "Intimación" },
  { k: "mediacion", l: "Mediación" },
  { k: "judicial", l: "Judicial" },
  { k: "cliente", l: "Al cliente" },
  { k: "otro", l: "Otro" },
];
export const categoriaModelo = k => CATEGORIAS_MODELO.find(c => c.k === k) || CATEGORIAS_MODELO[CATEGORIAS_MODELO.length - 1];

export const AMBITOS = [{ k: "caso", l: "Casos PAS" }, { k: "expediente", l: "Expedientes" }, { k: "ambos", l: "Los dos" }];
export const FIRMAS = [
  { k: "cliente", l: "El cliente (firma, aclaración y DNI)" },
  { k: "estudio", l: "Yo (el estudio)" },
  { k: "ambos", l: "El cliente y yo" },
  { k: "ninguna", l: "Sin firma (mensaje o nota)" },
];

// Documental del reclamo: fija + opcional (la misma lista que usaba generarEscrito.js)
export const DOCUMENTAL_FIJA = ["Denuncia administrativa", "Certificado de cobertura", "Fotos de los daños", "DNI", "Cédula / Título"];
export const DOCUMENTAL_OPCIONAL = [
  { k: "licencia", l: "Licencia de conducir", porDefecto: true },
  { k: "presupuesto", l: "Presupuesto", porDefecto: true },
  { k: "estudiosMedicos", l: "Estudios médicos / Constancia de atención", porDefecto: false },
  { k: "cartaFranquicia", l: "Carta de franquicia", porDefecto: false },
];

// null = falta correr el SQL 32
export async function cargarModelos({ soloActivos = false } = {}) {
  let q = supabase.from("modelos_escrito").select("*").order("orden").order("titulo");
  if (soloActivos) q = q.eq("activo", true);
  const { data, error } = await q;
  if (error) { console.warn("[modelos] cargar:", error.message); return null; }
  return data || [];
}

const CAMPOS = ["titulo", "categoria", "ambito", "cuerpo", "firma", "membrete", "orden", "activo"];
export async function guardarModelo(m) {
  const fila = Object.fromEntries(CAMPOS.filter(k => k in m).map(k => [k, m[k]]));
  const q = m.id ? supabase.from("modelos_escrito").update(fila).eq("id", m.id) : supabase.from("modelos_escrito").insert(fila);
  const { data, error } = await q.select().single();
  if (error) { console.error("[modelos] guardar:", error.message); return { error: error.message }; }
  return { data };
}

export async function borrarModelo(id) {
  const { error } = await supabase.from("modelos_escrito").delete().eq("id", id);
  return error ? error.message : null;
}

// Queda en el historial; si falla no interrumpe (el archivo ya se guardó)
export async function registrarGenerado({ modelo, casoId, expedienteId, titulo, cuerpo, respuestas, formato, archivo }) {
  const { error } = await supabase.from("escritos_generados").insert({
    modelo_id: modelo?.id || null, caso_id: casoId || null, expediente_id: expedienteId || null,
    titulo, cuerpo_final: cuerpo, respuestas: respuestas || {}, formato, archivo: archivo || null,
  });
  if (error) console.warn("[modelos] historial:", error.message);
}

export const modeloSirvePara = (m, ambito) => m.ambito === "ambos" || m.ambito === ambito;
