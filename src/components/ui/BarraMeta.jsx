// Barra fina "hecho de meta" (ej. WhatsApp a PAS: 9 de 15). Verde al llegar.
export default function BarraMeta({ etiqueta, hecho, meta }) {
  const pct = meta ? Math.min(100, Math.round((hecho / meta) * 100)) : 0;
  const color = hecho >= meta ? "var(--ok)" : "var(--accent)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: "var(--sub)" }}>{etiqueta}</span>
        <span className="num" style={{ fontWeight: 700, color: "var(--text)" }}>{hecho} <span style={{ fontWeight: 400, color: "var(--muted)" }}>de {meta}</span></span>
      </div>
      <div role="progressbar" aria-label={etiqueta} aria-valuenow={hecho} aria-valuemin={0} aria-valuemax={meta}
        style={{ height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width .3s" }} />
      </div>
    </div>
  );
}
