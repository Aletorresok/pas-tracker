import { useState } from "react";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable, pointerWithin, rectIntersection } from "@dnd-kit/core";
import { supabase } from "../../supabase.js";
import { ESTADOS_CASO } from "../../constants.js";
import { fechaLocalISO } from "../../utils/formatters.js";
import { fechasAlCambiarEstado, textoCambioEstado, accionSugerida, ESTADOS_CON_AVISO } from "../../utils/flujoEstados.js";
import { registrarAccion } from "../../utils/storage.js";
import { cargarCompania } from "../../utils/ofertas.js";
import { useMargenes } from "../../utils/margenes.js";
import EstadoPill from "../ui/EstadoPill.jsx";
import PlazoChip from "../ui/PlazoChip.jsx";
import SugerenciaEstado from "../caso/SugerenciaEstado.jsx";
import AvisarWhatsApp from "../caso/AvisarWhatsApp.jsx";

// Columnas: los estados en curso. Cobrado y Desistido se cierran desde la ficha (Pagos o estado).
const COLUMNAS = ESTADOS_CASO.filter(e => !["cobrado", "desistido"].includes(e.key));

// Primero donde está el cursor; si no hay, la columna que más se superpone (sirve con teclado)
const colision = args => { const p = pointerWithin(args); return p.length ? p : rectIntersection(args); };

function ContenidoCaso({ c }) {
  return (
    <>
      <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.asegurado || "Sin nombre"}</span>
      <span style={{ fontSize: 12, color: "var(--sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {c.compania_aseguradora || "Sin compañía"}{c.patente ? ` · ${c.patente}` : ""}
      </span>
      {c.proxima_accion?.trim()
        ? <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "var(--sub)", minWidth: 0 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{c.proxima_accion.trim()}</span>
            {c.proxima_accion_vence && <PlazoChip vence={c.proxima_accion_vence} />}
          </span>
        : <span style={{ fontSize: 12, color: "var(--muted)" }}>Sin próxima acción</span>}
    </>
  );
}

const estiloCaso = { textAlign: "left", font: "inherit", color: "var(--text)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4, width: "100%" };

function TarjetaCaso({ c, onAbrir, onMenu }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id });
  return (
    <button ref={setNodeRef} type="button" {...attributes} {...listeners} onClick={() => onAbrir(c)} onContextMenu={onMenu ? e => onMenu(e, c) : undefined}
      className="tarjeta tarjeta-lift" style={{ ...estiloCaso, cursor: "grab", opacity: isDragging ? 0.35 : 1, touchAction: "manipulation" }}>
      <ContenidoCaso c={c} />
    </button>
  );
}

