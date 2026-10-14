// Carpeta local de cada caso o expediente, recordada en este navegador (IndexedDB: guarda el handle del File System Access).
// No sale de la PC ni de Chrome: en otro navegador o dispositivo hay que vincularla de nuevo.
const BD = "atg-carpetas";
const TABLA = "carpetas";

const abrir = () => new Promise((resolver, rechazar) => {
  const pedido = indexedDB.open(BD, 1);
  pedido.onupgradeneeded = () => pedido.result.createObjectStore(TABLA);
  pedido.onsuccess = () => resolver(pedido.result);
  pedido.onerror = () => rechazar(pedido.error);
});

// Corre una operación sobre la tabla; devuelve null si IndexedDB no está disponible (ventana privada, bloqueado)
async function operar(modo, fn) {
  try {
    const bd = await abrir();
    return await new Promise((resolver, rechazar) => {
      const pedido = fn(bd.transaction(TABLA, modo).objectStore(TABLA));
      pedido.onsuccess = () => { bd.close(); resolver(pedido.result ?? null); };
      pedido.onerror = () => { bd.close(); rechazar(pedido.error); };
    });
  } catch (e) {
    console.warn("[carpeta recordada]", e?.message || e);
    return null;
  }
}

const clave = id => String(id);

export const recordarCarpeta = (id, handle) => (id ? operar("readwrite", t => t.put(handle, clave(id))) : null);
export const carpetaRecordada = id => (id ? operar("readonly", t => t.get(clave(id))) : null);
export const olvidarCarpeta = id => (id ? operar("readwrite", t => t.delete(clave(id))) : null);
