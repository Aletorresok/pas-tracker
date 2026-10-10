import { useState, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// Menú de acciones único para toda la app (click derecho, mantener apretado en Android, tecla Menú / Shift+F10).
// Se monta una vez con <MenuHost /> y cualquier componente lo abre:
//   <div {...propsMenu(() => [{ label: "Abrir", onClick }, { separador: true }, { label: "Eliminar", peligro: true, onClick }])}>
// Ítems: { label, onClick, peligro?, deshabilitado? } | { separador: true } | { titulo: "Texto" } | falsy (se ignora)
// Los menús de cada entidad (caso, expediente, PAS...) están en utils/menus.js para que sean iguales en todas las pantallas.

let estado = null;
const oyentes = new Set();
const emitir = () => oyentes.forEach(f => f());
const suscribir = f => { oyentes.add(f); return () => oyentes.delete(f); };

export const cerrarMenu = () => { estado = null; emitir(); };

// Limpia separadores al principio, al final y repetidos
const limpiar = items => items.filter(Boolean).filter((it, i, xs) => !it.separador || (i > 0 && i < xs.length - 1 && !xs[i - 1].separador));

export function abrirMenu(e, items) {
  e.preventDefault();
  e.stopPropagation();
  const lista = limpiar(items);
  if (!lista.length) return;
  let { clientX: x, clientY: y } = e;
  if (!x && !y && e.currentTarget?.getBoundingClientRect) { // desde el teclado no hay posición del mouse
    const r = e.currentTarget.getBoundingClientRect();
    x = r.left + 16; y = r.top + Math.min(r.height, 40);
  }
  estado = { x, y, items: lista, foco: document.activeElement };
  emitir();
}

// Props para cualquier elemento que tenga menú. getItems se evalúa recién al abrir.
export const propsMenu = getItems => ({ onContextMenu: e => abrirMenu(e, getItems()) });

// Compatibilidad con el uso anterior (cada pantalla renderizaba su {menu})
export const useMenuContextual = () => ({ abrirMenu, menu: null });

export function MenuHost() {
  const actual = useSyncExternalStore(suscribir, () => estado);
  return actual ? <Menu key={`${actual.x},${actual.y}`} {...actual} /> : null;
}

function Menu({ x, y, items, foco }) {
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
    ref.current.querySelector("[role=menuitem]:not(:disabled)")?.focus({ preventScroll: true });
  }, [x, y]);

  useEffect(() => {
    const cerrar = () => { cerrarMenu(); foco?.focus?.({ preventScroll: true }); };
    const fuera = e => { if (!ref.current?.contains(e.target)) cerrarMenu(); };
    const tecla = e => {
      if (e.key === "Escape") { e.preventDefault(); cerrar(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const bs = [...ref.current.querySelectorAll("[role=menuitem]:not(:disabled)")];
      const i = bs.indexOf(document.activeElement);
      bs[(i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length]?.focus();
    };
    window.addEventListener("pointerdown", fuera, true);
    window.addEventListener("keydown", tecla);
    window.addEventListener("resize", cerrarMenu);
    window.addEventListener("scroll", cerrarMenu, true);
    return () => {
      window.removeEventListener("pointerdown", fuera, true);
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("resize", cerrarMenu);
      window.removeEventListener("scroll", cerrarMenu, true);
    };
  }, [foco]);

  return createPortal(
    <div ref={ref} role="menu" className="menu-ctx" onContextMenu={e => e.preventDefault()}
      style={{ left: pos.left, top: pos.top, visibility: pos.visible ? "visible" : "hidden" }}>
      {items.map((it, i) => {
        if (it.separador) return <div key={i} className="menu-ctx-sep" />;
        if (it.titulo) return <div key={i} className="menu-ctx-titulo">{it.titulo}</div>;
        return (
          <button key={i} type="button" role="menuitem" disabled={it.deshabilitado} data-peligro={it.peligro || undefined}
            onClick={() => { cerrarMenu(); it.onClick?.(); }}>
            {it.label}
          </button>
        );
      })}
    </div>,
    document.body
  );
}