function Columna({ col, lista, onAbrir, onMenu }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <section ref={setNodeRef} aria-label={col.label}
      style={{
        background: isOver ? "color-mix(in srgb, var(--accent) 12%, var(--card2))" : "color-mix(in srgb, var(--card2) 70%, transparent)",
        border: `1px ${isOver ? "dashed" : "solid"} ${isOver ? "var(--accent)" : "color-mix(in srgb, var(--border) 70%, transparent)"}`,
        borderRadius: "var(--r-lg)", padding: 12, minHeight: 140, display: "flex", flexDirection: "column", gap: 10,
        transition: "background-color .25s var(--ease), border-color .25s var(--ease)",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px 4px" }}>
        <EstadoPill estado={col.key} size="sm" />
        <span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{lista.length}</span>
      </div>
      {lista.map(c => <TarjetaCaso key={c.id} c={c} onAbrir={onAbrir} onMenu={onMenu} />)}
    </section>
  );
}

// Tablero por etapas: arrastrás un caso a otra columna para cambiarle el estado (mismo flujo que la ficha:
// fecha de la etapa, nota en la bitácora, próxima acción sugerida y aviso al cliente). Tocar un caso abre la ficha.
// Funciona con mouse, con el dedo (mantené apretado un instante) y con teclado (Espacio, flechas, Espacio).
export default function TableroCasos({ casos, todosLosPas, onAbrir, onMenu, onCasoLocal }) {
  const margenes = useMargenes();
  const [arrastrando, setArrastrando] = useState(null); // id del caso
  const [sugerencia, setSugerencia] = useState(null); // { caso, estado, accion, avisar }
  const [error, setError] = useState("");

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] } }),
  );

  const guardar = async (caso, cambios) => {
    const { error: err } = await supabase.from("pas_casos").update(cambios).eq("id", caso.id);
    if (err) { setError("No se pudo guardar el cambio: " + err.message); return null; }
    const actualizado = { ...caso, ...cambios };
    onCasoLocal(actualizado);
    return actualizado;
  };

  const soltar = async (casoId, estado) => {
    const caso = casos.find(c => c.id === casoId);
    if (!caso || caso.estado === estado) return;
    setError("");
    const cambios = { estado, ...fechasAlCambiarEstado(caso, estado), fecha_ultimo_movimiento: fechaLocalISO() };
    // Con acuerdo y sin plazo cargado, el plazo de pago de la compañía
    if (estado === "esperando_pago" && !Number(caso.plazo_pago)) {
      const plazo = Number((await cargarCompania(caso.compania_aseguradora))?.plazo_pago_dias);
      if (plazo) cambios.plazo_pago = plazo;
    }
    const actualizado = await guardar(caso, cambios);
    if (!actualizado) return;
    registrarAccion(caso.id, textoCambioEstado(caso.estado, estado));
    setSugerencia({ caso: actualizado, estado, accion: accionSugerida(actualizado, margenes || {}), avisar: ESTADOS_CON_AVISO.includes(estado) });
  };

  const alSoltar = ({ active, over }) => {
    setArrastrando(null);
    if (over && COLUMNAS.some(c => c.key === over.id)) soltar(active.id, over.id);
  };

  const pasDe = c => todosLosPas.find(p => String(p.id) === String(c._pasId));
  const casoArrastrado = arrastrando && casos.find(c => c.id === arrastrando);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && <div role="alert" style={{ color: "var(--bad)", fontSize: 13 }}>{error}</div>}
      {sugerencia && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{sugerencia.caso.asegurado || "Sin nombre"}</div>
          <SugerenciaEstado key={sugerencia.caso.id + sugerencia.estado} sugerencia={sugerencia} onCerrar={() => setSugerencia(null)}
            onUsarAccion={async a => {
              const act = await guardar(sugerencia.caso, { proxima_accion: a.texto, proxima_accion_vence: a.vence });
              if (act) setSugerencia(s => (s?.avisar ? { ...s, caso: act, accion: null } : null));
            }}
            avisoWhatsApp={<AvisarWhatsApp key={sugerencia.caso.id + sugerencia.estado} abiertoInicial caso={sugerencia.caso}
              pasNombre={pasDe(sugerencia.caso)?.nombre || sugerencia.caso._pasNombre || ""} pasTelefono={(pasDe(sugerencia.caso)?.telefonos || [])[0] || ""}
              onTelefonoCliente={v => guardar(sugerencia.caso, { telefono_asegurado: v }).then(act => act && setSugerencia(s => ({ ...s, caso: act })))}
              onUsarComoMensaje={t => guardar(sugerencia.caso, { mensaje_cliente: t }).then(act => act && setSugerencia(s => ({ ...s, caso: act })))} />} />
        </div>
      )}

      <DndContext sensors={sensores} collisionDetection={colision}
        onDragStart={({ active }) => setArrastrando(active.id)} onDragEnd={alSoltar} onDragCancel={() => setArrastrando(null)}>
        <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(230px, 1fr)", gap: 14, overflowX: "auto", padding: "4px 4px 12px", alignItems: "start" }}>
          {COLUMNAS.map(col => <Columna key={col.key} col={col} lista={casos.filter(c => c.estado === col.key)} onAbrir={onAbrir} onMenu={onMenu} />)}
        </div>
        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(.34, 1.4, .64, 1)" }}>
          {casoArrastrado && (
            <div className="tarjeta" style={{ ...estiloCaso, cursor: "grabbing", borderColor: "var(--accent)", boxShadow: "var(--sh-3)", transform: "rotate(-1.5deg) scale(1.03)" }}>
              <ContenidoCaso c={casoArrastrado} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>Arrastrá un caso a otra columna para cambiarle el estado (en el celular, mantenelo apretado un instante). Tocalo para abrir la ficha. Cobrado y Desistido se cierran desde la ficha.</div>
    </div>
  );
}
