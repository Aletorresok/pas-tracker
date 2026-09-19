import { useEffect } from "react";

export default function Toast({ msg, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);

  if (!msg) return null;
  const colors = { success: "#22c55e", error: "#ef4444", info: "#6366f1", warn: "#f97316" };
  const c = colors[type] || colors.info;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 20, zIndex: 999, background: "#1a2535", border: `1px solid ${c}55`, borderRadius: 12, padding: "12px 18px", color: c, fontSize: 14, fontWeight: 600, maxWidth: 340, boxShadow: "0 8px 32px #0008", display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: c, cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
    </div>
  );
}