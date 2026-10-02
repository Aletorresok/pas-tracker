// Datos del siniestro para cargar los reclamos: grupos de la pestaña Datos y texto para copiar.
import { supabase } from "../supabase.js";

// Columnas del SQL 44 (si no se corrió, la ficha no las muestra)
export const COLUMNAS_SQL44 = [
  "cia_propia", "nro_siniestro_propio", "poliza_propia", "productor_poliza", "cobertura", "vigencia_desde", "vigencia_hasta",
  "titular_poliza", "conductor_nombre", "conductor_dni", "conductor_tel", "hora_siniestro", "tercero_conductor", "tercero_cia",
  "observaciones_siniestro",
];
// Columnas viejas de pas_casos que la ficha no mostraba (el domicilio es del SQL 27)
export const COLUMNAS_PREVIAS = ["nro_siniestro", "ubicacion", "relato", "vehiculo", "motor", "chasis", "tercero_nombre", "tercero_dni", "tercero_contacto", "vehiculo_tercero", "dominio_tercero",
  "domicilio_asegurado", "cp_asegurado", "localidad_asegurado", "provincia_asegurado"];

// t: text | date | time | area ; ancho: columnas de 6 ; ayuda: texto gris debajo
export const GRUPOS_SINIESTRO = [
  {
    k: "hecho", titulo: "El hecho", campos: [
      { k: "hora_siniestro", l: "Hora", t: "time", ancho: 1, sql44: true },
      { k: "ubicacion", l: "Lugar", ancho: 5, ph: "Calle y altura o intersección, localidad" },
      { k: "relato", l: "Relato", t: "area", ancho: 6 },
    ],
  },
  {
    k: "poliza", titulo: "Póliza del cliente", sql44: true, campos: [
      { k: "cia_propia", l: "Compañía del cliente", ancho: 3 },
      { k: "nro_siniestro_propio", l: "N° de siniestro / denuncia", ancho: 3, ayuda: "En la compañía del cliente (no la que reclamamos)." },
      { k: "poliza_propia", l: "Póliza", ancho: 2 },
      { k: "cobertura", l: "Cobertura", ancho: 4, ph: "Ej: PLAN 22 TERCEROS COMPLETOS FULL" },
      { k: "vigencia_desde", l: "Vigencia desde", t: "date", ancho: 2 },
      { k: "vigencia_hasta", l: "Vigencia hasta", t: "date", ancho: 2 },
      { k: "productor_poliza", l: "Productor de la póliza", ancho: 2 },
      { k: "vehiculo", l: "Vehículo del cliente", ancho: 6, ph: "Marca, modelo y año", sql44: false },
      { k: "motor", l: "N° de motor", ancho: 3, mayus: true, sql44: false },
      { k: "chasis", l: "N° de chasis", ancho: 3, mayus: true, sql44: false },
    ],
  },
  {
    k: "personas", titulo: "Asegurado, titular y conductor", sql44: true, campos: [
      { k: "domicilio_asegurado", l: "Domicilio del asegurado", ancho: 4, sql44: false },
      { k: "cp_asegurado", l: "CP", ancho: 2, sql44: false },
      { k: "localidad_asegurado", l: "Localidad", ancho: 3, sql44: false },
      { k: "provincia_asegurado", l: "Provincia", ancho: 3, sql44: false },
      { k: "titular_poliza", l: "Titular de la póliza", ancho: 6, ph: "Vacío = el asegurado" },
      { k: "conductor_nombre", l: "Conductor", ancho: 3, ph: "Vacío = conducía el asegurado" },
      { k: "conductor_dni", l: "DNI del conductor", ancho: 1 },
      { k: "conductor_tel", l: "Teléfono del conductor", ancho: 2 },
    ],
  },
  {
    k: "tercero", titulo: "Tercero", campos: [
      { k: "nro_siniestro", l: "N° de siniestro en la compañía reclamada", ancho: 3 },
      { k: "tercero_cia", l: "Compañía del tercero según la denuncia", ancho: 3, sql44: true },
      { k: "tercero_nombre", l: "Titular", ancho: 3 },
      { k: "tercero_dni", l: "DNI / registro", ancho: 1 },
      { k: "tercero_contacto", l: "Contacto", ancho: 2 },
      { k: "tercero_conductor", l: "Conductor (si no es el titular)", ancho: 3, sql44: true },
      { k: "vehiculo_tercero", l: "Vehículo", ancho: 2 },
      { k: "dominio_tercero", l: "Dominio", ancho: 1, mayus: true },
    ],
  },
  {
    k: "obs", titulo: "Observaciones", sql44: true, campos: [
      { k: "observaciones_siniestro", l: "Observaciones del siniestro", t: "area", ancho: 6, ph: "Testigos, atención médica, domicilio distinto en la denuncia…" },
    ],
  },
];

