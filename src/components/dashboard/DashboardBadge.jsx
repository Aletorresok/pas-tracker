import { alpha } from "../../utils/theme.js";
export default function DashboardBadge({ color, children }) {
  return (
    <div style={{ background: alpha(color, 9), border: `1px solid ${alpha(color, 20)}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}