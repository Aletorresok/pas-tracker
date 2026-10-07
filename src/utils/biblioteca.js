// Biblioteca: jurisprudencia, doctrina y normas (tabla del SQL 46). El primer lote viene del relevamiento
// verificado en SAIJ, JUBA y la CSJN (docs/biblioteca/); lo demás se carga a mano desde la pestaña.
import { supabase } from "../supabase.js";

export const TIPOS_BIBLIOTECA = [
  { k: "fallo", l: "Jurisprudencia", uno: "fallo" },
  { k: "doctrina", l: "Doctrina", uno: "trabajo de doctrina" },
  { k: "norma", l: "Normas", uno: "norma" },
];

// Lista fija de temas (la misma del relevamiento); al cargar a mano se puede escribir otro
export const TEMAS_BIBLIOTECA = [
  "privación de uso", "desvalorización", "daño emergente", "incapacidad", "daño moral", "concurrencia",
  "citación en garantía", "franquicia", "suma asegurada", "intereses", "prescripción", "mediación",
];

export const JURISDICCIONES_BIBLIOTECA = [
  { k: "Nacional", l: "Nacional (CABA)" }, { k: "PBA", l: "Provincia" }, { k: "CSJN", l: "Corte Suprema" }, { k: "CABA", l: "Ciudad (local)" },
];

export const RESULTADOS_BIBLIOTECA = [
  { k: "a favor", l: "A favor", color: "var(--ok)" },
  { k: "en contra", l: "En contra", color: "var(--bad)" },
  { k: "mixto", l: "Mixto", color: "var(--warn)" },
];
export const colorResultado = r => RESULTADOS_BIBLIOTECA.find(x => x.k === r)?.color || "var(--muted)";

// null = falta correr el SQL 46
export async function cargarBiblioteca() {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from("biblioteca").select("*").order("id").range(desde, desde + 999);
    if (error) return null;
    filas.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return filas;
}

const CAMPOS = ["tipo", "titulo", "autor", "tribunal", "sala", "fecha", "anio", "jurisdiccion", "fuero", "publicacion",
  "articulos", "temas", "resultado", "sumario", "url", "acceso", "notas", "favorito"];

// Guarda (alta o edición). Devuelve { data } o { error }
export async function guardarEnBiblioteca(item) {
  const fila = Object.fromEntries(CAMPOS.filter(k => k in item).map(k => [k, item[k] === "" ? null : item[k]]));
  fila.temas = (item.temas || []).map(t => t.trim()).filter(Boolean);
  if (fila.anio) fila.anio = Number(fila.anio) || null;
  const q = item.id
    ? supabase.from("biblioteca").update(fila).eq("id", item.id).select().single()
    : supabase.from("biblioteca").insert({ ...fila, origen: "manual" }).select().single();
  const { data, error } = await q;
  return error ? { error: error.message } : { data };
}

export async function borrarDeBiblioteca(id) {
  const { error } = await supabase.from("biblioteca").delete().eq("id", id);
  return error ? error.message : null;
}

// Fecha con el año completo (para citas): 2026-06-19 → 19/06/2026
export const fechaCita = iso => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

const sinTildes = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Filtra y ordena: favoritos primero, después lo más nuevo
export function filtrarBiblioteca(lista, { tipo, busqueda = "", tema, jurisdiccion, resultado, favoritos } = {}) {
  const palabras = sinTildes(busqueda).split(/\s+/).filter(Boolean);
  return lista
    .filter(x => !tipo || x.tipo === tipo)
    .filter(x => !tema || (x.temas || []).includes(tema))
    .filter(x => !jurisdiccion || x.jurisdiccion === jurisdiccion)
    .filter(x => !resultado || x.resultado === resultado)
    .filter(x => !favoritos || x.favorito)
    .filter(x => {
      if (!palabras.length) return true;
      const texto = sinTildes([x.titulo, x.autor, x.tribunal, x.sala, x.publicacion, x.articulos, x.sumario, x.notas, (x.temas || []).join(" ")].join(" "));
      return palabras.every(p => texto.includes(p));
    })
    .sort((a, b) => (b.favorito ? 1 : 0) - (a.favorito ? 1 : 0)
      || String(b.fecha || b.anio || "").localeCompare(String(a.fecha || a.anio || ""))
      || a.titulo.localeCompare(b.titulo, "es"));
}

// Línea de datos debajo del título
export function detalleBiblioteca(x) {
  if (x.tipo === "fallo") return [x.tribunal, x.sala && `Sala ${x.sala}`, x.fecha && fechaCita(x.fecha)].filter(Boolean).join(" · ");
  if (x.tipo === "doctrina") return [x.autor, x.publicacion, x.anio].filter(Boolean).join(" · ");
  return x.articulos ? `Art. ${x.articulos}` : "";
}

// Cita lista para pegar en un escrito
export function citaBiblioteca(x) {
  if (x.tipo === "fallo") return `${[x.tribunal, x.sala && `Sala ${x.sala}`].filter(Boolean).join(", ")}, "${x.titulo}", ${x.fecha ? fechaCita(x.fecha) : "s/f"}${x.url ? ` (${x.url})` : ""}.`;
  if (x.tipo === "doctrina") return `${x.autor ? x.autor + ", " : ""}"${x.titulo}"${x.publicacion ? ", " + x.publicacion : ""}${x.anio ? ", " + x.anio : ""}.`;
  return `${x.titulo}${x.articulos ? `, art. ${x.articulos}` : ""}.`;
}

// Cuántos hay por valor de un filtro, con los demás filtros puestos (para los números de los chips)
export const contarPor = (lista, filtros, campo, valor) => filtrarBiblioteca(lista, { ...filtros, [campo]: valor }).length;
