// ── RESULTADOS DE CONTACTO ────────────────────────────────────────────────────────
export const RESULTADOS_CONTACTO = [
  { key: "respondio_positivo", label: "Respondió positivo", color: "#3A9163" },
  { key: "respondio_negativo", label: "Respondió negativo", color: "#B9503F" },
  { key: "respondio_neutro",   label: "Respondió neutro",   color: "#B8952A" },
  { key: "no_respondio",       label: "No respondió",       color: "#8F8E89" },
  { key: "numero_incorrecto",  label: "Número incorrecto",  color: "#C77B3A" },
  { key: "volver_contactar",   label: "Volver a contactar", color: "#4F84B8" },
];

// ── ESTADOS DE CASO ───────────────────────────────────────────────────────────────
// Fuente única para la app, el portal PAS y la vista del cliente.
// Colores en orden de avance: fríos (arranque) → cálidos (negociación) → verde (cobrado).
// Tonos medios elegidos para leerse bien en modo claro y oscuro.
export const ESTADOS_CASO = [
  { key: "doc_pendiente",    label: "Doc. pendiente",    color: "#8E82BF", emoji: "", etapa: 1 },
  { key: "iniciado",         label: "Iniciado",          color: "#7A879C", emoji: "", etapa: 2 },
  { key: "reclamado",        label: "Reclamado",         color: "#4F84B8", emoji: "", etapa: 3 },
  { key: "con_ofrecimiento", label: "Con ofrecimiento",  color: "#C77B3A", emoji: "", etapa: 4 },
  { key: "en_mediacion",     label: "En mediación",      color: "#B8952A", emoji: "", etapa: 5 },
  { key: "en_juicio",        label: "En juicio",         color: "#B9503F", emoji: "", etapa: 5 },
  { key: "esperando_pago",   label: "Esperando pago",    color: "#3A8E94", emoji: "", etapa: 6 },
  { key: "cobrado",          label: "Cobrado",           color: "#3A9163", emoji: "", etapa: 7 },
  { key: "desistido",        label: "Desistido",         color: "#8F8E89", emoji: "", etapa: 0 },
];

export const estadoInfo = key => ESTADOS_CASO.find(e => e.key === key) || { key, label: key || "—", color: "#7A879C", emoji: "", etapa: 0 };

// ── TIPOS DE DOCUMENTOS (CasoDetalle) ─────────────────────────────────────────────
export const TIPOS_DOC = ["DNI", "CEDULA", "DENUNCIA", "CERTIFICADO", "LICENCIA", "PRESUPUESTO", "ESCRITO", "FOTO"];

export const EXTENSIONES_VALIDAS = [".jpg", ".jpeg", ".png", ".pdf"];

export const ESTADOS_HONORARIOS = ["NO_FACTURADO", "FACTURADO", "COBRADO"];

// ── VISTAS DE CONTACTOS ───────────────────────────────────────────────────────────
export const VISTAS_C = [
  { key: "todos", label: "Todos", color: "var(--accent)" },
  { key: "agendado", label: "Con teléfono", color: "var(--accent)" },
  { key: "multi", label: "Varios teléfonos", color: "var(--accent)" },
  { key: "sin_tel", label: "Sin teléfono", color: "var(--accent)" },
];