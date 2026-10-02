// Lectura de documentos del siniestro (denuncia, certificado, carta de franquicia) para completar la ficha.
// Para sumar una compañía: un archivo como provincia.js con sus lectores, y agregarlo a LECTORES.
import { renglonesPdf, limpiar } from "./textoPdf.js";
import provincia from "./provincia.js";
import { mismaPersona } from "../datosSiniestro.js";

export const LECTORES = [...provincia]; // el orden es la prioridad cuando dos documentos traen el mismo dato

// Lee un archivo PDF. Devuelve { archivo, lector, campos, notas } o { archivo, error }
export async function leerArchivo(archivo) {
  try {
    const renglones = await renglonesPdf(new Uint8Array(await archivo.arrayBuffer()));
    if (!renglones.length) return { archivo, error: "no tiene texto (parece un escaneo o una foto)" };
    const lector = LECTORES.find(l => l.detecta(renglones));
    if (!lector) return { archivo, error: "todavía no se reconoce este formulario (por ahora: Provincia Seguros)" };
    return { archivo, lector, ...lector.leer(renglones) };
  } catch (e) {
    return { archivo, error: `no se pudo leer (${e.message})` };
  }
}

const ETIQUETAS = {
  fecha_siniestro: "Fecha del siniestro", hora_siniestro: "Hora", ubicacion: "Lugar", relato: "Relato",
  patente: "Patente", vehiculo: "Vehículo del cliente", motor: "N° de motor", chasis: "N° de chasis",
  dni_asegurado: "DNI del asegurado", telefono_asegurado: "Teléfono del asegurado",
  domicilio_asegurado: "Domicilio del asegurado", cp_asegurado: "CP", localidad_asegurado: "Localidad", provincia_asegurado: "Provincia",
  cia_propia: "Compañía del cliente", nro_siniestro_propio: "N° de siniestro / denuncia", poliza_propia: "Póliza",
  cobertura: "Cobertura", vigencia_desde: "Vigencia desde", vigencia_hasta: "Vigencia hasta", productor_poliza: "Productor de la póliza",
  titular_poliza: "Titular de la póliza", conductor_nombre: "Conductor", conductor_dni: "DNI del conductor", conductor_tel: "Teléfono del conductor",
  tercero_nombre: "Tercero: titular", tercero_dni: "Tercero: DNI / registro", tercero_conductor: "Tercero: conductor",
  vehiculo_tercero: "Tercero: vehículo", dominio_tercero: "Tercero: dominio", tercero_cia: "Tercero: compañía según la denuncia",
  observaciones_siniestro: "Observaciones",
};
const ORDEN = Object.keys(ETIQUETAS);

// "TUCUMAN Nro.278" → "TUCUMAN 278"
const domicilio = t => limpiar(String(t || "").replace(/\s*Nro\.\s*/i, " "));
// "1661 - BELLA VISTA (PDO. SAN MIGUEL) - BUENOS AIRES" → { cp, localidad, provincia }
const cpLocProv = t => {
  const [cp, ...resto] = String(t || "").split(/\s+-\s+/).map(limpiar);
  return /^\d{4}$/.test(cp) ? { cp, localidad: resto.slice(0, -1).join(" - ") || resto[0] || "", provincia: resto.length > 1 ? resto.at(-1) : "" } : {};
};
const TELEFONOS = new Set(["telefono_asegurado", "conductor_tel"]);
const NUMEROS = new Set(["dni_asegurado", "conductor_dni", "tercero_dni", "poliza_propia", "cp_asegurado"]);
// Teléfonos y números se comparan solo por sus dígitos
const comparable = (k, v) => (TELEFONOS.has(k) || NUMEROS.has(k) ? String(v || "").replace(/\D/g, "") : limpiar(v).toLowerCase().replace(/:00$/, ""));
// "(11)-6439-8245" → "11 6439-8245"
const telefono = t => limpiar(String(t || "").replace(/^\((\d+)\)-?/, "$1 "));
// Para mostrar en la tabla: fechas como 19/05/2026
const mostrar = (k, v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split("-").reverse().join("/") : TELEFONOS.has(k) ? telefono(v) : String(v));

// Junta lo leído de todos los documentos y arma las propuestas contra los datos actuales del caso.
// Devuelve [{ k, etiqueta, actual, nuevo, marcado }] solo para lo que cambia.
export function proponer(leidos, caso) {
  const ok = leidos.filter(l => l.lector).sort((a, b) => LECTORES.indexOf(a.lector) - LECTORES.indexOf(b.lector));
  const c = {};
  for (const { campos } of ok) for (const [k, v] of Object.entries(campos)) if (v && !c[k]) c[k] = v;
  const notas = ok.flatMap(l => l.notas || []);

  const nuevo = {};
  for (const [k, v] of Object.entries(c)) if (!k.startsWith("_")) nuevo[k] = v;

  // El titular de la póliza: si es el asegurado del caso, sus datos son los del asegurado
  const titularEsAsegurado = !c._titular || mismaPersona(c._titular, caso.asegurado);
  if (!titularEsAsegurado) nuevo.titular_poliza = c._titular;
  else {
    if (c._dni_titular) nuevo.dni_asegurado = c._dni_titular;
    if (c._domicilio) nuevo.domicilio_asegurado = domicilio(c._domicilio);
    if (c._cp) nuevo.cp_asegurado = c._cp;
    if (c._localidad) nuevo.localidad_asegurado = c._localidad;
    if (c._telefono) nuevo.telefono_asegurado = c._telefono;
  }
  // El conductor: si no es el asegurado, va en su grupo; si es, su teléfono y su domicilio son los del asegurado
  const cond = c._conductor;
  if (cond?.nombre) {
    if (!mismaPersona(cond.nombre, caso.asegurado)) {
      nuevo.conductor_nombre = cond.nombre; nuevo.conductor_dni = cond.dni; nuevo.conductor_tel = cond.tel;
    } else {
      if (cond.tel) nuevo.telefono_asegurado = cond.tel;
      if (cond.dni && !nuevo.dni_asegurado) nuevo.dni_asegurado = cond.dni;
      const d = cpLocProv(cond.cpLocProv);
      if (d.cp) { nuevo.cp_asegurado = d.cp; nuevo.localidad_asegurado = d.localidad; if (d.provincia) nuevo.provincia_asegurado = d.provincia; }
      if (!nuevo.domicilio_asegurado && cond.calle) nuevo.domicilio_asegurado = limpiar(`${cond.calle} ${cond.numero || ""}`);
    }
  }
  // Las notas se suman a las observaciones que ya hay (sin repetir)
  const previas = String(caso.observaciones_siniestro || "");
  const sumar = notas.filter(n => !previas.includes(n));
  if (sumar.length) nuevo.observaciones_siniestro = [previas.trim(), ...sumar].filter(Boolean).join("\n");

  for (const k of TELEFONOS) if (nuevo[k]) nuevo[k] = telefono(nuevo[k]);
  return ORDEN.filter(k => nuevo[k] && comparable(k, nuevo[k]) !== comparable(k, caso[k]))
    .map(k => ({ k, etiqueta: ETIQUETAS[k], actual: caso[k] ? mostrar(k, String(caso[k])) : "", nuevo: String(nuevo[k]), ver: mostrar(k, String(nuevo[k])),
      marcado: !caso[k] || k === "observaciones_siniestro" }));
}
