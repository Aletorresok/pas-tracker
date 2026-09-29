import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { listarPapelera } from "../../utils/storage.js";
import Icono from "../ui/Icono.jsx";

const DIAS = 30;
const diasDesde = iso => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

// Casos eliminados en los últimos 30 días, con "Recuperar" (vuelven con su bitácora, agenda y todo lo demás).
export default function Papelera({ todosLosPas, onRestaurar, onClose }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState("");
  const [recuperando, setRecuperando] = useState(null);

  useEffect(() => {
    listarPapelera().then(r => { if (r.error) setError(r.error); setLista(r.lista || []); });
  }, []);

  useEffect(() => {
    const tecla = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onClose]);

  const nombrePas = id => todosLosPas.find(p => String(p.id) === String(id))?.nombre;

  const recuperar = async item => {
    setRecuperando(item.id);
    const caso = await onRestaurar(item.id);
    setRecuperando(null);
    if (caso) setLista(l => l.filter(x => x.id !== item.id));
  };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label="Papelera" onClick={e => e.stopPropagation()}
        style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", width: "100%", maxWidth: 620, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Papelera</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Los casos eliminados quedan acá {DIAS} días y después se borran solos.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--sub)", width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer" }}>
            <Icono nombre="cerrar" size={16} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "6px 18px 14px" }}>
          {lista === null && <div style={{ padding: "16px 0", fontSize: 13, color: "var(--muted)" }}>Cargando…</div>}
          {error && <div role="alert" style={{ padding: "16px 0", fontSize: 13, color: "var(--bad)" }}>{error}</div>}
          {lista && !error && !lista.length && <div style={{ padding: "24px 0", fontSize: 14, color: "var(--sub)", textAlign: "center" }}>La papelera está vacía.</div>}
          {(lista || []).map((it, i) => {
            const hace = diasDesde(it.eliminado_en);
            const quedan = Math.max(0, DIAS - hace);
            return (
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.asegurado || "Sin nombre"}
                    {it.patente && <span style={{ marginLeft: 8, fontFamily: "var(--mono)", fontSize: 12, fontWeight: 400, color: "var(--muted)" }}>{it.patente}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {[it.compania, nombrePas(it.pas_id) && `PAS ${nombrePas(it.pas_id)}`].filter(Boolean).join(" · ") || "—"}
                  </div>
                  <div className="num" style={{ fontSize: 12, color: quedan <= 5 ? "var(--warn)" : "var(--muted)", marginTop: 2 }}>
                    Eliminado {hace <= 0 ? "hoy" : hace === 1 ? "ayer" : `hace ${hace} días`} · {quedan <= 0 ? "se borra hoy" : `se borra en ${quedan} ${quedan === 1 ? "día" : "días"}`}
                  </div>
                </div>
                <button type="button" onClick={() => recuperar(it)} disabled={!!recuperando}
                  style={{ flex: "none", background: "var(--accent)", border: "none", borderRadius: "var(--r-xs)", color: "var(--on-accent)", padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: recuperando ? "default" : "pointer", opacity: recuperando && recuperando !== it.id ? 0.5 : 1 }}>
                  {recuperando === it.id ? "Recuperando…" : "Recuperar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
