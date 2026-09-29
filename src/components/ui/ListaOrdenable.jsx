import { useMemo, useState } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { marcarArrastre } from "./MenuContextual.jsx";

const leerOrden = clave => { try { return JSON.parse(localStorage.getItem(`orden:${clave}`)) || []; } catch { return []; } };
const guardarOrden = (clave, ids) => { try { localStorage.setItem(`orden:${clave}`, JSON.stringify(ids)); } catch { /* sin storage */ } };

function Item({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, position: "relative", zIndex: isDragging ? 5 : 0 }}>
      <div className="entra">
        {children({ dragging: isDragging, dragProps: { ...attributes, ...listeners } })}
      </div>
    </div>
  );
}

// Lista vertical que se reordena arrastrando. El orden elegido se recuerda en este navegador (localStorage);
// lo que aparece nuevo entra arriba. render(item, { dragging, dragProps }) devuelve la tarjeta.
export default function ListaOrdenable({ items, storageKey, render, gap = 10 }) {
  const [orden, setOrden] = useState(() => leerOrden(storageKey));
  const lista = useMemo(() => {
    const pos = new Map(orden.map((id, i) => [id, i]));
    const nuevos = items.filter(x => !pos.has(x.id));
    const conocidos = items.filter(x => pos.has(x.id)).sort((a, b) => pos.get(a.id) - pos.get(b.id));
    return [...nuevos, ...conocidos];
  }, [items, orden]);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] } }),
  );

  const alSoltar = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const ids = lista.map(x => x.id);
    const nuevo = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id));
    setOrden(nuevo);
    guardarOrden(storageKey, nuevo);
  };

  const restablecer = () => { setOrden([]); guardarOrden(storageKey, []); };

  return (
    <>
      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragStart={() => marcarArrastre(true)} onDragEnd={e => { marcarArrastre(false); alSoltar(e); }} onDragCancel={() => marcarArrastre(false)}>
        <SortableContext items={lista.map(x => x.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap }}>
            {lista.map(x => <Item key={x.id} id={x.id}>{estado => render(x, estado)}</Item>)}
          </div>
        </SortableContext>
      </DndContext>
      {orden.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button type="button" className="tc-restablecer" onClick={restablecer}>Restablecer orden</button>
        </div>
      )}
    </>
  );
}
