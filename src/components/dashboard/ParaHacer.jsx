import { useState } from "react";
import { fmtMoney, fechaLocalISO } from "../../utils/formatters.js";
import TarjetaTarea from "../ui/TarjetaTarea.jsx";
import ListaOrdenable from "../ui/ListaOrdenable.jsx";
import { itemsCaso } from "../../utils/menus.js";
import ChipPendiente from "../expediente/ChipPendiente.jsx";
import Ilustracion from "../ui/Ilustracion.jsx";

const TIPO = { accion: "Próxima acción", honorarios: "Honorarios", quieto: "Reclamo quieto", prescripcion: "Prescripción", comision: "Comisión PAS", pedir_respuesta: "Pedir respuesta", firma: "A la firma", cobro: "Fecha de pago", dato: "Dato faltante", plazo: "Plazo procesal", escrito: "Escrito" };

// Lista de tareas ordenada por vencimiento (casos PAS, plazos y escritos de expedientes); se puede reordenar arrastrando y el orden se recuerda. Clic abre el caso o el expediente.
export default function ParaHacer({ tareas, cal, onAbrir, onReiterar }) {
  const [reiterando, setReiterando] = useState(null);
  const reiterar = async (t) => { setReiterando(t.id); await onReiterar?.(t.caso); setReiterando(null); };
  const vencidas = tareas.filter(t => t.vence && t.vence < fechaLocalISO()).length;

  return (
    <section className="panel-vidrio">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 14, padding: "0 4px" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Para hacer</h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {tareas.length} {tareas.length === 1 ? "tarea" : "tareas"}{vencidas ? ` · ${vencidas} vencida${vencidas > 1 ? "s" : ""}` : ""}
        </span>
      </div>

      {tareas.length === 0 && (
        <div style={{ padding: "20px 0", textAlign: "center", color: "var(--sub)", fontSize: 14 }}>
          <Ilustracion nombre="listo" size={88} style={{ margin: "0 auto 8px" }} />
          Nada pendiente. Las próximas acciones de los casos y los plazos y escritos de los expedientes aparecen acá.
        </div>
      )}

      <div className="lista-scroll" style={{ maxHeight: 520, overflowY: "auto", margin: "0 -10px", padding: "6px 10px 10px" }}>
        <ListaOrdenable items={tareas} storageKey="paraHacer" render={(t, { dragging, dragProps }) => {
          const reiterable = t.tipo === "quieto" && onReiterar;
          return (
            <TarjetaTarea dragging={dragging} dragProps={dragProps} vence={t.vence} tipo={TIPO[t.tipo]}
              chip={t.plazo && t.vence ? <ChipPendiente pendiente={t.plazo} cal={cal} jurisdiccion={t.jurisdiccion} /> : undefined}
              titulo={t.titulo} detalle={t.detalle} onClick={() => onAbrir(t)}
              menu={() => t.caso
                ? itemsCaso(t.caso, { abrir: () => onAbrir(t), extra: [reiterable && { label: "Reiteré hoy", onClick: () => reiterar(t) }] })
                : [{ label: "Abrir", onClick: () => onAbrir(t) }]}
              derecha={!reiterable && t.monto ? fmtMoney(t.monto) : undefined}
              accion={reiterable ? {
                texto: reiterando === t.id ? "Guardando…" : "Reiteré hoy", deshabilitada: reiterando === t.id,
                titulo: "Registra en la bitácora que reiteraste el reclamo hoy y reinicia la cuenta", onClick: () => reiterar(t),
              } : undefined} />
          );
        }} />
      </div>
    </section>
  );
}
