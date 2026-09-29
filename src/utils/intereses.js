// Cálculos de actualización e intereses (funciones puras). Fechas en ISO "YYYY-MM-DD".
// Series: [{ fecha, valor }] ordenadas por fecha (ver utils/indices.js).

const aUTC = iso => { const [a, m, d] = iso.split("-").map(Number); return Date.UTC(a, m - 1, d); };
export const diasEntre = (desde, hasta) => Math.round((aUTC(hasta) - aUTC(desde)) / 86400000);
const mes = iso => iso.slice(0, 7);
const mesSiguiente = ym => { const [a, m] = ym.split("-").map(Number); return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`; };

// IPC (INDEC): la actualización entre dos fechas es la relación entre los índices de sus meses,
// o sea, el producto de las variaciones mensuales desde el mes siguiente al inicial hasta el final.
// Si el mes final todavía no se publicó, llega hasta el último publicado (y lo avisa).
export function actualizarIPC(capital, desde, hasta, serie) {
  const porMes = new Map(serie.map(f => [mes(f.fecha), Number(f.valor)]));
  if (!serie.length) return { error: "No hay datos de IPC cargados." };
  const ultimo = mes(serie[serie.length - 1].fecha);
  const inicio = mes(desde);
  let fin = mes(hasta);
  let parcial = false;
  if (fin > ultimo) { fin = ultimo; parcial = true; }
  if (inicio > fin) return { error: `El IPC publicado llega hasta ${ultimo}.` };
  let factor = 1;
  const detalle = [];
  for (let m = mesSiguiente(inicio); m <= fin; m = mesSiguiente(m)) {
    if (!porMes.has(m)) return { error: `Falta el IPC de ${m}.` };
    factor *= 1 + porMes.get(m) / 100;
    detalle.push({ periodo: m, valor: porMes.get(m), factor });
  }
  const total = capital * factor;
  return { factor, total, actualizacion: total - capital, interes: 0, detalle, parcial, hastaDato: fin };
}

// IPC + 3% anual: actualización por IPC y, sobre el capital actualizado, un interés puro del 3% anual simple.
export function actualizarIPCmas3(capital, desde, hasta, serie, tasaAnual = 3) {
  const r = actualizarIPC(capital, desde, hasta, serie);
  if (r.error) return r;
  const dias = diasEntre(desde, hasta);
  const interes = r.total * (tasaAnual / 100) * (dias / 365);
  return { ...r, interes, total: r.total + interes, dias, tasaAnual };
}

// Último valor de la serie con fecha <= iso (el ICL se publica todos los días; por las dudas).
function valorAl(serie, iso) {
  let lo = 0, hi = serie.length - 1, res = null;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (serie[m].fecha <= iso) { res = serie[m]; lo = m + 1; } else hi = m - 1;
  }
  return res;
}

// ICL (BCRA, Ley 27.551): cociente entre el índice de la fecha final y el de la inicial.
export function actualizarICL(capital, desde, hasta, serie) {
  if (!serie.length) return { error: "No hay datos de ICL cargados." };
  const a = valorAl(serie, desde);
  if (!a) return { error: `El ICL cargado empieza el ${serie[0].fecha}.` };
  const ultimo = serie[serie.length - 1];
  const parcial = hasta > ultimo.fecha;
  const b = valorAl(serie, hasta);
  const factor = Number(b.valor) / Number(a.valor);
  const total = capital * factor;
  return { factor, total, actualizacion: total - capital, interes: 0, parcial, hastaDato: b.fecha,
    detalle: [{ periodo: a.fecha, valor: Number(a.valor) }, { periodo: b.fecha, valor: Number(b.valor) }] };
}

// Tasa activa del Banco Nación: interés simple, día por día, con la TNA vigente cada día.
// serie: [{ fecha: desde cuándo rige, valor: TNA en % }].
export function interesTasaActiva(capital, desde, hasta, serie) {
  if (!serie.length) return { error: "No hay tasas del Banco Nación cargadas." };
  if (serie[0].fecha > desde) return { error: `La primera tasa cargada rige desde el ${serie[0].fecha}; falta la anterior.` };
  const detalle = [];
  let interes = 0;
  let i = serie.findLastIndex(f => f.fecha <= desde);
  let tramo = desde;
  while (tramo < hasta) {
    const proxima = serie[i + 1]?.fecha;
    const finTramo = proxima && proxima < hasta ? proxima : hasta;
    const dias = diasEntre(tramo, finTramo);
    const tna = Number(serie[i].valor);
    const monto = capital * (tna / 100) * (dias / 365);
    interes += monto;
    detalle.push({ periodo: tramo, hasta: finTramo, dias, valor: tna, monto });
    tramo = finTramo;
    i++;
  }
  const dias = diasEntre(desde, hasta);
  return { factor: 1 + interes / capital, total: capital + interes, actualizacion: 0, interes, detalle, dias, tasaPromedio: dias ? (interes / capital) * (365 / dias) * 100 : 0 };
}

export const METODOS = [
  { k: "tasa_activa_bna", l: "Tasa activa BNA", serie: "tasa_activa_bna", calcular: interesTasaActiva },
  { k: "ipc", l: "IPC (INDEC)", serie: "ipc", calcular: actualizarIPC },
  { k: "ipc3", l: "IPC + 3% anual", serie: "ipc", calcular: actualizarIPCmas3 },
  { k: "icl", l: "ICL (BCRA)", serie: "icl", calcular: actualizarICL },
];
