// ── ESTADOS DE CASO ───────────────────────────────────────────────────────────────
// Fuente única para la app, el portal PAS y la vista del cliente.
// Colores en orden de avance: fríos (arranque) → cálidos (negociación) → verde (cobrado).
// Son tokens (--e-<estado> en index.css, con variante clara y oscura). En el código se usan con var() o alpha(); no se concatenan con hex.
export const ESTADOS_CASO = [
  { key: "doc_pendiente",    label: "Doc. pendiente",    color: "var(--e-doc_pendiente)", emoji: "", etapa: 1 },
  { key: "iniciado",         label: "Iniciado",          color: "var(--e-iniciado)", emoji: "", etapa: 2 },
  { key: "reclamado",        label: "Reclamado",         color: "var(--e-reclamado)", emoji: "", etapa: 3 },
  { key: "con_ofrecimiento", label: "Con ofrecimiento",  color: "var(--e-con_ofrecimiento)", emoji: "", etapa: 4 },
  { key: "en_mediacion",     label: "En mediación",      color: "var(--e-en_mediacion)", emoji: "", etapa: 5 },
  { key: "en_juicio",        label: "En juicio",         color: "var(--e-en_juicio)", emoji: "", etapa: 5 },
  { key: "esperando_pago",   label: "Esperando pago",    color: "var(--e-esperando_pago)", emoji: "", etapa: 6 },
  { key: "cobrado",          label: "Cobrado",           color: "var(--e-cobrado)", emoji: "", etapa: 7 },
  { key: "desistido",        label: "Desistido",         color: "var(--e-desistido)", emoji: "", etapa: 0 },
];

export const estadoInfo = key => ESTADOS_CASO.find(e => e.key === key) || { key, label: key || "—", color: "var(--muted)", emoji: "", etapa: 0 };

// ── TIPOS DE DOCUMENTOS ───────────────────────────────────────────────────────────
// Checklist de la ficha y categorías de la carpeta local (DNI_1.jpg, FOTOS_2.jpg…). El orden es el que se muestra.
export const TIPOS_DOC = ["DNI", "LICENCIA", "CEDULA", "FOTOS", "ESCRITO", "DENUNCIA", "CERTIFICADO", "PRESUPUESTO", "INFO TERCERO"];
// Mínimos para considerar el caso listo para iniciar el reclamo
export const DOCS_REQUERIDOS_RECLAMO = ["DNI", "DENUNCIA", "CERTIFICADO", "PRESUPUESTO"];


export const ESTADOS_HONORARIOS = ["NO_FACTURADO", "FACTURADO", "COBRADO"];

// ── VISTAS DE CONTACTOS ───────────────────────────────────────────────────────────
export const VISTAS_C = [
  { key: "todos", label: "Todos", color: "var(--accent)" },
  { key: "agendado", label: "Con teléfono", color: "var(--accent)" },
  { key: "multi", label: "Varios teléfonos", color: "var(--accent)" },
  { key: "sin_tel", label: "Sin teléfono", color: "var(--accent)" },
];
// ── OFRECIMIENTOS Y TIPO DE RECLAMO (SQL 45) ─────────────────────────────────────
// En qué instancia ofreció la compañía. Por defecto, administrativa.
export const INSTANCIAS = [
  { key: "administrativa", label: "Administrativa" },
  { key: "mediacion", label: "Mediación" },
  { key: "juicio", label: "Juicio" },
];
export const instanciaLabel = k => INSTANCIAS.find(i => i.key === k)?.label || "Administrativa";
// Concurrencia: se ofrece sobre la parte de culpa del tercero. Franquicia: se paga entera, no se negocia.
export const TIPOS_RECLAMO = [
  { key: "culpa_tercero", label: "Culpa del tercero" },
  { key: "concurrencia", label: "Concurrencia" },
  { key: "franquicia", label: "Franquicia" },
];
export const CULPA_CONCURRENCIA = 50; // % a cargo del tercero si no se cargó otro
