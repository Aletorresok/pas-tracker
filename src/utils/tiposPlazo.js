// Catálogo de actuaciones → plazo (tabla tipos_plazo, SQL 33): "Me notificaron el traslado de la demanda"
// arma el plazo con los días, el cómputo y la clase. Los precargados nacen con verificado = false ("Revisar norma")
// hasta que los confirmes en Herramientas → Calculadora de plazos → Catálogo.
import { supabase } from "../supabase.js";

// null = falta correr el SQL 33
export async function cargarTiposPlazo() {
  const { data, error } = await supabase.from("tipos_plazo").select("*").order("orden").order("nombre");
  if (error) { console.warn("[tipos_plazo] cargar:", error.message); return null; }
  return data || [];
}

const CAMPOS = ["nombre", "disparador", "dias", "computo", "clase", "jurisdiccion", "fuero", "ambito", "norma", "avisar_dias_antes", "siguiente_clave", "verificado", "activo", "orden"];
export async function guardarTipoPlazo(t) {
  const fila = Object.fromEntries(CAMPOS.filter(k => k in t).map(k => [k, t[k] === "" ? null : k === "dias" || k === "avisar_dias_antes" || k === "orden" ? Number(t[k]) : t[k]]));
  const q = t.id ? supabase.from("tipos_plazo").update(fila).eq("id", t.id) : supabase.from("tipos_plazo").insert(fila);
  const { data, error } = await q.select().single();
  if (error) { console.error("[tipos_plazo] guardar:", error.message); return { error: error.message }; }
  return { data };
}

export async function borrarTipoPlazo(id) {
  const { error } = await supabase.from("tipos_plazo").delete().eq("id", id);
  return error ? error.message : null;
}

export const JURISDICCIONES_PLAZO = ["todas", "CABA", "PBA", "Federal"];
export const AMBITOS_PLAZO = [{ k: "expediente", l: "Expedientes" }, { k: "caso", l: "Casos PAS" }, { k: "ambos", l: "Los dos" }];

const sinTildes = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Tipos que sirven para este expediente/caso, los que más coinciden primero.
 * Un tipo sirve si está activo, es del ámbito, y su jurisdicción y fuero son "cualquiera" o los del expediente.
 * Si el expediente no tiene jurisdicción cargada, se muestran todas.
 */
export function tiposPara(tipos, { ambito = "expediente", jurisdiccion = null, fuero = null, texto = "" } = {}) {
  const q = sinTildes(texto).split(/\s+/).filter(Boolean);
  return (tipos || [])
    .filter(t => t.activo && (t.ambito === "ambos" || t.ambito === ambito))
    .filter(t => !jurisdiccion || t.jurisdiccion === "todas" || t.jurisdiccion === jurisdiccion)
    .filter(t => !fuero || !t.fuero || t.fuero === fuero)
    .filter(t => { const h = sinTildes(`${t.nombre} ${t.disparador} ${t.norma || ""}`); return q.every(p => h.includes(p)); })
    .map(t => ({ t, puntos: (t.jurisdiccion === jurisdiccion ? 2 : 0) + (fuero && t.fuero === fuero ? 1 : 0) }))
    .sort((a, b) => b.puntos - a.puntos || a.t.orden - b.t.orden)
    .map(x => x.t);
}

export const tipoPorClave = (tipos, clave) => (tipos || []).find(t => t.clave === clave) || null;
