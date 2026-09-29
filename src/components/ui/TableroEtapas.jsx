import { useState } from "react";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable, pointerWithin, rectIntersection } from "@dnd-kit/core";
import { marcarArrastre, propsMenu } from "./MenuContextual.jsx";

// Tablero por etapas genérico (Casos y Expedientes): arrastrás una tarjeta a otra columna para cambiarle la etapa.
// Mouse, dedo (mantener apretado un instante) y teclado (Espacio, flechas, Espacio). Tocar abre; click derecho, acciones.
//   columnas: [{ key, cabecera }]  ·  etapaDe(item) → key  ·  render(item) → contenido de la tarjeta
//   onMover(item, key) · onAbrir(item) · menu(item) → ítems del menú de acciones

// Primero donde está el cursor; si no hay, la columna que más se superpone (sirve con teclado)
const colision = args => { const p = pointerWithin(args); return p.length ? p : rectIntersection(args); };
const estiloTarjeta = { textAlign: "left", font: "inherit", color: "var(--text)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4, width: "100%" };

function Tarjeta({ item, render, onAbrir, menu }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return (
    <button ref={setNodeRef} type="button" {...attributes} {...listeners} onClick={() => onAbrir?.(item)} {...(menu ? propsMenu(() => menu(item)) : {})}
      className="tarjeta tarjeta-lift" style={{ ...estiloTarjeta, cursor: "grab", opacity: isDragging ? 0.35 : 1, touchAction: "manipulation" }}>
      {render(item)}
    </button>
  );
}

function Columna({ col, lista, ...resto }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <section ref={setNodeRef} aria-label={col.label} className="tablero-col" data-sobre={isOver || undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px 4px" }}>
        {col.cabecera}
        <span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{lista.length}</span>
      </div>
      {lista.map(it => <Tarjeta key={it.id} item={it} {...resto} />)}
      {!lista.length && <div className="tablero-vacio">Soltá acá</div>}
    </section>
  );
}

export default function TableroEtapas({ columnas, items, etapaDe, render, onMover, onAbrir, menu, anchoColumna = 230 }) {
  const [arrastrando, setArrastrando] = useState(null);
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] } }),
  );
  const fin = () => { setArrastrando(null); marcarArrastre(false); };
  const alSoltar = ({ active, over }) => {
    fin();
    const item = items.find(x => x.id === active.id);
    if (item && over && columnas.some(c => c.key === over.id) && etapaDe(item) !== over.id) onMover(item, over.id);
  };
  const itemArrastrado = arrastrando && items.find(x => x.id === arrastrando);

  return (
    <DndContext sensors={sensores} collisionDetection={colision}
      onDragStart={({ active }) => { setArrastrando(active.id); marcarArrastre(true); }} onDragEnd={alSoltar} onDragCancel={fin}>
      <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: `minmax(${anchoColumna}px, 1fr)`, gap: 14, overflowX: "auto", padding: "4px 4px 12px", alignItems: "start" }}>
        {columnas.map(col => (
          <Columna key={col.key} col={col} lista={items.filter(x => etapaDe(x) === col.key)} render={render} onAbrir={onAbrir} menu={menu} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(.34, 1.4, .64, 1)" }}>
        {itemArrastrado && (
          <div className="tarjeta" style={{ ...estiloTarjeta, cursor: "grabbing", borderColor: "var(--accent)", boxShadow: "var(--sh-3)", transform: "rotate(-1.5deg) scale(1.03)" }}>
            {render(itemArrastrado)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
