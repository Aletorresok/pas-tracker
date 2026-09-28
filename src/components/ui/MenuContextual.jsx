import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

// Menú de click derecho. Uso:
//   const { abrirMenu, menu } = useMenuContextual();
//   <div onContextMenu={e => abrirMenu(e, [{ label: "Abrir", onClick }, { separador: true }, { label: "Eliminar", peligro: true, onClick }])}>
//   {menu}
// Ítems: { label, onClick, peligro?, deshabilitado? } | { separador: true } | { titulo: "Texto" }
export function useMenuContextual() {
  const [estado, setEstado] = useState(null);
  const abrirMenu = useCallback((e, items) => {
    e.preventDefault();
    e.stopPropagation();
    setEstado({ x: e.clientX, y: e.clientY, items: items.filter(Boolean) });
  }, []);
  const cerrar = useCallback(() => setEstado(null), []);
  return { abrirMenu, menu: estado && <MenuContextual {...estado} onCerrar={cerrar} /> };
}

function MenuContextual({ x, y, items, onCerrar }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y, visible: false });

  // Se mide antes de pintar para que no se salga de la pantalla
  useLayoutEffect(() => {
    const r = ref.current.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)),
      visible: true,
    });
  }, [x, y]);

  useEffect(() => {
    const fuera = e => { if (!ref.current?.contains(e.target)) onCerrar(); };
    const tecla = e => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("mousedown", fuera);
    window.addEventListener("keydown", tecla);
    window.addEventListener("resize", onCerrar);
    window.addEventListener("scroll", onCerrar, true);
    return () => {
      window.removeEventListener("mousedown", fuera);
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("resize", onCerrar);
      window.removeEventListener("scroll", onCerrar, true);
    };
  }, [onCerrar]);

  return createPortal(
    <div ref={ref} role="menu" onContextMenu={e => e.preventDefault()}
      style={{
        position: "fixed", left: pos.left, top: pos.top, visibility: pos.visible ? "visible" : "hidden",
        zIndex: 10001, minWidth: 200, maxHeight: "80vh", overflowY: "auto", padding: 4,
        background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.35)",
      }}>
      {items.map((it, i) => {
        if (it.separador) return <div key={i} style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />;
        if (it.titulo) return <div key={i} style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, padding: "6px 10px 2px" }}>{it.titulo}</div>;
        return (
          <button key={i} type="button" role="menuitem" disabled={it.deshabilitado}
            onClick={() => { onCerrar(); it.onClick?.(); }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--card2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
            style={{
              display: "block", width: "100%", textAlign: "left", font: "inherit", fontSize: 13, padding: "7px 10px",
              background: "none", border: "none", borderRadius: 6, cursor: it.deshabilitado ? "default" : "pointer",
              color: it.peligro ? "var(--bad)" : "var(--text)", opacity: it.deshabilitado ? 0.4 : 1, fontWeight: it.peligro ? 600 : 400,
            }}>
            {it.label}
          </button>
        );
      })}
    </div>,
    document.body
  );
}
