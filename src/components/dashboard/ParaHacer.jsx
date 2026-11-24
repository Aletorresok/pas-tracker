import { useEffect, useMemo, useRef, useState } from "react";
import { fechaLocalISO, sumarDias, DIAS_VENCIDO_GRAVE } from "../../utils/formatters.js";
import { itemsCaso, itemsExpediente } from "../../utils/menus.js";
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

// Alto de la lista: entran unas 12 filas y el resto con scroll
const ALTO_LISTA = 720;

const leer = () => { try { return localStorage.getItem("paraHacer:proximos") === "1"; } catch { return false; } };
const guardar = v => { try { localStorage.setItem("paraHacer:proximos", v ? "1" : "0"); } catch { /* sin storage */ } };

// Para hacer: una lista compacta con Vencidas y Para hoy a la vista, cada grupo con su banda; abajo, plegado, lo de los próximos días
// y lo que no tiene plazo. foco ("atras" | "hoy") deja solo ese grupo (lo eligen los filtros del encabezado de Hoy).
// Tocar una fila abre el caso o el expediente; el tilde (Hecho) y Posponer están en cada fila.
export default function ParaHacer({ tareas, cal, foco = null, onQuitarFoco, onAbrir, onHecho, onPosponer, onReiterar }) {
  const [verProximos, setVerProximos] = useState(leer);
  const lista = useRef(null);

  // J desde cualquier lugar de Hoy (sin estar escribiendo ni con una ficha o ventana abierta) enfoca la primera fila;
  // de ahí siguen los atajos de cada fila (TarjetaCaso)
  useEffect(() => {
    const alTeclear = e => {
      if (e.key.toLowerCase() !== "j" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t.closest?.("input, textarea, select, [contenteditable=true], .ft") || document.querySelector('[role="dialog"]')) return;
      const primera = lista.current?.querySelector(".ft");
      if (primera) { e.preventDefault(); primera.focus(); primera.scrollIntoView({ block: "nearest" }); }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);
  const hoy = fechaLocalISO();
  const grupos = useMemo(() => agruparPorCaso(tareas), [tareas]);
  const deHoy = grupos.filter(g => g.vence && g.vence <= hoy);
  const proximos = grupos.filter(g => !g.vence || g.vence > hoy);
  // Crítico: vencido hace 30 días o más, en su propia banda arriba de todo
  const limiteGrave = sumarDias(hoy, -DIAS_VENCIDO_GRAVE);
  const criticas = deHoy.filter(g => g.vence <= limiteGrave);
  const atrasadas = deHoy.filter(g => g.vence < hoy && g.vence > limiteGrave);
  const paraHoy = deHoy.filter(g => g.vence === hoy);

  const abrir = g => onAbrir(g.tareas[0]);
  const fila = g => {
    const plazo = g.tareas.find(t => t.plazo && t.vence);
    return (
      <TarjetaCaso key={g.id} grupo={g} tipos={TIPO} onAbrir={abrir}
        chip={plazo ? <ChipPendiente pendiente={plazo.plazo} cal={cal} jurisdiccion={plazo.jurisdiccion} /> : undefined}
        menu={() => g.caso ? itemsCaso(g.caso, { abrir: () => abrir(g) })
          : g.expediente ? itemsExpediente(g.expediente, { abrir: () => abrir(g) }) : [{ label: "Abrir", onClick: () => abrir(g) }]}
        onHecho={onHecho} onPosponer={onPosponer} onReiterar={onReiterar} />
    );
  };
  const bandas = [["Crítico · más de 30 días", criticas, "var(--bad)", "atras", true], ["Vencidas", atrasadas, "var(--bad)", "atras"], ["Para hoy", paraHoy, "var(--warn)", "hoy"]]
    .filter(([, lista, , k]) => lista.length && (!foco || foco === k));

  return (
    <section ref={lista} className="lista-filas" aria-label="Para hacer">
      {deHoy.length === 0 && (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--sub)", fontSize: 14 }}>
          <Ilustracion nombre="listo" size={72} style={{ margin: "0 auto 8px" }} />
          Nada vencido ni para hoy.
        </div>
      )}
      {deHoy.length > 0 && (
        <div className="lista-scroll" style={{ maxHeight: ALTO_LISTA, overflowY: "auto" }}>
          {bandas.map(([titulo, lista, color, , critica], i) => (
            <div key={titulo} className={critica ? "banda-critica" : undefined} style={i ? { borderTop: "1px solid var(--border)" } : undefined}>
              <div className="banda" style={{ "--tono": color }}><span>{titulo}</span><span className="num">{lista.length}</span></div>
              {lista.map(fila)}
            </div>
          ))}
        </div>
      )}

      {foco && onQuitarFoco && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "4px 14px" }}>
          <button type="button" className="link-sutil" onClick={onQuitarFoco}>Ver todo</button>
        </div>
      )}
      {!foco && proximos.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <button type="button" className="link-sutil" onClick={() => { setVerProximos(v => { guardar(!v); return !v; }); }} aria-expanded={verProximos} style={{ padding: "12px 18px" }}>
            {verProximos ? "Ocultar" : "Ver"} los próximos días y sin plazo ({proximos.length})
          </button>
          {verProximos && <div className="lista-scroll" style={{ maxHeight: ALTO_LISTA, overflowY: "auto" }}>{proximos.map(fila)}</div>}
        </div>
      )}
      {grupos.length > 0 && (
        <div className="atajos-ayuda" aria-hidden="true">
          <kbd>J</kbd> <kbd>K</kbd> moverse · <kbd>Enter</kbd> abrir · <kbd>H</kbd> hecho · <kbd>P</kbd> posponer · <kbd>R</kbd> reiteré hoy · <kbd>W</kbd> WhatsApp
        </div>
      )}
    </section>
  );
}
