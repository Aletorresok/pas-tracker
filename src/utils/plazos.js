// Motor de plazos procesales. Funciones puras: reciben el calendario judicial
// ({ feriados: Set de "YYYY-MM-DD", inhabiles: Map "YYYY-MM-DD" → ["todas" | "CABA" | "PBA" | "Federal"] })
// y trabajan con fechas ISO. El calendario lo arma utils/calendarioJudicial.js.

export const COMPUTOS = [
  { k: "habiles", l: "Días hábiles judiciales" },
  { k: "corridos", l: "Días corridos" },
];

export const CLASES_PLAZO = [
  { k: "fatal", l: "Fatal", desc: "Improrrogable" },
  { k: "ordinatorio", l: "Ordinatorio", desc: "Se puede prorrogar" },
  { k: "propio", l: "Propio", desc: "Recordatorio tuyo, sin efecto procesal" },
];

// Plazo de gracia: el escrito se puede presentar el día hábil siguiente al vencimiento,
// dentro de las primeras horas del despacho (Nación y CABA: 2; Provincia de Buenos Aires: 4).
const HORAS_GRACIA = { PBA: 4 };

export const CALENDARIO_VACIO = { feriados: new Set(), inhabiles: new Map() };

// ── Fechas ISO sin husos horarios ─────────────────────────────────────────────
const aFecha = iso => { const [a, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(a, m - 1, d)); };
const aISO = f => f.toISOString().slice(0, 10);
export const sumarDiasISO = (iso, n) => { const f = aFecha(iso); f.setUTCDate(f.getUTCDate() + n); return aISO(f); };

// Por qué un día no es hábil: null si es hábil
export function motivoInhabil(iso, cal = CALENDARIO_VACIO, jurisdiccion = null) {
  const dia = aFecha(iso).getUTCDay();
  if (dia === 0 || dia === 6) return "fin de semana";
  if (cal.feriados.has(iso)) return "feriado";
  const juris = cal.inhabiles.get(iso);
  if (juris && (juris.includes("todas") || (jurisdiccion && juris.includes(jurisdiccion)))) return "inhábil";
  return null;
}

export const esHabil = (iso, cal, jurisdiccion) => motivoInhabil(iso, cal, jurisdiccion) === null;

export function proximoHabil(iso, cal, jurisdiccion) {
  let f = iso;
  while (!esHabil(f, cal, jurisdiccion)) f = sumarDiasISO(f, 1);
  return f;
}

// Vencimiento: los días se cuentan desde el día siguiente a la notificación.
// Hábiles: solo cuentan los días hábiles. Corridos: cuentan todos, y si el último cae en
// un día inhábil pasa al primer hábil siguiente.
export function calcularVencimiento({ desde, dias, computo = "habiles", jurisdiccion = null }, cal = CALENDARIO_VACIO) {
  const n = Number(dias);
  if (!desde || !(n > 0)) return null;
  if (computo === "corridos") return proximoHabil(sumarDiasISO(desde, n), cal, jurisdiccion);
  let f = desde, contados = 0;
  while (contados < n) {
    f = sumarDiasISO(f, 1);
    if (esHabil(f, cal, jurisdiccion)) contados++;
  }
  return f;
}

// Días entre semana que no se contaron por feriado o inhábil (para explicar el cálculo)
export function diasSalteados(desde, vence, cal = CALENDARIO_VACIO, jurisdiccion = null) {
  if (!desde || !vence) return [];
  const salteados = [];
  for (let f = sumarDiasISO(desde, 1); f <= vence; f = sumarDiasISO(f, 1)) {
    const motivo = motivoInhabil(f, cal, jurisdiccion);
    if (motivo && motivo !== "fin de semana") salteados.push({ fecha: f, motivo });
  }
  return salteados;
}

// Día y horas del plazo de gracia
export function plazoDeGracia(vence, cal = CALENDARIO_VACIO, jurisdiccion = null) {
  if (!vence) return null;
  return { fecha: proximoHabil(sumarDiasISO(vence, 1), cal, jurisdiccion), horas: HORAS_GRACIA[jurisdiccion] || 2 };
}

// Días hábiles que faltan desde hoy hasta el vencimiento (0 = vence hoy; negativo = vencido)
export function habilesHasta(vence, hoy, cal = CALENDARIO_VACIO, jurisdiccion = null) {
  if (!vence || !hoy) return null;
  if (vence === hoy) return 0;
  const signo = vence > hoy ? 1 : -1;
  let n = 0;
  for (let f = hoy; f !== vence; f = sumarDiasISO(f, signo)) {
    const sig = sumarDiasISO(f, signo);
    if (esHabil(signo > 0 ? sig : f, cal, jurisdiccion)) n++;
  }
  // Vencido un viernes y hoy es sábado: ya está vencido aunque no haya pasado un día hábil
  return signo > 0 ? n : -Math.max(1, n);
}

// Texto y nivel del chip de un plazo, en días hábiles
export function describirPlazoHabil(vence, hoy, cal = CALENDARIO_VACIO, jurisdiccion = null) {
  const n = habilesHasta(vence, hoy, cal, jurisdiccion);
  if (n === null) return null;
  if (n < 0) return { dias: n, texto: `Vencido hace ${-n} d háb.`, nivel: "vencido" };
  if (n === 0) return { dias: n, texto: "Vence hoy", nivel: "hoy" };
  if (n === 1) return { dias: n, texto: "1 día háb.", nivel: "pronto" };
  if (n <= 3) return { dias: n, texto: `${n} días háb.`, nivel: "pronto" };
  return { dias: n, texto: `${n} días háb.`, nivel: "tranquilo" };
}
