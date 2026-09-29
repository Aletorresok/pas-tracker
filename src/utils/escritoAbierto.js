// Qué "Generar escrito" está abierto. Cualquier pantalla lo abre con abrirEscritos({ caso, pasId }) o
// abrirEscritos({ expediente }); lo muestra EscritosHost (montado una vez en App), como la ficha de compañía.
// Desde una ficha se pasan además:
//   dirHandle          carpeta vinculada del caso → "Guardar PDF" guarda directo ahí
//   onDni(dni)         si se completa el DNI que faltaba, la ficha lo guarda
//   onGuardadoEnCarpeta() para que la ficha recargue la lista de archivos
//   onReclamoViejo()   si falta el SQL 32, abre el reclamo de siempre
let abierto = null;
const oyentes = new Set();
const emitir = () => oyentes.forEach(f => f());

export const abrirEscritos = opciones => { abierto = { ...opciones, t: Date.now() }; emitir(); };
export const cerrarEscritos = () => { abierto = null; emitir(); };
export const suscribirEscritos = f => { oyentes.add(f); return () => oyentes.delete(f); };
export const escritosAbierto = () => abierto;
