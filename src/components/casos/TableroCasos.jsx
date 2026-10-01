import { useState } from "react";
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
import TableroEtapas from "../ui/TableroEtapas.jsx";
import { itemsCaso } from "../../utils/menus.js";

// Columnas: los estados en curso. Cobrado y Desistido se cierran desde la ficha (Pagos o estado).
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
  const margenes = useMargenes();
  const [sugerencia, setSugerencia] = useState(null); // { caso, estado, accion, avisar }
  const [error, setError] = useState("");


  const guardar = async (caso, cambios) => {
    const { error: err } = await supabase.from("pas_casos").update(cambios).eq("id", caso.id);
    if (err) { setError("No se pudo guardar el cambio: " + err.message); return null; }
    const actualizado = { ...caso, ...cambios };
    onCasoLocal(actualizado);
    return actualizado;
  };

  const mover = async (caso, estado) => {
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
    registrarAccion(caso.id, textoCambioEstado(caso.estado, estado), { visiblePas: true });
    setSugerencia({ caso: actualizado, estado, accion: accionSugerida(actualizado, margenes || {}), avisar: ESTADOS_CON_AVISO.includes(estado) });
  };


  const pasDe = c => todosLosPas.find(p => String(p.id) === String(c._pasId));

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

      <TableroEtapas columnas={COLUMNAS.map(e => ({ key: e.key, label: e.label, cabecera: <EstadoPill estado={e.key} size="sm" /> }))}
        items={casos} etapaDe={c => c.estado} render={c => <ContenidoCaso c={c} />} onMover={mover} onAbrir={onAbrir}
        menu={c => itemsCaso(c, { ...acciones, mover: { estados: COLUMNAS, onMover: mover } })} />
      <div style={{ fontSize: 12, color: "var(--muted)" }}>Arrastrá un caso a otra columna para cambiarle el estado (en el celular, mantenelo apretado un instante). Tocalo para abrir la ficha. Cobrado y Desistido se cierran desde la ficha.</div>
    </div>
  );
}
