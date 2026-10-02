// Carta documento para imprimir sobre el formulario preimpreso de Correo Argentino (oficio, 8,5 × 14").
// Solo se imprime el texto, en las posiciones del formulario (tomadas de un PDF de ejemplo que calza).
// Unidades: puntos; y = línea base desde arriba. Helvetica 10 (8 en localidad y provincia), sin achicar.

export const PAGINA = [612, 1008];
const MM = 72 / 25.4;
const COPIA_2 = 266.46; // la segunda mitad del formulario repite remitente y destinatario más abajo

// x, y (línea base) y ancho máximo de cada campo en la primera copia (medidos sobre el PDF de ejemplo)
const CAMPOS = {
  rem: {
    nombre1: { x: 116.22, y: 93.71, ancho: 190, t: 10, negrita: true },
    nombre2: { x: 73.7, y: 116.39, ancho: 232, t: 10, negrita: true },
    domicilio: { x: 110.55, y: 144.73, ancho: 195, t: 10 },
    cp: { x: 79.37, y: 167.41, ancho: 50, t: 10 },
    localidad: { x: 153.07, y: 166.81, ancho: 78, t: 8 },
    provincia: { x: 235.28, y: 166.81, ancho: 72, t: 8 },
  },
  dest: {
    nombre1: { x: 357.17, y: 93.71, ancho: 193, t: 10, negrita: true },
    nombre2: { x: 314.65, y: 116.39, ancho: 235, t: 10, negrita: true },
    domicilio: { x: 351.5, y: 144.73, ancho: 198, t: 10 },
    cp: { x: 320.32, y: 167.41, ancho: 55, t: 10, x2: 323.15 },
    localidad: { x: 388.35, y: 166.81, ancho: 84, t: 8 },
    provincia: { x: 476.22, y: 166.81, ancho: 74, t: 8 },
  },
};
const FECHA = { derecha: 549.9, y: 462.21 };
const CUERPO = { x: 45.35, ancho: 504.55, y: 490.56, interlineado: 11.34 };
export const LINEAS_MAXIMAS = 15; // después viene la firma
const FIRMA = { centro: 425.18, y: 677.65, y2: 691.82 };

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const fechaCarta = (lugar, iso) => {
  const [a, m, d] = iso.split("-").map(Number);
  const mes = MESES[m - 1];
  return `${lugar ? `${lugar}, ` : ""}${d} de ${mes.charAt(0).toUpperCase() + mes.slice(1)} de ${a}`;
};

// Escribe en tamaño fijo (como preimpresos.com). Devuelve false si no entra en el campo.
function escribir(doc, texto, { x, y, ancho, t, negrita }) {
  if (!texto) return true;
  doc.setFont("helvetica", negrita ? "bold" : "normal");
  doc.setFontSize(t);
  doc.text(texto, x, y);
  return doc.getTextWidth(texto) <= ancho + 0.5;
}

// Palabras antes de las que conviene cortar una razón social: "PROVIDENCIA / COMPAÑÍA ARGENTINA DE SEGUROS"
const CORTES = /^(COMPAÑ[IÍ]A|COOPERATIVA|SOCIEDAD|MUTUAL|ASEGURADORA|ASEGURADORES|SEGUROS|ART|S\.?A\.?|S\.?R\.?L\.?)$/;

// El nombre va en dos renglones. Con "|" se elige el corte a mano; si no, entra todo en el primero,
// o se corta antes de "Compañía", "Cooperativa", etc., o lo que entre en el primero y el resto en el segundo.
function partirNombre(doc, nombre, campo1, campo2) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(campo1.t);
  const limpio = (nombre || "").trim();
  if (limpio.includes("|")) {
    const i = limpio.indexOf("|");
    return [limpio.slice(0, i).trim(), limpio.slice(i + 1).replace(/\|/g, " ").trim()];
  }
  const palabras = limpio.split(/\s+/).filter(Boolean);
  const entra = (ps, c) => doc.getTextWidth(ps.join(" ")) <= c.ancho;
  if (entra(palabras, campo1)) return [palabras.join(" "), ""];
  for (let k = 1; k < palabras.length; k++) {
    if (CORTES.test(palabras[k]) && entra(palabras.slice(0, k), campo1) && entra(palabras.slice(k), campo2))
      return [palabras.slice(0, k).join(" "), palabras.slice(k).join(" ")];
  }
  let k = 0;
  while (k < palabras.length && entra(palabras.slice(0, k + 1), campo1)) k++;
  return [palabras.slice(0, k).join(" "), palabras.slice(k).join(" ")];
}

