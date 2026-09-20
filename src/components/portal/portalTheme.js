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
  try {
    const s = String(iso);
    const [y, m, d] = s.slice(0, 10).split("-");
    return `${d}/${m}/${String(y).slice(-2)}`;
  } catch { return "—"; }
};

export const fmtMoney = n => {
  if (n === null || n === undefined || n === "") return "—";
  return "$" + Number(n).toLocaleString("es-AR");
};

export const theme = (dark) => ({
  bg:      dark ? "#10151F" : "#F7F6F2",
  card:    dark ? "#171E2B" : "#ffffff",
  card2:   dark ? "#1E2738" : "#EFEFEA",
  border:  dark ? "#252D3D" : "#E4E2DC",
  border2: dark ? "#323B4D" : "#D0CEC8",
  text:    dark ? "#E9E7E1" : "#1A1D24",
  sub:     dark ? "#8D93A1" : "#555B6E",
  muted:   dark ? "#5A6273" : "#8A909F",
  input:   dark
    ? { background: "#171E2B", border: "1px solid #252D3D", borderRadius: 10, color: "#E9E7E1", padding: "11px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }
    : { background: "#ffffff", border: "1px solid #E4E2DC", borderRadius: 10, color: "#1A1D24", padding: "11px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
});