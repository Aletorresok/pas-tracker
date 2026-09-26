// "¿Quién tiene la pelota?": de quién depende que el caso avance, y cuántos días la tuvo cada uno.
// Se decide por el estado; una próxima acción vencida la pasa a vos. Mediación y juicio van aparte
// (dependen de un mediador o un juzgado). Funciones puras.
import { fechaLocalISO } from "./formatters.js";

export const QUIEN = [
  { k: "vos", l: "Te toca a vos", corto: "Vos" },
  { k: "cliente", l: "Esperando al cliente", corto: "Cliente" },
  { k: "compania", l: "Esperando a la compañía", corto: "Compañía" },
  { k: "terceros", l: "Mediación o juicio", corto: "Mediación / juicio" },
];
export const quienLabel = k => QUIEN.find(q => q.k === k)?.l || "";

export const QUIEN_POR_ESTADO = {
  doc_pendiente: "cliente",
  iniciado: "vos",
  reclamado: "compania",
  con_ofrecimiento: "vos",
  en_mediacion: "terceros",
  en_juicio: "terceros",
  esperando_pago: "compania",
};

const CERRADOS = ["cobrado", "desistido"];
// Desde este día cada cambio de estado queda en la bitácora
const INICIO_REGISTRO = "2026-09-25";

// Quién tiene hoy la pelota en un caso en curso (null si está cerrado)
export function quienTiene(c, hoy = fechaLocalISO()) {
  if (CERRADOS.includes(c.estado)) return null;
  const vencida = String(c.proxima_accion || "").trim() && c.proxima_accion_vence && String(c.proxima_accion_vence).slice(0, 10) < hoy;
  return vencida ? "vos" : QUIEN_POR_ESTADO[c.estado] || "vos";
}

const dias = (a, b) => Math.max(0, Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000));

// Días que tuvo la pelota cada uno, con los cambios de estado registrados en la bitácora
// (cambios = { casoId: [{ de, a, fecha }] }, de analisis.cambiosDeEstado). Desde el primer cambio registrado
// de cada caso (desde la derivación) hasta hoy (o hasta que se cerró). Devuelve { casos, promedio: { vos, cliente, ... }, porCaso }.
export function tiempoPorQuien(allCasos, cambios, hoy = fechaLocalISO()) {
  const porCaso = [];
  allCasos.forEach(c => {
    const lista = cambios[c.id];
    if (!lista?.length) return;
    const suma = { vos: 0, cliente: 0, compania: 0, terceros: 0 };
    // Antes del primer cambio registrado: desde la derivación, en el estado del que salió. Solo si es seguro que
    // estuvo en ese estado todo ese tiempo: salía del estado inicial, o el caso es posterior al inicio del registro.
    const inicio = String(c.fecha_derivacion || "").slice(0, 10);
    const antes = QUIEN_POR_ESTADO[lista[0].de];
    const seguro = lista[0].de === "doc_pendiente" || inicio >= INICIO_REGISTRO;
    if (inicio && antes && seguro && inicio < lista[0].fecha) suma[antes] += dias(inicio, lista[0].fecha);
    lista.forEach((t, i) => {
      const hasta = i + 1 < lista.length ? lista[i + 1].fecha : (CERRADOS.includes(t.a) ? t.fecha : hoy);
      const quien = QUIEN_POR_ESTADO[t.a];
      if (quien) suma[quien] += dias(t.fecha, hasta);
    });
    porCaso.push({ caso: c, ...suma });
  });
  const n = porCaso.length;
  const promedio = Object.fromEntries(QUIEN.map(q => [q.k, n ? Math.round(porCaso.reduce((s, x) => s + x[q.k], 0) / n) : null]));
  return { casos: n, promedio, porCaso };
}
