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
