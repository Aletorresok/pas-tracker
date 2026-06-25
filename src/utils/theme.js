export const COLORES = {
  primary: "#6366f1",
  primaryLight: "#818cf8",
  primaryGradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  success: "#22c55e",
  warning: "#f97316",
  danger: "#ef4444",
  info: "#06b6d4",
  yellow: "#eab308",
  purple: "#a855f7",
  blue: "#3b82f6",
};

export const THEME = (dark) => ({
  bg:     dark ? "#111827" : "#f8fafc",
  card:   dark ? "#1a2535" : "#ffffff",
  card2:  dark ? "#222f42" : "#f1f5f9",
  border: dark ? "#2d3f55" : "#e2e8f0",
  text:   dark ? "#f1f5f9" : "#0f172a",
  sub:    dark ? "#94a3b8" : "#475569",
  muted:  dark ? "#64748b" : "#94a3b8",
  input:  dark
    ? { background: "#1e293b", border: "1px solid #2d3f55", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }
    : { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, color: "#0f172a", padding: "9px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
});
