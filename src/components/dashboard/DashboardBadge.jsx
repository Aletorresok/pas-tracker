export default function DashboardBadge({ color, children }) {
  return (
    <div style={{ background: color + "18", border: `1px solid ${color}33`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}