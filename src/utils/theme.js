// 🎛️ SISTEMA VISUAL - PAS TRACKER
// Todos los colores salen de variables CSS definidas en src/index.css.
// El modo (claro/oscuro) y el color de acento se aplican con data-theme / data-accent
// sobre <html> (ver ThemeContext). Por eso los valores de acá son "var(--x)" y no hex:
// cambian solos al cambiar el tema, sin re-render.

// Mezcla un color (hex o var()) con transparencia. pct = opacidad 0-100.
export const alpha = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// Colores semánticos (avisos). El acento es el único que cambia con el tema de color.
export const COLORES = {
  brand: "var(--accent)",
  brandInk: "var(--accent-ink)",
  primaryGradient: "var(--accent)",
  success: "var(--ok)",
  warning: "var(--warn)",
  danger: "var(--bad)",
  info: "var(--info)",
};

// Temas de acento disponibles (el valor es el de data-accent; "" = dorado por defecto)
export const ACENTOS = [
  { key: "", label: "Dorado", muestra: "#C9A227" },
  { key: "marino", label: "Marino", muestra: "#2D4A7A" },
  { key: "borgona", label: "Borgoña", muestra: "#7D2E46" },
  { key: "grafito", label: "Grafito", muestra: "#3F4654" },
];

// Escala tipográfica (px)
export const FONT = { xs: 11, sm: 12, base: 14, md: 16, lg: 20, xl: 24 };

const TOKENS = {
  bg: "var(--bg)",
  card: "var(--card)",
  card2: "var(--card2)",
  border: "var(--border)",
  border2: "var(--border2)",
  text: "var(--text)",
  sub: "var(--sub)",
  muted: "var(--muted)",
  accent: "var(--accent)",
  accentInk: "var(--accent-ink)",
  onAccent: "var(--on-accent)",
  shadow: "var(--shadow)",
  input: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text)",
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
    fontVariantNumeric: "tabular-nums",
  },
};

// Se mantiene la firma THEME(dark) por compatibilidad; el modo lo resuelve el CSS.
export const THEME = () => TOKENS;
