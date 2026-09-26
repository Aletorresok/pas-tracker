import { useState } from "react";
import { supabase } from "../../supabase.js";
import { ESTADOS_CASO } from "../../constants.js";
import { fechaLocalISO } from "../../utils/formatters.js";
import { fechasAlCambiarEstado, textoCambioEstado, accionSugerida, ESTADOS_CON_AVISO } from "../../utils/flujoEstados.js";
import { registrarAccion } from "../../utils/storage.js";
import { useMargenes } from "../../utils/margenes.js";
import EstadoPill from "../ui/EstadoPill.jsx";
import PlazoChip from "../ui/PlazoChip.jsx";
import SugerenciaEstado from "../caso/SugerenciaEstado.jsx";
import AvisarWhatsApp from "../caso/AvisarWhatsApp.jsx";

// Columnas: los estados en curso. Cobrado y Desistido se cierran desde la ficha (Pagos o estado).
const COLUMNAS = ESTADOS_CASO.filter(e => !["cobrado", "desistido"].includes(e.key));

// Tablero por etapas: arrastrás un caso a otra columna para cambiarle el estado (mismo flujo que la ficha:
// fecha de la etapa, nota en la bitácora, próxima acción sugerida y aviso al cliente). Tocar un caso abre la ficha.
export default function TableroCasos({ casos, todosLosPas, onAbrir, onCasoLocal }) {
  const margenes = useMargenes();
  const [arrastrando, setArrastrando] = useState(null); // id del caso
  const [sobre, setSobre] = useState(null); // estado de la columna bajo el cursor
  const [sugerencia, setSugerencia] = useState(null); // { caso, estado, accion, avisar }
  const [error, setError] = useState("");

  const guardar = async (caso, cambios) => {
    const { error: err } = await supabase.from("pas_casos").update(cambios).eq("id", caso.id);
    if (err) { setError("No se pudo guardar el cambio: " + err.message); return null; }
    const actualizado = { ...caso, ...cambios };
    onCasoLocal(actualizado);
    return actualizado;
  };

  const soltar = async (estado) => {
    setSobre(null);
    const caso = casos.find(c => c.id === arrastrando);
    setArrastrando(null);
    if (!caso || caso.estado === estado) return;
    setError("");
    const cambios = { estado, ...fechasAlCambiarEstado(caso, estado), fecha_ultimo_movimiento: fechaLocalISO() };
    const actualizado = await guardar(caso, cambios);
    if (!actualizado) return;
    registrarAccion(caso.id, textoCambioEstado(caso.estado, estado));
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

      <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(230px, 1fr)", gap: 10, overflowX: "auto", paddingBottom: 6, alignItems: "start" }}>
        {COLUMNAS.map(col => {
          const lista = casos.filter(c => c.estado === col.key);
          const activa = sobre === col.key && arrastrando;
          return (
            <section key={col.key} aria-label={col.label}
              onDragOver={e => { if (arrastrando) { e.preventDefault(); setSobre(col.key); } }}
              onDragLeave={() => setSobre(s => (s === col.key ? null : s))}
              onDrop={e => { e.preventDefault(); soltar(col.key); }}
              style={{ background: activa ? "color-mix(in srgb, var(--accent) 10%, var(--card2))" : "var(--card2)", border: `1px solid ${activa ? "var(--accent)" : "var(--border)"}`, borderRadius: 12, padding: 8, minHeight: 120, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px 4px" }}>
                <EstadoPill estado={col.key} size="sm" />
                <span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{lista.length}</span>
              </div>
              {lista.map(c => (
                <button key={c.id} type="button" draggable
                  onDragStart={e => { setArrastrando(c.id); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => { setArrastrando(null); setSobre(null); }}
                  onClick={() => onAbrir(c)}
                  style={{ textAlign: "left", font: "inherit", color: "var(--text)", cursor: "grab", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 3, opacity: arrastrando === c.id ? 0.5 : 1 }}>
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
                </button>
              ))}
            </section>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>Arrastrá un caso a otra columna para cambiarle el estado. Tocalo para abrir la ficha. Cobrado y Desistido se cierran desde la ficha.</div>
    </div>
  );
}
