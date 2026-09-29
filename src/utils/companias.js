// Directorio de compañías (SQL 21 + 27 + 30): la ficha única de cada aseguradora.
// La clave es el nombre corto, tal cual en pas_casos.compania_aseguradora.
// De acá salen los datos para la carta documento, los escritos y los contactos de la ficha del caso.
import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { guardarCompania as guardarFila } from "./ofertas.js";

// Cualquier cambio en el directorio avisa a todas las pantallas que lo muestran
const CAMBIO = "pas-companias-cambio";
const avisar = () => window.dispatchEvent(new Event(CAMBIO));
export async function guardarCompania(nombre, datos) {
  const err = await guardarFila(nombre, datos);
  if (!err) avisar();
  return err;
}

// ── Sugerencias de nombres (al derivar o cargar un caso) ─────────
// Aseguradoras más comunes en Argentina, para sugerir al derivar (se suman las que ya tienen casos)
export const COMPANIAS_CONOCIDAS = [
  "Allianz", "ATM Seguros", "Berkley", "Boston", "Cooperación Seguros", "El Norte", "Experta", "Federación Patronal",
  "Galeno", "HDI", "Holando Sudamericana", "Integrity", "La Caja", "La Segunda", "Libra", "Mapfre", "Mercantil Andina",
  "Meridional", "Nación Seguros", "Nivel Seguros", "Orbis", "Paraná Seguros", "Provincia Seguros", "Prudencia",
  "Rivadavia", "Río Uruguay (RUS)", "San Cristóbal", "Sancor", "SMG Seguros", "Triunfo", "Victoria", "Zurich",
];

const clave = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/seguros?/g, "").replace(/[^a-z0-9]/g, "");

// Une las conocidas con las que ya aparecen en los casos, sin repetir (ignora tildes, mayúsculas y "Seguros")
export function listaCompanias(extra = []) {
  const vistas = new Map();
  [...extra, ...COMPANIAS_CONOCIDAS].forEach(n => { const k = clave(n); if (n && k && !vistas.has(k)) vistas.set(k, n); });
  return [...vistas.values()].sort((a, b) => a.localeCompare(b, "es"));
}

// ── Ficha de cada compañía ───────────────────────────────────────
export const TIPOS_CONTACTO = [
  { k: "siniestros", l: "Siniestros" },
  { k: "estudio", l: "Estudio gestor" },
  { k: "analista", l: "Analista / liquidador" },
  { k: "mediacion", l: "Mediación" },
  { k: "facturacion", l: "Facturación / pagos" },
  { k: "otro", l: "Otro" },
];
export const tipoContacto = k => TIPOS_CONTACTO.find(t => t.k === k)?.l || "Contacto";

// ── Base ─────────────────────────────────────────────────────────
// { fichas: { nombre: fila }, contactos: [..], faltaSql: bool } — sin el SQL 30 los contactos vienen vacíos
export async function cargarDirectorio() {
  const [f, c] = await Promise.all([
    supabase.from("pas_companias").select("*"),
    supabase.from("pas_compania_contactos").select("*").order("creado"),
  ]);
  return {
    fichas: Object.fromEntries((f.data || []).map(r => [r.compania, r])),
    contactos: c.data || [],
    faltaSql: !!c.error || (f.data?.[0] && !("cuit" in f.data[0])),
    error: f.error?.message || null,
  };
}

// Directorio cargado y al día (null mientras carga)
export function useDirectorio() {
  const [dir, setDir] = useState(null);
  useEffect(() => {
    let vivo = true;
    const cargar = () => cargarDirectorio().then(d => vivo && setDir(d));
    cargar();
    window.addEventListener(CAMBIO, cargar);
    return () => { vivo = false; window.removeEventListener(CAMBIO, cargar); };
  }, []);
  return dir;
}

export async function guardarContactoCia(contacto) {
  const { compania, id, tipo, nombre, mail, telefono, notas } = contacto;
  // La compañía tiene que existir en el directorio antes de colgarle contactos
  await supabase.from("pas_companias").upsert({ compania }, { onConflict: "compania", ignoreDuplicates: true });
  const fila = { compania, tipo: tipo || "siniestros", nombre: nombre || null, mail: mail || null, telefono: telefono || null, notas: notas || null };
  const q = id ? supabase.from("pas_compania_contactos").update(fila).eq("id", id) : supabase.from("pas_compania_contactos").insert(fila);
  const { data, error } = await q.select().single();
  if (!error) avisar();
  return error ? { error: error.message } : { data };
}

export async function borrarContactoCia(id) {
  const { error } = await supabase.from("pas_compania_contactos").delete().eq("id", id);
  if (!error) avisar();
  return error ? error.message : null;
}

// ── CUIT ─────────────────────────────────────────────────────────
export const soloDigitos = v => String(v || "").replace(/\D/g, "");
export const formatearCuit = v => {
  const d = soloDigitos(v);
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : String(v || "").trim();
};
// Dígito verificador (módulo 11). true / false; null si está vacío
export function cuitValido(v) {
  const d = soloDigitos(v);
  if (!d) return null;
  if (d.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((s, p, i) => s + p * Number(d[i]), 0);
  let dv = 11 - (suma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) return false;
  return dv === Number(d[10]);
}

// ── Lo que usan las otras pantallas ───────────────────────────────
const buscar = (fichas, nombre) => {
  if (!nombre) return null;
  const n = nombre.trim().toLowerCase();
  return fichas[nombre] || Object.values(fichas).find(f => f.compania.toLowerCase() === n) || null;
};
export const fichaDe = buscar;

export const nombreLegal = (cia, nombre) => cia?.razon_social?.trim() || cia?.compania || nombre || "";

const domicilio = (cia, pref) => ({
  domicilio: cia?.[`${pref}domicilio`] || "", cp: cia?.[`${pref}cp`] || "",
  localidad: cia?.[`${pref}localidad`] || "", provincia: cia?.[`${pref}provincia`] || "",
});
export const domicilioLegal = cia => domicilio(cia, "legal_");
// Para cartas documento: el de notificaciones; si no hay, el legal
export const domicilioNotificar = cia => (cia?.domicilio ? domicilio(cia, "") : domicilioLegal(cia));
export const textoDomicilio = d => [d.domicilio, [d.cp && `(${d.cp})`, d.localidad].filter(Boolean).join(" "), d.provincia].filter(Boolean).join(", ");

// Qué le falta a la ficha para que sirva en escritos y cartas
export function faltantes(cia) {
  const f = [];
  if (!cia?.razon_social) f.push("razón social");
  if (!cia?.cuit) f.push("CUIT");
  else if (cuitValido(cia.cuit) === false) f.push("CUIT válido");
  if (!cia?.legal_domicilio) f.push("domicilio legal");
  return f;
}
