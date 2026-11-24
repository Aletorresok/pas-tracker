import { useEffect, useRef, useState } from "react";
import { estadoInfo } from "../../constants.js";
import { alpha } from "../../utils/theme.js";

// Etiqueta de estado del caso: punto de color + texto, fondo suave del mismo color.
// ayuda: explicación de la etapa. Con ayuda la etiqueta es un botón: al tocarla (o con Enter) abre un globito
// con el texto, así se ve también en el celular; al pasar el mouse muestra el mismo texto como tooltip.
export default function EstadoPill({ estado, label, size = "md", ayuda }) {
  const e = estadoInfo(estado);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = ev => { if (ref.current && !ref.current.contains(ev.target)) setAbierto(false); };
    const tecla = ev => { if (ev.key === "Escape") setAbierto(false); };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", fuera); document.removeEventListener("keydown", tecla); };
  }, [abierto]);

  const estilo = {
    display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
    fontSize: size === "sm" ? 11 : 12, fontWeight: 600, lineHeight: 1.6,
    padding: size === "sm" ? "1px 8px 1px 6px" : "2px 10px 2px 8px", borderRadius: "var(--r-xl)",
    color: e.color, background: alpha(e.color, 14),
  };
  const contenido = <>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: e.color }} />
    {label || e.label}
  </>;

  if (!ayuda) return <span style={estilo}>{contenido}</span>;

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button type="button" title={abierto ? undefined : ayuda} aria-expanded={abierto}
        onClick={ev => { ev.stopPropagation(); setAbierto(a => !a); }}
        style={{ ...estilo, border: "none", font: "inherit", fontSize: estilo.fontSize, fontWeight: 600, cursor: "pointer" }}>
        {contenido}
      </button>
      {abierto && (
        <span role="status" onClick={ev => ev.stopPropagation()} style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 20, width: "max-content", maxWidth: 260,
          padding: "8px 10px", borderRadius: "var(--r-sm)", background: "var(--card)", border: "1px solid var(--border)",
          boxShadow: "var(--sh-3)", color: "var(--text)", fontSize: 12.5, fontWeight: 400, lineHeight: 1.45, whiteSpace: "normal",
        }}>
          {ayuda}
        </span>
      )}
    </span>
  );
}
