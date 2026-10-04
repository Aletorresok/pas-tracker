import { ESTADOS_CASO } from "../../constants.js";
import EstadoPill from "../ui/EstadoPill.jsx";
import PlazoChip from "../ui/PlazoChip.jsx";
import TableroEtapas from "../ui/TableroEtapas.jsx";
import { itemsCaso } from "../../utils/menus.js";
import { useMoverCaso } from "./useMoverCaso.jsx";

// Columnas: los estados en curso. Cobrado y Desistido no son columnas: están en "Mover a" del menú.
const COLUMNAS = ESTADOS_CASO.filter(e => !["cobrado", "desistido"].includes(e.key));

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

// Tablero por etapas: arrastrás un caso a otra columna para cambiarle el estado (mismo flujo que la ficha:
// fecha de la etapa, nota en la bitácora, próxima acción sugerida y aviso al cliente). Tocar un caso abre la ficha.
// Funciona con mouse, con el dedo (mantené apretado un instante) y con teclado (Espacio, flechas, Espacio).
export default function TableroCasos({ casos, todosLosPas, onAbrir, acciones = {}, onCasoLocal }) {
  const { mover, ui } = useMoverCaso({ todosLosPas, onCasoLocal });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {ui}
      <TableroEtapas columnas={COLUMNAS.map(e => ({ key: e.key, label: e.label, cabecera: <EstadoPill estado={e.key} size="sm" /> }))}
        items={casos} etapaDe={c => c.estado} render={c => <ContenidoCaso c={c} />} onMover={mover} onAbrir={onAbrir}
        menu={c => itemsCaso(c, { ...acciones, mover: { estados: ESTADOS_CASO, onMover: mover } })} />
      <div style={{ fontSize: 12, color: "var(--muted)" }}>Arrastrá un caso a otra columna para cambiarle el estado (en el celular, mantenelo apretado un instante). Tocalo para abrir la ficha. Cobrado y Desistido están en el menú (click derecho → Mover a).</div>
    </div>
  );
}
