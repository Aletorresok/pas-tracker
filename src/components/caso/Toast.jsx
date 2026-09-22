import { useEffect } from "react";
import { alpha } from "../../utils/theme.js";

export default function Toast({ msg, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);

  if (!msg) return null;
  const colors = { success: "var(--ok)", error: "var(--bad)", info: "var(--accent)", warn: "var(--warn)" };
  const c = colors[type] || colors.info;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 20, zIndex: 999, background: "var(--text)", border: "none", borderLeft: `4px solid ${c}`, borderRadius: 10, padding: "12px 16px", color: "var(--bg)", fontSize: 14, fontWeight: 600, maxWidth: 340, boxShadow: "var(--shadow)", display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "var(--bg)", cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
    </div>
  );
}