import { useState, useEffect } from "react";

// Aviso abajo al centro con "Deshacer", que se va solo. onCerrar tiene que ser estable (useCallback).
export default function AvisoDeshacer({ texto, onDeshacer, onCerrar, duracion = 8000 }) {
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    if (trabajando) return;
    const t = setTimeout(onCerrar, duracion);
    return () => clearTimeout(t);
  }, [trabajando, onCerrar, duracion]);

  const deshacer = async () => {
    setTrabajando(true);
    await onDeshacer();
    onCerrar();
  };

  return (
    <div role="status" className="aviso-deshacer"
      style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", zIndex: 700, display: "flex", gap: 14, alignItems: "center", maxWidth: "calc(100vw - 32px)", background: "var(--text)", color: "var(--bg)", borderRadius: "var(--r-sm)", padding: "10px 14px", fontSize: 14, boxShadow: "var(--shadow)" }}>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{texto}</span>
      <button type="button" onClick={deshacer} disabled={trabajando}
        style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>
        {trabajando ? "Recuperando…" : "Deshacer"}
      </button>
      <button type="button" onClick={onCerrar} aria-label="Cerrar aviso" disabled={trabajando}
        style={{ background: "none", border: "none", color: "inherit", opacity: 0.6, cursor: "pointer", padding: 0, fontSize: 14 }}>✕</button>
    </div>
  );
}
