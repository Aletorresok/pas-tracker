export const ESTADOS_CASO = [
  { key: "doc_pendiente",    label: "Doc. pendiente",   emoji: "📎", color: "#a855f7" },
  { key: "iniciado",         label: "Iniciado",         emoji: "📋", color: "#64748b" },
  { key: "reclamado",        label: "Reclamado",        emoji: "📨", color: "#3b82f6" },
  { key: "con_ofrecimiento", label: "Ofrecimiento",     emoji: "💬", color: "#f97316" },
  { key: "en_mediacion",     label: "Mediación",        emoji: "🤝", color: "#eab308" },
  { key: "en_juicio",        label: "En juicio",        emoji: "⚖️",  color: "#8b5cf6" },
  { key: "esperando_pago",   label: "Esperando pago",   emoji: "💳", color: "#06b6d4" },
  { key: "cobrado",          label: "Cobrado",          emoji: "✅", color: "#22c55e" },
  { key: "desistido",        label: "Desistido",        emoji: "🚫", color: "#78716c" },
];

export const estadoInfo = k => ESTADOS_CASO.find(e => e.key === k) || ESTADOS_CASO[0];

export const fmtDate = iso => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${String(y).slice(-2)}`;
};

export const fmtMoney = n => {
  if (n === null || n === undefined || n === "") return "—";
  return "$" + Number(n).toLocaleString("es-AR");
};

export const theme = (dark) => ({
  bg:      dark ? "#111827" : "#f8fafc",
  card:    dark ? "#1a2535" : "#ffffff",
  card2:   dark ? "#222f42" : "#f1f5f9",
  border:  dark ? "#2d3f55" : "#e2e8f0",
  border2: dark ? "#374f6b" : "#cbd5e1",
  text:    dark ? "#f1f5f9" : "#0f172a",
  sub:     dark ? "#94a3b8" : "#475569",
  muted:   dark ? "#64748b" : "#94a3b8",
  input:   dark
    ? { background: "#222f42", border: "1px solid #2d3f55", borderRadius: 10, color: "#f1f5f9", padding: "11px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none" }
    : { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, color: "#0f172a", padding: "11px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none" },
});
