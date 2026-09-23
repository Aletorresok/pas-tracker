import { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabase.js";
import { ESTADOS_CASO } from "../../constants.js";
import { fechaEnDias, diasHasta, fmtDate } from "../../utils/formatters.js";
import { alpha } from "../../utils/theme.js";
import CampoMonto from "../ui/CampoMonto.jsx";
import PlazoChip from "../ui/PlazoChip.jsx";
import Boton from "../ui/Boton.jsx";

// Campos que se editan desde la fila desplegada de la tabla
const CAMPOS = ["estado", "proxima_accion", "proxima_accion_vence", "mensaje_cliente", "monto_reclamado", "monto_ofrecimiento", "monto_cobro_yo", "monto_comision_pas", "dni_asegurado"];
const MONTOS = [
  { k: "monto_reclamado", l: "Reclamado" },
  { k: "monto_ofrecimiento", l: "Ofrecido" },
  { k: "monto_cobro_yo", l: "Mis honorarios" },
  { k: "monto_comision_pas", l: "Comisión PAS" },
];
const PLAZOS = [0, 1, 3, 7, 15, 30];
const ESTADOS_FINALES = ["cobrado", "desistido"];

const aBorrador = c => Object.fromEntries(CAMPOS.map(k => [k, c[k] ?? ""]));
// "" se guarda como null; los montos numéricos como número
const aFila = (k, v) => {
  if (v === "" || v === undefined) return null;
  if (k.startsWith("monto_") && k !== "monto_reclamado") return Number(v);
  return v;
};

export default function FilaExpandida({ caso, onCasoLocal, onAbrirFicha, onEliminar }) {
  const [borrador, setBorrador] = useState(() => aBorrador(caso));
  const [estadoGuardado, setEstadoGuardado] = useState("guardado"); // guardado | pendiente | guardando | error
  const [deshacer, setDeshacer] = useState(null); // { anterior, nuevo }
  const casoRef = useRef(caso);
  casoRef.current = caso;

  const cambiar = (k, v) => { setBorrador(b => ({ ...b, [k]: v })); setEstadoGuardado("pendiente"); };

  // Guardado automático: 1,2 s después del último cambio, solo los campos que cambiaron
  useEffect(() => {
    if (estadoGuardado !== "pendiente") return;
    const t = setTimeout(async () => {
      const actual = casoRef.current;
      const cambios = {};
      CAMPOS.forEach(k => {
        const nuevo = aFila(k, borrador[k]);
        const viejo = actual[k] === "" || actual[k] === undefined ? null : actual[k];
        if (String(nuevo ?? "") !== String(viejo ?? "")) cambios[k] = nuevo;
      });
      if (!Object.keys(cambios).length) { setEstadoGuardado("guardado"); return; }
      setEstadoGuardado("guardando");
      const { error } = await supabase.from("pas_casos").update(cambios).eq("id", actual.id);
      if (error) { console.error("[FilaExpandida] error al guardar:", error); setEstadoGuardado("error"); return; }
      onCasoLocal({ ...actual, ...cambios });
      setEstadoGuardado("guardado");
    }, 1200);
    return () => clearTimeout(t);
  }, [borrador, estadoGuardado, onCasoLocal]);

  const cambiarEstado = (nuevo) => {
    if (nuevo === borrador.estado) return;
    if (ESTADOS_FINALES.includes(nuevo)) setDeshacer({ anterior: borrador.estado, nuevo });
    cambiar("estado", nuevo);
  };
  useEffect(() => {
    if (!deshacer) return;
    const t = setTimeout(() => setDeshacer(null), 6000);
    return () => clearTimeout(t);
  }, [deshacer]);

  const faltan = diasHasta(borrador.proxima_accion_vence);
  const etiqueta = { display: "block", fontSize: 12, color: "var(--sub)", marginBottom: 4 };
  const area = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", resize: "vertical", minHeight: 40 };
  const chip = activo => ({ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${activo ? "var(--text)" : "var(--border)"}`, background: activo ? "var(--text)" : "var(--card)", color: activo ? "var(--bg)" : "var(--sub)" });

  const textoGuardado = { guardado: "✓ Guardado", pendiente: "Cambios sin guardar…", guardando: "Guardando…", error: "No se pudo guardar · reintentar" }[estadoGuardado];
  const colorGuardado = { guardado: "var(--ok)", pendiente: "var(--muted)", guardando: "var(--muted)", error: "var(--warn)" }[estadoGuardado];

  return (
    <div className="fila-exp" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 16, padding: "4px 16px 16px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <div>
          <span style={etiqueta}>Estado · tocá para cambiar</span>
          <div role="radiogroup" aria-label="Estado del caso" style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {ESTADOS_CASO.map(e => {
              const activo = borrador.estado === e.key;
              return (
                <button key={e.key} type="button" role="radio" aria-checked={activo} onClick={() => cambiarEstado(e.key)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: activo ? 700 : 500, cursor: "pointer",
                    border: `1px solid ${activo ? e.color : "var(--border)"}`,
                    background: activo ? alpha(e.color, 16) : "var(--card)",
                    color: activo ? "var(--text)" : "var(--sub)",
                  }}>
                  {e.label}
                </button>
              );
            })}
          </div>
          {deshacer && (
            <div role="status" style={{ marginTop: 8, display: "inline-flex", gap: 12, alignItems: "center", background: "var(--text)", color: "var(--bg)", borderRadius: 8, padding: "6px 12px", fontSize: 13 }}>
              Estado cambiado a {ESTADOS_CASO.find(e => e.key === deshacer.nuevo)?.label}
              <button type="button" onClick={() => { cambiar("estado", deshacer.anterior); setDeshacer(null); }}
                style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 13 }}>Deshacer</button>
            </div>
          )}
        </div>

        <div>
          <label htmlFor={`pa-${caso.id}`} style={{ ...etiqueta, color: "var(--warn)", fontWeight: 600 }}>Próxima acción · solo vos</label>
          <textarea id={`pa-${caso.id}`} rows={2} value={borrador.proxima_accion} onChange={e => cambiar("proxima_accion", e.target.value)} placeholder="Qué tenés que hacer con este caso" style={area} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", marginTop: 6 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 2 }}>Plazo:</span>
            {PLAZOS.map(n => (
              <button key={n} type="button" aria-pressed={faltan === n} onClick={() => cambiar("proxima_accion_vence", fechaEnDias(n))} style={chip(faltan === n)}>{n === 0 ? "Hoy" : `${n} d`}</button>
            ))}
            {borrador.proxima_accion_vence && (
              <>
                <PlazoChip vence={borrador.proxima_accion_vence} />
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{fmtDate(borrador.proxima_accion_vence)}</span>
                <button type="button" onClick={() => cambiar("proxima_accion_vence", "")} style={{ background: "none", border: "none", color: "var(--sub)", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: 0 }}>Quitar</button>
              </>
            )}
          </div>
        </div>

        <div>
          <label htmlFor={`dni-${caso.id}`} style={etiqueta}>DNI del asegurado <span style={{ color: "var(--muted)" }}>· con la patente, el cliente consulta su caso</span></label>
          <input id={`dni-${caso.id}`} inputMode="numeric" value={borrador.dni_asegurado} onChange={e => cambiar("dni_asegurado", e.target.value)} placeholder="Ej: 25123456"
            style={{ ...area, maxWidth: 200, minHeight: 0 }} />
        </div>

        <div>
          <label htmlFor={`mc-${caso.id}`} style={etiqueta}>Mensaje para el cliente <span style={{ color: "var(--muted)" }}>· lo ven el PAS y el cliente</span></label>
          <textarea id={`mc-${caso.id}`} rows={2} value={borrador.mensaje_cliente} onChange={e => cambiar("mensaje_cliente", e.target.value)} placeholder="Ej: El reclamo está en la compañía. Estimamos respuesta en 15 días." style={area} />
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        {MONTOS.map(m => (
          <div key={m.k} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 140px", gap: 10, alignItems: "center" }}>
            <label htmlFor={`${m.k}-${caso.id}`} style={{ fontSize: 13, color: "var(--sub)" }}>{m.l}</label>
            <CampoMonto id={`${m.k}-${caso.id}`} value={borrador[m.k]} onChange={v => cambiar(m.k, v)} />
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <span role="status" style={{ fontSize: 12, color: colorGuardado, fontWeight: 600 }}>
            {estadoGuardado === "error"
              ? <button type="button" onClick={() => setEstadoGuardado("pendiente")} style={{ background: "none", border: "none", color: "inherit", font: "inherit", cursor: "pointer", padding: 0, textDecoration: "underline" }}>{textoGuardado}</button>
              : textoGuardado}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <Boton variante="peligro" tamaño="sm" onClick={onEliminar}>Eliminar</Boton>
            <Boton variante="primario" tamaño="sm" onClick={onAbrirFicha}>Abrir ficha completa</Boton>
          </div>
        </div>
      </div>
    </div>
  );
}
