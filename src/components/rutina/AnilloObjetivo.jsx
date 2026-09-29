// Anillo de avance: lo hecho en color (verde a tiempo, naranja un poco atrás, rojo muy atrás), lo que falta en gris
// y una marca en "dónde deberías estar hoy".
export const COLOR_NIVEL = { ok: "var(--ok)", atras: "var(--warn)", muy_atras: "var(--bad)", sin: "var(--muted)", hecho: "var(--ok)" };

export default function AnilloObjetivo({ pct = 0, esperadoPct = null, nivel = "sin", size = 64, grosor = 7, children }) {
  const r = (size - grosor) / 2;
  const c = size / 2;
  const largo = 2 * Math.PI * r;
  const color = COLOR_NIVEL[nivel] || COLOR_NIVEL.sin;
  // Marca del ritmo esperado: una rayita que cruza el anillo
  const ang = esperadoPct !== null ? (esperadoPct / 100) * 2 * Math.PI - Math.PI / 2 : null;
  const punto = rr => [c + rr * Math.cos(ang), c + rr * Math.sin(ang)];
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--border)" strokeWidth={grosor} />
        {pct > 0 && (
          <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round"
            strokeDasharray={`${(Math.min(pct, 100) / 100) * largo} ${largo}`} transform={`rotate(-90 ${c} ${c})`} />
        )}
        {ang !== null && esperadoPct > 0 && esperadoPct < 100 && (() => {
          const [x1, y1] = punto(r - grosor / 2 - 3), [x2, y2] = punto(r + grosor / 2 + 3);
          return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text)" strokeWidth={2} strokeLinecap="round" />;
        })()}
      </svg>
      <div className="num" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size < 56 ? 11 : 13, fontWeight: 700, color: "var(--text)" }}>
        {children ?? `${pct}%`}
      </div>
    </div>
  );
}
