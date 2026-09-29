import { prioridad, PESTANAS } from "../../utils/rutina.js";

export const COLOR_NIVEL = { bien: "var(--ok)", atras: "var(--warn)", mal: "var(--bad)", sin: "var(--muted)" };
export const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 };
export const campo = { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", width: "100%" };
export const etiqueta = { display: "block", fontSize: 12, color: "var(--sub)", marginBottom: 3 };

// Anillo: lo hecho en color, lo que falta en gris, y una marquita de "dónde deberías estar hoy"
export function Anillo({ avance = 0, esperado = null, nivel = "sin", centro, tam = 84 }) {
  const r = 34, c = 2 * Math.PI * r;
  const ang = esperado !== null ? esperado * 2 * Math.PI - Math.PI / 2 : null;
  return (
    <svg width={tam} height={tam} viewBox="0 0 84 84" role="img" aria-label={centro} style={{ flex: "none" }}>
      <circle cx="42" cy="42" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
      <circle cx="42" cy="42" r={r} fill="none" stroke={COLOR_NIVEL[nivel]} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${Math.max(0.001, avance) * c} ${c}`} transform="rotate(-90 42 42)" />
      {ang !== null && esperado < 1 && (
        <line x1={42 + 27 * Math.cos(ang)} y1={42 + 27 * Math.sin(ang)} x2={42 + 41 * Math.cos(ang)} y2={42 + 41 * Math.sin(ang)} stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round" />
      )}
      <text x="42" y="47" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text)">{centro}</text>
    </svg>
  );
}

export function ChipPrioridad({ k }) {
  const p = prioridad(k);
  return <span style={{ fontSize: 11, fontWeight: 700, color: p.color, background: `color-mix(in srgb, ${p.color} 12%, transparent)`, borderRadius: 999, padding: "1px 8px", whiteSpace: "nowrap" }}>{p.l}</span>;
}

export const nombreAcceso = a => (!a ? "" : a.startsWith("app:") ? PESTANAS.find(p => p.k === a)?.l || "" : "Abrir link");

export function abrirAcceso(acceso, onIr) {
  if (!acceso) return;
  if (acceso.startsWith("app:")) onIr?.(acceso.slice(4));
  else window.open(acceso, "_blank", "noopener");
}

// Un ítem de la rutina para tildar
export function FilaItem({ item, hecho, onTildar, onIr, extra }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
      <input type="checkbox" checked={hecho} onChange={e => onTildar(item, e.target.checked)} aria-label={item.titulo}
        style={{ width: 18, height: 18, accentColor: "var(--ok)", flex: "none", cursor: "pointer" }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: hecho ? "var(--muted)" : "var(--text)" }}>
        <span style={{ textDecoration: hecho ? "line-through" : "none", marginRight: 6 }}>{item.titulo}</span>
        {!hecho && item.prioridad === "imprescindible" && <ChipPrioridad k={item.prioridad} />}
      </span>
      {extra}
      {item.acceso && (
        <button type="button" onClick={() => abrirAcceso(item.acceso, onIr)} title={item.acceso.startsWith("app:") ? `Ir a ${nombreAcceso(item.acceso)}` : item.acceso}
          style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", padding: 0 }}>
          {item.acceso.startsWith("app:") ? `${nombreAcceso(item.acceso)} →` : "Abrir →"}
        </button>
      )}
    </div>
  );
}

export function Barra({ hechos, total }) {
  const pct = total ? Math.round((hechos / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "var(--ok)" : "var(--accent)", transition: "width .2s" }} />
      </div>
      <span className="num" style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{hechos} de {total}</span>
    </div>
  );
}
