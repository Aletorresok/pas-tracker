import { useMemo, useState } from "react";
import { fechaLocalISO } from "../../utils/formatters.js";
import ListaOrdenable from "../ui/ListaOrdenable.jsx";
import { itemsCaso } from "../../utils/menus.js";
import ChipPendiente from "../expediente/ChipPendiente.jsx";
import Ilustracion from "../ui/Ilustracion.jsx";
import TarjetaCaso from "./TarjetaCaso.jsx";

const TIPO = { accion: "Próxima acción", honorarios: "Honorarios", quieto: "Reclamo quieto", prescripcion: "Prescripción", comision: "Comisión PAS", pedir_respuesta: "Pedir respuesta", firma: "A la firma", cobro: "Fecha de pago", dato: "Dato faltante", plazo: "Plazo procesal", escrito: "Escrito" };

// Una tarjeta por caso o expediente, con todos sus pendientes; vence = el más próximo
export function agruparPorCaso(tareas) {
  const grupos = new Map();
  for (const t of tareas) {
    const k = t.caso ? `caso-${t.caso.id}` : t.expediente ? `exp-${t.expediente.id}` : t.id;
    if (!grupos.has(k)) grupos.set(k, { id: k, caso: t.caso, expediente: t.expediente, titulo: t.titulo, tareas: [] });
    grupos.get(k).tareas.push(t);
  }
  const fecha = t => t.vence || "9999-12-31";
  return [...grupos.values()].map(g => {
    g.tareas.sort((a, b) => fecha(a).localeCompare(fecha(b)));
    return { ...g, vence: g.tareas[0].vence || null };
  }).sort((a, b) => fecha(a).localeCompare(fecha(b)));
}

// Alto de la lista: se ven unas 3 tarjetas y el resto con scroll (como Cobros pendientes)
const ALTO_LISTA = 470;

const leer = () => { try { return localStorage.getItem("paraHacer:proximos") === "1"; } catch { return false; } };
const guardar = v => { try { localStorage.setItem("paraHacer:proximos", v ? "1" : "0"); } catch { /* sin storage */ } };

// Para hacer: arriba lo vencido y lo de hoy; abajo, plegado, lo de los próximos días y lo que no tiene plazo.
// Cada lista se reordena arrastrando (el orden se recuerda). Tocar abre el caso o el expediente.
export default function ParaHacer({ tareas, cal, onAbrir, onHecho, onPosponer, onReiterar }) {
  const [verProximos, setVerProximos] = useState(leer);
  const hoy = fechaLocalISO();
  const grupos = useMemo(() => agruparPorCaso(tareas), [tareas]);
  const deHoy = grupos.filter(g => g.vence && g.vence <= hoy);
  const proximos = grupos.filter(g => !g.vence || g.vence > hoy);
  const vencidos = deHoy.filter(g => g.vence < hoy).length;

  const abrir = g => onAbrir(g.tareas[0]);
  const tarjeta = (g, { dragging, dragProps }) => {
    const plazo = g.tareas.find(t => t.plazo && t.vence);
    return (
      <TarjetaCaso grupo={g} tipos={TIPO} dragging={dragging} dragProps={dragProps} onAbrir={abrir}
        chip={plazo ? <ChipPendiente pendiente={plazo.plazo} cal={cal} jurisdiccion={plazo.jurisdiccion} /> : undefined}
        menu={() => g.caso ? itemsCaso(g.caso, { abrir: () => abrir(g) }) : [{ label: "Abrir", onClick: () => abrir(g) }]}
        onHecho={onHecho} onPosponer={onPosponer} onReiterar={onReiterar} />
    );
  };

  return (
    <section className="panel-vidrio">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 14, padding: "0 4px" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Para hacer</h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {deHoy.length} para hoy{vencidos ? ` · ${vencidos} vencido${vencidos > 1 ? "s" : ""}` : ""}
        </span>
      </div>

      {deHoy.length === 0 && (
        <div style={{ padding: "12px 0 20px", textAlign: "center", color: "var(--sub)", fontSize: 14 }}>
          <Ilustracion nombre="listo" size={72} style={{ margin: "0 auto 8px" }} />
          Nada vencido ni para hoy.
        </div>
      )}
      {deHoy.length > 0 && (
        <div className="lista-scroll" style={{ maxHeight: ALTO_LISTA, overflowY: "auto", margin: "0 -10px", padding: "6px 10px 10px" }}>
          <ListaOrdenable items={deHoy} storageKey="paraHacer-hoy" render={tarjeta} />
        </div>
      )}

      {proximos.length > 0 && (
        <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <button type="button" onClick={() => { setVerProximos(v => { guardar(!v); return !v; }); }} aria-expanded={verProximos}
            style={{ background: "none", border: "none", padding: "4px", font: "inherit", fontSize: 14, fontWeight: 600, color: "var(--accent-ink)", cursor: "pointer" }}>
            {verProximos ? "Ocultar" : "Ver"} próximos días y sin plazo ({proximos.length})
          </button>
          {verProximos && (
            <div className="lista-scroll" style={{ maxHeight: ALTO_LISTA, overflowY: "auto", margin: "6px -10px 0", padding: "6px 10px 10px" }}>
              <ListaOrdenable items={proximos} storageKey="paraHacer-proximos" render={tarjeta} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
