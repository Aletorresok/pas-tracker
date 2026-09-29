// Datos del abogado que salen en los escritos (pas_ajustes, clave "estudio").
// ESTUDIO_BASE son los que estaban fijos en generarEscrito.js: se usan si la fila no existe todavía
// o si quien genera el escrito no la puede leer (el portal PAS: pas_ajustes es solo del administrador).
import { supabase } from "../supabase.js";

export const ESTUDIO_BASE = {
  abogado: "Alexis Torres Gaveglio",
  matriculas: "T°142 F°636 C.P.A.C.F y al L° IV F° 20 del C.A.M.G.R",
  condicion_fiscal: "responsable monotributo",
  cuit: "20-39340318-8",
  domicilio: "Pte. Saenz Peña 943, Depto 76 piso 7, CABA",
  mail: "",
  telefono: "",
};

export const CAMPOS_ESTUDIO = [
  { k: "abogado", l: "Nombre y apellido" },
  { k: "matriculas", l: "Matrículas (tal como van en el escrito, después de \"inscripto al\")" },
  { k: "condicion_fiscal", l: "Condición fiscal" },
  { k: "cuit", l: "CUIT" },
  { k: "domicilio", l: "Domicilio constituido" },
  { k: "mail", l: "Mail" },
  { k: "telefono", l: "Teléfono" },
];

const CLAVE = "estudio";

// Siempre devuelve datos completos: lo guardado encima de la base (los campos vacíos no pisan la base)
export async function cargarEstudio() {
  const { data, error } = await supabase.from("pas_ajustes").select("valor").eq("clave", CLAVE).maybeSingle();
  if (error) console.warn("[estudio] cargar:", error.message);
  const guardado = Object.fromEntries(Object.entries(data?.valor || {}).filter(([, v]) => String(v ?? "").trim() !== ""));
  return { ...ESTUDIO_BASE, ...guardado, guardado: !!data?.valor };
}

// Devuelve null si salió bien, o el texto del error
export async function guardarEstudio(datos) {
  const valor = Object.fromEntries(CAMPOS_ESTUDIO.map(({ k }) => [k, String(datos[k] ?? "").trim()]));
  const { error } = await supabase.from("pas_ajustes").upsert({ clave: CLAVE, valor, actualizado: new Date().toISOString() });
  if (error) { console.error("[estudio] guardar:", error.message); return error.message; }
  return null;
}