// El campo necesita el SQL 44 si lo marca él o su grupo
export const necesitaSql44 = (grupo, campo) => campo.sql44 ?? !!grupo.sql44;

const fechaDMA = iso => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");
const hora = h => (h ? String(h).slice(0, 5) : "");

// ¿La compañía del tercero según la denuncia es otra que la que reclamamos? Compara las palabras que distinguen
const GENERICAS = new Set(["seguros", "seguro", "compania", "cia", "de", "la", "el", "sa", "s.a.", "s.a", "argentina", "cooperativa", "limitada", "ltda", "mutual", "sociedad", "anonima", "generales", "poliza", "y", "-"]);
const palabras = t => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9. ]/g, " ").split(/\s+/)
  .filter(p => p && !GENERICAS.has(p) && !/\d/.test(p));
export function ciaNoCoincide(terceroCia, compania) {
  const a = palabras(terceroCia), b = new Set(palabras(compania));
  if (!a.length || !b.size) return false;
  return !a.some(p => b.has(p));
}

// Lo que piden los formularios de reclamo, en orden, solo lo que tiene dato
export function lineasReclamo(c) {
  const v = (l, x) => (x ? [l, String(x).trim()] : null);
  return [
    v("Asegurado", c.asegurado), v("DNI", c.dni_asegurado), v("Teléfono", c.telefono_asegurado),
    v("Domicilio", [c.domicilio_asegurado, c.localidad_asegurado, c.cp_asegurado && `CP ${c.cp_asegurado}`, c.provincia_asegurado].filter(Boolean).join(", ")),
    v("Patente", c.patente), v("Vehículo", c.vehiculo), v("N° de motor", c.motor), v("N° de chasis", c.chasis),
    v("Fecha del siniestro", fechaDMA(c.fecha_siniestro)), v("Hora", hora(c.hora_siniestro)), v("Lugar", c.ubicacion),
    v("Compañía del cliente", c.cia_propia), v("Póliza", c.poliza_propia), v("N° de siniestro / denuncia", c.nro_siniestro_propio),
    v("Cobertura", c.cobertura),
    v("Vigencia", c.vigencia_desde || c.vigencia_hasta ? `${fechaDMA(c.vigencia_desde) || "?"} a ${fechaDMA(c.vigencia_hasta) || "?"}` : ""),
    v("Productor", c.productor_poliza), v("Titular de la póliza", c.titular_poliza),
    v("Conductor", [c.conductor_nombre, c.conductor_dni && `DNI ${c.conductor_dni}`, c.conductor_tel && `Tel. ${c.conductor_tel}`].filter(Boolean).join(" · ")),
    v("Compañía reclamada", c.compania_aseguradora), v("N° de siniestro (compañía reclamada)", c.nro_siniestro),
    v("Tercero", [c.tercero_nombre, c.tercero_dni && `DNI ${c.tercero_dni}`].filter(Boolean).join(" · ")),
    v("Conductor del tercero", c.tercero_conductor),
    v("Vehículo del tercero", [c.vehiculo_tercero, c.dominio_tercero].filter(Boolean).join(" · ")),
    v("Relato", c.relato),
  ].filter(Boolean);
}

export const textoReclamo = c => lineasReclamo(c).map(([l, x]) => `${l}: ${x}`).join("\n");

// ¿Ya se corrió el SQL 44? Se pregunta una vez por sesión
let consultaSql44 = null;
export function hayColumnasSql44() {
  if (!consultaSql44) consultaSql44 = supabase.from("pas_casos").select("hora_siniestro").limit(1).then(({ error }) => !error);
  return consultaSql44;
}

// Misma persona si todas las palabras del nombre más corto están en el otro ("ALAN DIAZ" = "DIAZ ALAN JOEL")
const palabrasNombre = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\(.*?\)/g, " ")
  .replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);
export function mismaPersona(a, b) {
  const x = palabrasNombre(a), y = palabrasNombre(b);
  if (!x.length || !y.length) return false;
  const [corto, largo] = x.length <= y.length ? [x, new Set(y)] : [y, new Set(x)];
  return corto.every(p => largo.has(p));
}
