import { useState } from "react";
import { supabase } from "../../supabase.js";
import { fechaLocalISO } from "../../utils/formatters.js";
import { fechasAlCambiarEstado, textoCambioEstado, accionSugerida, ESTADOS_CON_AVISO, pideDialogoEtapa } from "../../utils/flujoEstados.js";
import { registrarAccion } from "../../utils/storage.js";
import { cargarCompania, aceptarUltimaPendiente } from "../../utils/ofertas.js";
import { useMargenes } from "../../utils/margenes.js";
import SugerenciaEstado from "../caso/SugerenciaEstado.jsx";
import AvisarWhatsApp from "../caso/AvisarWhatsApp.jsx";
import DialogoEtapa from "../caso/DialogoEtapa.jsx";

// Mover un caso de etapa sin abrir la ficha (tablero, "Mover a" del menú, etiqueta de estado en la tabla).
// Mismo flujo que la ficha: pregunta lo que haga falta (DialogoEtapa), completa la fecha de la etapa, lo anota
// en la bitácora y propone la próxima acción y el aviso al cliente en un cartel flotante que no corre la pantalla.
// Devuelve { mover(caso, estado), ui } — `ui` va una vez en la pantalla.
export function useMoverCaso({ todosLosPas, onCasoLocal }) {
  const margenes = useMargenes();
  const [sugerencia, setSugerencia] = useState(null); // { caso, estado, accion, avisar }
  const [dialogo, setDialogo] = useState(null); // { caso, estado, plazoCompania }
  const [error, setError] = useState("");

  const guardar = async (caso, cambios) => {
    const { error: err } = await supabase.from("pas_casos").update(cambios).eq("id", caso.id);
    if (err) { setError("No se pudo guardar el cambio: " + err.message); return null; }
    const actualizado = { ...caso, ...cambios };
    onCasoLocal(actualizado);
    return actualizado;
  };

  const aplicar = async (caso, estado, { cambios: delDialogo = {}, nota = "" } = {}) => {
    setError("");
    const cambios = { estado, ...fechasAlCambiarEstado(caso, estado), fecha_ultimo_movimiento: fechaLocalISO() };
    // Con acuerdo y sin plazo cargado, el plazo de pago de la compañía
    if (estado === "esperando_pago" && !Number(caso.plazo_pago)) {
      const plazo = Number((await cargarCompania(caso.compania_aseguradora))?.plazo_pago_dias);
      if (plazo) cambios.plazo_pago = plazo;
    }
    Object.assign(cambios, delDialogo); // lo que se contestó pisa lo automático
    const actualizado = await guardar(caso, cambios);
    if (!actualizado) return;
    registrarAccion(caso.id, textoCambioEstado(caso.estado, estado, nota), { visiblePas: true });
    // La última oferta sin responder queda aceptada y, si no hay monto acordado, es ese
    if (estado === "esperando_pago") aceptarUltimaPendiente(caso.id).then(o => o && !Number(actualizado.monto_acordado) && guardar(actualizado, { monto_acordado: o.monto }));
    const accion = accionSugerida(actualizado, margenes || {});
    const avisar = ESTADOS_CON_AVISO.includes(estado);
    setSugerencia(accion || avisar ? { caso: actualizado, estado, accion, avisar } : null);
  };

  const mover = async (caso, estado) => {
    if (!caso || caso.estado === estado) return;
    if (!pideDialogoEtapa(caso, estado)) { aplicar(caso, estado); return; }
    const plazoCompania = estado === "esperando_pago" ? Number((await cargarCompania(caso.compania_aseguradora))?.plazo_pago_dias) || null : null;
    setDialogo({ caso, estado, plazoCompania });
  };

  const pasDe = c => todosLosPas.find(p => String(p.id) === String(c._pasId));

  const ui = (
    <>
      {dialogo && <DialogoEtapa caso={dialogo.caso} nuevo={dialogo.estado} plazoCompania={dialogo.plazoCompania}
        onCancelar={() => setDialogo(null)} onConfirmar={r => { const d = dialogo; setDialogo(null); aplicar(d.caso, d.estado, r); }} />}
      {(sugerencia || error) && (
        <div role="region" aria-label="Después de mover el caso" className="slide-up"
          style={{ position: "fixed", right: 16, bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", zIndex: 600, width: "min(440px, calc(100vw - 32px))", maxHeight: "70vh", overflowY: "auto",
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-3)", padding: 14 }}>
          {error && <div role="alert" style={{ color: "var(--bad)", fontSize: 13, marginBottom: sugerencia ? 8 : 0 }}>{error}</div>}
          {sugerencia && <>
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
          </>}
          {!sugerencia && <button type="button" onClick={() => setError("")} style={{ marginTop: 6, background: "none", border: "none", padding: 0, font: "inherit", fontSize: 12, color: "var(--sub)", cursor: "pointer" }}>Cerrar</button>}
        </div>
      )}
    </>
  );

  return { mover, ui };
}
