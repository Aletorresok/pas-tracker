// Monograma ATG de ATG Lex Solutions (vector redibujado del logo). Toma el color del acento, o el que se le pase.
export const MONOGRAMA_PATH = "M149.4 0 L458.3 0 L499.0 55 L128.8 55 Z M275 55 L334 55 L334 355.6 L275 244.3 Z M114.3 94 L170.4 94 L332.5 400 L268.5 400 L146.1 169 L106.3 276 L174.8 276 L203.4 330 L86.2 330 L60.0 400 L0.0 400 Z M373 94 L527.8 94 L594.4 184 L528.4 184 L504.0 151 L431 151 L431 344 L536 344 L536 277 L470 277 L470 222 L594 222 L594 400 L373 400 Z";

export default function Logo({ alto = 24, color = "var(--accent)", titulo = "ATG Lex Solutions", style }) {
  return (
    <svg viewBox="0 0 594 400" height={alto} width={Math.round(alto * 594 / 400)} role="img" aria-label={titulo} style={{ display: "block", flex: "none", ...style }}>
      <path fill={color} d={MONOGRAMA_PATH} />
    </svg>
  );
}
