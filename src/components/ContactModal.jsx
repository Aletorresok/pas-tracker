import { useState } from "react";
import { fechaLocalISO } from "../utils/formatters.js";
import Boton from "./ui/Boton.jsx";

const OPCIONES = [
  { k: "seguimiento", l: "Sigue en seguimiento", d: "Queda en Contactados" },
  { k: "deriva", l: "Deriva casos", d: "Pasa a Derivadores y a Clientes" },
  { k: "descarta", l: "Descartado", d: "Sale de la lista" },
];

// Registrar un contacto con un PAS y cómo quedó
export default function ContactModal({ pas, esDerivador, esDescartado, onClose, onSave }) {
  const [fecha, setFecha] = useState(fechaLocalISO());
  const [decision, setDecision] = useState(esDerivador ? "deriva" : esDescartado ? "descarta" : "seguimiento");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    await onSave({ fecha, resultados: [], nota: "", decision });
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-contacto"
      style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, #000 55%, transparent)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="slide-up" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, width: "100%", maxWidth: 400, padding: 20, boxShadow: "var(--shadow)" }}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Registrar contacto</div>
        <div id="titulo-contacto" style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>{pas.nombre || "Sin nombre"}</div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--sub)", marginBottom: 14 }}>
          Fecha
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontFamily: "inherit" }} />
        </label>

        <div role="radiogroup" aria-label="Cómo quedó" style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
          {OPCIONES.map(o => {
            const activa = decision === o.k;
            return (
              <button key={o.k} type="button" role="radio" aria-checked={activa} onClick={() => setDecision(o.k)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left", font: "inherit",
                  border: `1px solid ${activa ? "var(--text)" : "var(--border)"}`, background: activa ? "var(--card2)" : "var(--card)" }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", flex: "none", border: `2px solid ${activa ? "var(--accent)" : "var(--border2)"}`, boxShadow: activa ? "inset 0 0 0 3px var(--card2)" : "none", background: activa ? "var(--accent)" : "transparent" }} />
                <span>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{o.l}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{o.d}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Boton onClick={onClose}>Cancelar</Boton>
          <Boton variante="primario" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar contacto"}</Boton>
        </div>
      </div>
    </div>
  );
}
