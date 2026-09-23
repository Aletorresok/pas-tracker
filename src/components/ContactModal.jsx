import { useState } from "react";
import { RESULTADOS_CONTACTO } from "../constants.js";
import { fechaLocalISO } from "../utils/formatters.js";
import { alpha } from "../utils/theme.js";
import Boton from "./ui/Boton.jsx";

// Registrar un contacto con un PAS: qué respondió y una nota opcional
export default function ContactModal({ pas, onClose, onSave }) {
  const [resultados, setResultados] = useState([]);
  const [nota, setNota] = useState("");
  const [fecha, setFecha] = useState(fechaLocalISO());
  const [guardando, setGuardando] = useState(false);

  const alternar = k => setResultados(r => (r.includes(k) ? r.filter(x => x !== k) : [...r, k]));
  const guardar = async () => {
    setGuardando(true);
    await onSave({ fecha, resultados, nota: nota.trim(), recordatorio: "" });
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-contacto"
      style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, #000 55%, transparent)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="slide-up" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, width: "100%", maxWidth: 440, padding: 20, boxShadow: "var(--shadow)" }}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Registrar contacto</div>
        <div id="titulo-contacto" style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>{pas.nombre || "Sin nombre"}</div>

        <div style={{ fontSize: 13, color: "var(--sub)", marginBottom: 6 }}>¿Qué pasó?</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {RESULTADOS_CONTACTO.map(r => {
            const activo = resultados.includes(r.key);
            return (
              <button key={r.key} type="button" aria-pressed={activo} onClick={() => alternar(r.key)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer", fontWeight: activo ? 600 : 500,
                  border: `1px solid ${activo ? r.color : "var(--border)"}`, background: activo ? alpha(r.color, 14) : "var(--card)", color: "var(--text)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.color }} />{r.label}
              </button>
            );
          })}
        </div>

        <label htmlFor="nota-contacto" style={{ display: "block", fontSize: 13, color: "var(--sub)", marginBottom: 6 }}>Nota <span style={{ color: "var(--muted)" }}>(opcional)</span></label>
        <textarea id="nota-contacto" rows={3} value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: Trabaja con un abogado, volver a escribir en diciembre"
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", resize: "vertical", marginBottom: 12 }} />

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--sub)", marginBottom: 18 }}>
          Fecha
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontFamily: "inherit" }} />
        </label>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Boton onClick={onClose}>Cancelar</Boton>
          <Boton variante="primario" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar contacto"}</Boton>
        </div>
      </div>
    </div>
  );
}