// Justifica repartiendo el sobrante entre todos los espacios (lo mismo que hace preimpresos con Tw),
// así los tres espacios que separan las ideas se mantienen
function renglonJustificado(doc, linea, x, y, ancho) {
  const partes = linea.split(" ");
  if (partes.length < 2) { doc.text(linea, x, y); return; }
  const extra = (ancho - doc.getTextWidth(linea)) / (partes.length - 1);
  const espacio = doc.getTextWidth(" ");
  let cx = x;
  for (const p of partes) {
    if (p) doc.text(p, cx, y);
    cx += doc.getTextWidth(p) + espacio + extra;
  }
}

// Corta en renglones por los espacios, respetando los espacios múltiples dentro del renglón
function partirRenglones(doc, texto, ancho) {
  const lineas = [];
  let linea = "";
  for (const palabra of texto.split(" ")) {
    if (!linea && !palabra) continue; // espacios al empezar un renglón
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (!linea || doc.getTextWidth(prueba) <= ancho) { linea = prueba; continue; }
    lineas.push(linea.trimEnd());
    linea = palabra;
  }
  if (linea.trim()) lineas.push(linea.trimEnd());
  return lineas;
}

// Renglones del cuerpo. Como en las cartas de preimpresos, el texto va en un solo bloque justificado y
// cada punto y aparte se escribe como tres espacios. Con parrafos: true, cada párrafo empieza renglón.
export function renglonesCuerpo(doc, texto, { parrafos = false } = {}) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const partes = String(texto || "").split(/\n+/).map(p => p.trim().replace(/[ \t]+/g, " ")).filter(Boolean);
  const bloques = parrafos ? partes : (partes.length ? [partes.join("   ")] : []);
  const renglones = [];
  for (const bloque of bloques) {
    const lineas = partirRenglones(doc, bloque, CUERPO.ancho);
    lineas.forEach((l, i) => renglones.push({ texto: l, ultimo: i === lineas.length - 1 }));
  }
  return renglones;
}

