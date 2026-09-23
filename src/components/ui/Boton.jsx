import Icono from "./Icono.jsx";

// variante: "primario" (acento) | "secundario" (neutro con borde) | "fantasma" (sin fondo) | "peligro"
const VARIANTES = {
  primario:   { background: "var(--accent)", color: "var(--on-accent)", border: "1px solid var(--accent)" },
  secundario: { background: "var(--card)", color: "var(--text)", border: "1px solid var(--border2)" },
  fantasma:   { background: "transparent", color: "var(--sub)", border: "1px solid transparent" },
  peligro:    { background: "transparent", color: "var(--bad)", border: "1px solid color-mix(in srgb, var(--bad) 45%, transparent)" },
};

export default function Boton({ variante = "secundario", icono, children, style, disabled, tamaño = "md", className, ...rest }) {
  const pad = tamaño === "sm" ? "6px 10px" : "10px 16px";
  return (
    <button
      type="button"
      disabled={disabled}
      className={className}
      {...rest}
      style={{
        ...VARIANTES[variante],
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        borderRadius: 8, padding: pad, fontSize: tamaño === "sm" ? 12 : 14, fontWeight: 600,
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap",
        ...style,
      }}
    >
      {icono && <Icono nombre={icono} size={tamaño === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}
