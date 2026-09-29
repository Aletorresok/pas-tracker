// Menús de acciones (click derecho) de cada entidad. Una sola definición por entidad:
// un caso muestra las mismas opciones en Hoy, Casos, Clientes y el Tablero.
// Cada pantalla pasa solo las acciones que puede resolver; las que faltan no aparecen.
import { linkWhatsApp, linkVistaCliente, clientePuedeEntrar } from "./mensajes.js";
import { primerNombre } from "./formatters.js";
import { abrirCompania } from "./companiaAbierta.js";
import { cuitValido } from "./companias.js";
import { linkFicha } from "./enlaces.js";
import { abrirEscritos } from "./escritoAbierto.js";

export const copiar = texto => navigator.clipboard?.writeText(String(texto)).catch(() => {});
const abrirLink = url => url && window.open(url, "_blank", "noopener");
const whatsapp = (tel, nombre, label = "WhatsApp") =>
  tel && linkWhatsApp(tel, "") && { label, onClick: () => abrirLink(linkWhatsApp(tel, `Hola ${primerNombre(nombre)}, `)) };

// "Mover a": alternativa al arrastre en los tableros (sirve con teclado y en el celular)
const moverA = (actual, estados, mover) => mover ? [
  { separador: true }, { titulo: "Mover a" },
  ...estados.filter(e => e.key !== actual).map(e => ({ label: e.label, onClick: () => mover(e.key) })),
] : [];

// ── Caso PAS ────────────────────────────────────────────────────
// acciones: { abrir, resumen: { label, onClick }, nuevaAccion, eliminar, mover: { estados, onMover } }
export function itemsCaso(c, { abrir, resumen, eliminar, mover, extra = [] } = {}) {
  const tel = c.telefono_asegurado;
  return [
    abrir && { label: "Abrir ficha", onClick: () => abrir(c) },
    resumen && { label: resumen.label, onClick: resumen.onClick },
    ...extra,
    c.id && { label: "Generar escrito…", onClick: () => abrirEscritos({ caso: c, pasId: c._pasId ?? c.pas_id }) },
    c.compania_aseguradora && { label: `Ver compañía (${c.compania_aseguradora})`, onClick: () => abrirCompania(c.compania_aseguradora) },
    whatsapp(tel, c.asegurado, "WhatsApp al cliente"),
    clientePuedeEntrar(c) && { label: "Copiar link de la vista del cliente", onClick: () => copiar(linkVistaCliente(c.patente)) },
    ...moverA(c.estado, mover?.estados || [], mover && (estado => mover.onMover(c, estado))),
    { separador: true },
    c.id && { label: "Copiar link de la ficha", onClick: () => copiar(linkFicha("caso", c.id)) },
    c.patente && { label: `Copiar patente (${c.patente})`, onClick: () => copiar(c.patente) },
    c.nro_siniestro && { label: "Copiar N° de siniestro", onClick: () => copiar(c.nro_siniestro) },
    tel && { label: "Copiar teléfono del cliente", onClick: () => copiar(tel) },
    eliminar && { separador: true },
    eliminar && { label: "Eliminar caso", peligro: true, onClick: () => eliminar(c) },
  ];
}

// ── Expediente ──────────────────────────────────────────────────
export function itemsExpediente(e, { abrir, mover } = {}) {
  return [
    abrir && { label: "Abrir ficha", onClick: () => abrir(e) },
    e.id && { label: "Generar escrito…", onClick: () => abrirEscritos({ expediente: e }) },
    whatsapp(e.cliente_telefono, e.cliente_nombre, "WhatsApp al cliente"),
    ...moverA(e.estado, mover?.estados || [], mover && (estado => mover.onMover(e, estado))),
    { separador: true },
    e.id && { label: "Copiar link de la ficha", onClick: () => copiar(linkFicha("expediente", e.id)) },
    e.caratula && { label: "Copiar carátula", onClick: () => copiar(e.caratula) },
    e.numero && { label: `Copiar N° de expediente (${e.numero})`, onClick: () => copiar(e.numero) },
    e.visible_cliente && e.codigo_cliente && { label: "Copiar código del cliente", onClick: () => copiar(e.codigo_cliente) },
    e.cliente_telefono && { label: "Copiar teléfono del cliente", onClick: () => copiar(e.cliente_telefono) },
  ];
}

// ── PAS (contacto o cliente derivador) ──────────────────────────
// acciones: { abrir, contactar, mail, nuevoCaso, resumen, editar, derivador: { activo, onToggle }, descartado: { activo, onToggle } }
export function itemsPAS(p, { abrir, contactar, mail, nuevoCaso, resumen, editar, derivador, descartado } = {}) {
  const tel = (p.telefonos || [])[0] || p.telefono;
  return [
    abrir && { label: abrir.label || "Ver detalle", onClick: abrir.onClick },
    nuevoCaso && { label: "Nuevo caso", onClick: () => nuevoCaso(p) },
    contactar && !descartado?.activo && { label: "Registrar contacto", onClick: () => contactar(p) },
    whatsapp(tel, p.nombre),
    mail && p.mail && { label: "Mail de presentación", onClick: () => mail(p) },
    resumen && { label: "Resumen del mes", onClick: () => resumen(p) },
    editar && { label: "Editar PAS", onClick: () => editar(p) },
    (derivador || descartado) && { separador: true },
    derivador && { label: derivador.activo ? "Quitar de derivadores" : "Marcar como derivador", onClick: () => derivador.onToggle(p.id) },
    descartado && { label: descartado.activo ? "Recuperar" : "Descartar", onClick: () => descartado.onToggle(p.id) },
    { separador: true },
    tel && { label: "Copiar teléfono", onClick: () => copiar(tel) },
    p.mail && { label: "Copiar mail", onClick: () => copiar(p.mail) },
  ];
}

// ── Compañía ────────────────────────────────────────────────────
export function itemsCompania(nombre, ficha = {}, contactos = []) {
  const conMail = [ficha.mail && { label: "general", mail: ficha.mail }, ...contactos.filter(c => c.mail).map(c => ({ label: c.nombre || c.tipo, mail: c.mail }))].filter(Boolean);
  return [
    { label: "Abrir ficha", onClick: () => abrirCompania(nombre) },
    ...conMail.slice(0, 3).map(m => ({ label: `Mail a ${m.label}`, onClick: () => window.open(`mailto:${m.mail}`) })),
    { separador: true },
    ficha.razon_social && { label: "Copiar razón social", onClick: () => copiar(ficha.razon_social) },
    ficha.cuit && { label: `Copiar CUIT${cuitValido(ficha.cuit) === false ? " (revisar)" : ""}`, onClick: () => copiar(ficha.cuit) },
    ficha.mail && { label: "Copiar mail general", onClick: () => copiar(ficha.mail) },
    ficha.telefono && { label: "Copiar teléfono general", onClick: () => copiar(ficha.telefono) },
  ];
}
