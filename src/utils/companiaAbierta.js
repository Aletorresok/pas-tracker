// Qué ficha de compañía está abierta. Cualquier pantalla la abre con abrirCompania("Sancor Seguros");
// la muestra CompaniaHost (montado una vez en App).
let abierta = null;
const oyentes = new Set();
const emitir = () => oyentes.forEach(f => f());

export const abrirCompania = nombre => { abierta = nombre ? { nombre } : { nueva: true }; emitir(); };
export const cerrarCompania = () => { abierta = null; emitir(); };
export const suscribirCompania = f => { oyentes.add(f); return () => oyentes.delete(f); };
export const companiaAbierta = () => abierta;
