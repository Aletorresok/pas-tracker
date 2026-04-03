// ── RESULTADOS DE CONTACTO ────────────────────────────────────────────────────────
export const RESULTADOS_CONTACTO = [
  { key: "respondio_positivo", label: "Respondió positivo 🟢", color: "#22c55e" },
  { key: "respondio_negativo", label: "Respondió negativo 🔴", color: "#ef4444" },
  { key: "respondio_neutro",   label: "Respondió neutro 🟡",   color: "#eab308" },
  { key: "no_respondio",       label: "No respondió ⬜",        color: "#94a3b8" },
  { key: "numero_incorrecto",  label: "Número incorrecto ❌",   color: "#f97316" },
  { key: "volver_contactar",   label: "Volver a contactar 🔁", color: "#6366f1" },
];

// ── ESTADOS DE CASO ───────────────────────────────────────────────────────────────
export const ESTADOS_CASO = [
  { key: "doc_pendiente",     label: "Doc. pendiente",    color: "#a855f7", emoji: "📎" },
  { key: "iniciado",          label: "Iniciado",          color: "#64748b", emoji: "📋" },
  { key: "reclamado",         label: "Reclamado",         color: "#6366f1", emoji: "📨" },
  { key: "con_ofrecimiento",  label: "Con ofrecimiento",  color: "#f97316", emoji: "💬" },
  { key: "en_mediacion",      label: "En mediación",      color: "#eab308", emoji: "⚖️"  },
  { key: "en_juicio",         label: "En juicio",         color: "#ef4444", emoji: "🏛️"  },
  { key: "esperando_pago",    label: "Esperando pago",    color: "#06b6d4", emoji: "🕐" },
  { key: "cobrado",           label: "Cobrado",           color: "#22c55e", emoji: "✅" },
];

// ── TIPOS DE DOCUMENTOS (CasoDetalle) ─────────────────────────────────────────────
export const TIPOS_DOC = ["DNI", "CEDULA", "DENUNCIA", "CERTIFICADO", "LICENCIA", "PRESUPUESTO", "ESCRITO", "FOTO"];

export const EXTENSIONES_VALIDAS = [".jpg", ".jpeg", ".png", ".pdf"];

export const ESTADOS_HONORARIOS = ["NO_FACTURADO", "FACTURADO", "COBRADO"];

// ── VISTAS DE CONTACTOS ───────────────────────────────────────────────────────────
export const VISTAS_C = [
  { key: "todos", label: "Todos" },
  { key: "agendado", label: "📌 Agendado" },
  { key: "multi", label: "📞 Multi" },
  { key: "sin_tel", label: "⚠️ Sin tel" },
];