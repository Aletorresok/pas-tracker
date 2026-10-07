import { useState } from "react";
import { createPortal } from "react-dom";
import { TIPOS_BIBLIOTECA, TEMAS_BIBLIOTECA, JURISDICCIONES_BIBLIOTECA, RESULTADOS_BIBLIOTECA, guardarEnBiblioteca } from "../../utils/biblioteca.js";
import Boton from "../ui/Boton.jsx";

const campo = { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 };
const etiqueta = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--sub)" };

// Alta o edición de un fallo, un trabajo de doctrina o una norma. onGuardado(registro) con lo que quedó en la base.
export default function FormularioBiblioteca({ inicial, tipoInicial = "fallo", onCerrar, onGuardado }) {
  const [x, setX] = useState(() => inicial ? { ...inicial } : { tipo: tipoInicial, titulo: "", temas: [], favorito: false });
  const [otroTema, setOtroTema] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setX(p => ({ ...p, [k]: v }));
  const temas = x.temas || [];
  const alternar = t => set("temas", temas.includes(t) ? temas.filter(y => y !== t) : [...temas, t]);
  const sumarOtro = () => { const t = otroTema.trim().toLowerCase(); if (t && !temas.includes(t)) set("temas", [...temas, t]); setOtroTema(""); };

  const guardar = async () => {
    if (!x.titulo?.trim()) { setError(x.tipo === "fallo" ? "Falta la carátula." : x.tipo === "norma" ? "Falta la norma." : "Falta el título."); return; }
    setGuardando(true); setError("");
    const r = await guardarEnBiblioteca({ ...x, titulo: x.titulo.trim() });
    setGuardando(false);
    if (r.error) { setError("No se pudo guardar: " + r.error); return; }
    onGuardado(r.data);
  };

  const fallo = x.tipo === "fallo", doctrina = x.tipo === "doctrina", norma = x.tipo === "norma";
  return createPortal(
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label={inicial ? "Editar" : "Cargar en la Biblioteca"} onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === "Escape") onCerrar(); }}
        style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-3)", width: "100%", maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{inicial ? "Editar" : "Cargar en la Biblioteca"}</div>
          {!inicial && (
            <div className="segmentado" role="group" aria-label="Tipo">
              {TIPOS_BIBLIOTECA.map(t => <button key={t.k} type="button" aria-pressed={x.tipo === t.k} onClick={() => set("tipo", t.k)}>{t.l}</button>)}
            </div>
          )}
        </div>
        <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={etiqueta}>{fallo ? "Carátula" : norma ? "Norma (ej.: Ley de Seguros 17.418)" : "Título"}
            <input autoFocus value={x.titulo || ""} onChange={e => set("titulo", e.target.value)} style={campo} /></label>
          {fallo && <>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 10 }}>
              <label style={etiqueta}>Tribunal<input value={x.tribunal || ""} onChange={e => set("tribunal", e.target.value)} placeholder="Cámara Nacional de Apelaciones en lo Civil" style={campo} /></label>
              <label style={etiqueta}>Sala<input value={x.sala || ""} onChange={e => set("sala", e.target.value)} style={campo} /></label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              <label style={etiqueta}>Fecha<input type="date" value={x.fecha || ""} onChange={e => set("fecha", e.target.value)} style={campo} /></label>
              <label style={etiqueta}>Jurisdicción
                <select value={x.jurisdiccion || ""} onChange={e => set("jurisdiccion", e.target.value)} style={campo}>
                  <option value="">—</option>{JURISDICCIONES_BIBLIOTECA.map(j => <option key={j.k} value={j.k}>{j.l}</option>)}
                </select></label>
              <label style={etiqueta}>Para el reclamante
                <select value={x.resultado || ""} onChange={e => set("resultado", e.target.value)} style={campo}>
                  <option value="">—</option>{RESULTADOS_BIBLIOTECA.map(r => <option key={r.k} value={r.k}>{r.l}</option>)}
                </select></label>
            </div>
          </>}
          {doctrina && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1fr)", gap: 10 }}>
              <label style={etiqueta}>Autor<input value={x.autor || ""} onChange={e => set("autor", e.target.value)} style={campo} /></label>
              <label style={etiqueta}>Publicación<input value={x.publicacion || ""} onChange={e => set("publicacion", e.target.value)} placeholder="La Ley, RCyS…" style={campo} /></label>
              <label style={etiqueta}>Año<input inputMode="numeric" value={x.anio || ""} onChange={e => set("anio", e.target.value.replace(/\D/g, "").slice(0, 4))} style={campo} /></label>
            </div>
          )}
          {norma && <label style={etiqueta}>Artículos<input value={x.articulos || ""} onChange={e => set("articulos", e.target.value)} placeholder="1746 y 1747" style={campo} /></label>}
          <label style={etiqueta}>{fallo ? "Sumario" : doctrina ? "Resumen" : "Qué dice"}
            <textarea rows={4} value={x.sumario || ""} onChange={e => set("sumario", e.target.value)} style={{ ...campo, resize: "vertical" }} /></label>
          <label style={etiqueta}>Link a la fuente<input type="url" value={x.url || ""} onChange={e => set("url", e.target.value)} placeholder="https://www.saij.gob.ar/…" style={campo} /></label>
          <div style={etiqueta}>Temas
            <div className="chips" style={{ flexWrap: "wrap", overflow: "visible" }}>
              {[...TEMAS_BIBLIOTECA, ...temas.filter(t => !TEMAS_BIBLIOTECA.includes(t))].map(t => (
                <button key={t} type="button" className="chip" aria-pressed={temas.includes(t)} onClick={() => alternar(t)}>{t}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={otroTema} onChange={e => setOtroTema(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sumarOtro(); } }} placeholder="Otro tema" aria-label="Otro tema" style={{ ...campo, flex: 1 }} />
              <Boton tamaño="sm" onClick={sumarOtro} disabled={!otroTema.trim()}>Sumar</Boton>
            </div>
          </div>
          <label style={etiqueta}>Notas propias<textarea rows={2} value={x.notas || ""} onChange={e => set("notas", e.target.value)} placeholder="Para qué te sirvió, en qué caso lo usaste…" style={{ ...campo, resize: "vertical" }} /></label>
          {error && <div role="alert" style={{ color: "var(--bad)", fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Boton variante="fantasma" onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Boton>
        </div>
      </div>
    </div>,
    document.body
  );
}