// datos: { remitente: { nombre, domicilio, cp, localidad, provincia }, destinatario: {...}, fecha, cuerpo,
//          firma: [renglón1, renglón2] }, opciones: { corrimientoX, corrimientoY (mm), referencias, parrafos }
// Devuelve también los campos que no entran (excedidos), para avisar en vez de achicar la letra.
export async function generarCarta(datos, { corrimientoX = 0, corrimientoY = 0, referencias = false, parrafos = false } = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: PAGINA });
  const dx = corrimientoX * MM, dy = corrimientoY * MM;
  const en = (c, extraY = 0, x2) => ({ ...c, x: (x2 ?? c.x) + dx, y: c.y + dy + extraY });

  if (referencias) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(150);
    for (const extra of [0, COPIA_2]) {
      doc.text("REMITENTE", 74 + dx, 80 + dy + extra);
      doc.text("DESTINATARIO", 315 + dx, 80 + dy + extra);
    }
    doc.text("TEXTO", CUERPO.x + dx, CUERPO.y - 12 + dy);
    doc.setTextColor(0);
  }

  const excedidos = new Set();
  for (const [clave, persona, quien] of [["rem", datos.remitente, "remitente"], ["dest", datos.destinatario, "destinatario"]]) {
    const c = CAMPOS[clave];
    const [n1, n2] = partirNombre(doc, (persona.nombre || "").toUpperCase(), c.nombre1, c.nombre2);
    const campos = [["nombre", n1, "nombre1"], ["nombre", n2, "nombre2"], ["domicilio", persona.domicilio, "domicilio"],
      ["CP", persona.cp, "cp"], ["localidad", persona.localidad, "localidad"], ["provincia", persona.provincia, "provincia"]];
    for (const extra of [0, COPIA_2]) {
      for (const [nombre, texto, k] of campos) {
        const x2 = k === "cp" && extra ? c.cp.x2 : undefined;
        if (!escribir(doc, texto, en(c[k], extra, x2))) excedidos.add(`${nombre} del ${quien}`);
      }
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (datos.fecha) doc.text(datos.fecha, FECHA.derecha + dx, FECHA.y + dy, { align: "right" });

  const renglones = renglonesCuerpo(doc, datos.cuerpo, { parrafos });
  renglones.forEach((r, i) => {
    const y = CUERPO.y + dy + i * CUERPO.interlineado;
    if (r.ultimo) doc.text(r.texto, CUERPO.x + dx, y);
    else renglonJustificado(doc, r.texto, CUERPO.x + dx, y, CUERPO.ancho);
  });

  const [f1, f2] = datos.firma || [];
  if (f1) doc.text(f1, FIRMA.centro + dx, FIRMA.y + dy, { align: "center" });
  if (f2) doc.text(f2, FIRMA.centro + dx, FIRMA.y2 + dy, { align: "center" });

  return { bytes: new Uint8Array(doc.output("arraybuffer")), renglones: renglones.length, excedidos: [...excedidos] };
}

// ── Modelos de texto ───────────────────────────────────────────────────────
// {marcas} que se completan con los datos del caso; si falta el dato queda [marca] para completar a mano.
export const MODELOS_BASE = [
  {
    id: "intimacion-pago",
    titulo: "Intimación de pago (acuerdo incumplido)",
    texto: "Me dirijo a Uds. en relación al Siniestro N° {siniestro} (vehículo {vehiculo}, dominio {patente}, ocurrido el {fecha_siniestro}). Habiéndose acordado el pago de la suma de $[monto], a la fecha no se ha efectivizado. Por la presente los INTIMO a que en el plazo perentorio e improrrogable de tres (3) días hábiles de recibida la presente abonen la suma acordada, con más sus intereses, bajo apercibimiento de iniciar las acciones judiciales correspondientes y de efectuar la denuncia ante la Superintendencia de Seguros de la Nación, con costas a su cargo. Quedan Uds. debidamente notificados.",
  },
  {
    id: "reclamo-tercero",
    titulo: "Reclamo de tercero damnificado",
    texto: "Me dirijo a Uds. a fin de formular formal reclamo por los daños sufridos en el vehículo dominio {patente} con motivo del siniestro ocurrido el {fecha_siniestro}, del que resultó responsable el conductor del vehículo asegurado por esa compañía. Solicito se sirvan informar el número de siniestro asignado y abonar los daños reclamados dentro del plazo legal, poniendo a su disposición la documentación respaldatoria. Bajo apercibimiento de iniciar las acciones legales pertinentes, con costas. Quedan Uds. debidamente notificados.",
  },
  {
    id: "art-56",
    titulo: "Asegurado: falta de pronunciamiento (art. 56 Ley 17.418)",
    texto: "Me dirijo a Uds. como asegurado en relación al Siniestro N° {siniestro} (dominio {patente}, ocurrido el {fecha_siniestro}). Habiendo transcurrido holgadamente el plazo de treinta (30) días previsto por el art. 56 de la Ley 17.418 sin que se hayan pronunciado sobre mi derecho, su silencio importa aceptación. En consecuencia, los INTIMO a abonar la indemnización correspondiente en el plazo de tres (3) días hábiles de recibida la presente, bajo apercibimiento de iniciar las acciones judiciales pertinentes y de efectuar la denuncia ante la Superintendencia de Seguros de la Nación. Quedan Uds. debidamente notificados.",
  },
  { id: "blanco", titulo: "En blanco", texto: "" },
];

const fechaDMA = iso => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");

export function completarModelo(texto, caso) {
  const valores = caso ? {
    siniestro: caso.nro_siniestro, patente: caso.patente, vehiculo: caso.vehiculo,
    fecha_siniestro: fechaDMA(caso.fecha_siniestro), compania: caso.compania_aseguradora, asegurado: caso.asegurado,
  } : {};
  return texto.replace(/\{(\w+)\}/g, (_, k) => (valores[k] ? String(valores[k]).trim() : `[${k.replace("_", " ")}]`));
}
