import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cargarImagen, detectarHoja, margenCompleto, procesarPagina, nuevoCanvas, FILTROS } from "../../utils/escaner.js";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";

const LADO_VISTA = 700;

// Ajustar una página escaneada: mover las cuatro esquinas de la hoja, elegir filtro y rotar,
// con vista previa del resultado.
export default function RecorteEscaner({ pagina, onGuardar, onCerrar }) {
  const [foto, setFoto] = useState(null); // { url, ancho, alto, chico, k }
  const [esquinas, setEsquinas] = useState(pagina.esquinas);
  const [filtro, setFiltro] = useState(pagina.filtro);
  const [rotacion, setRotacion] = useState(pagina.rotacion);
  const [vista, setVista] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const original = useRef(null);
  const svgRef = useRef(null);
  const arrastre = useRef(null);
  const urls = useRef([]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const c = await cargarImagen(pagina.blobOriginal);
      if (!vivo) return;
      original.current = c;
      const k = Math.min(1, LADO_VISTA / Math.max(c.width, c.height));
      const chico = nuevoCanvas(c.width * k, c.height * k);
      chico.getContext("2d").drawImage(c, 0, 0, chico.width, chico.height);
      const url = URL.createObjectURL(pagina.blobOriginal);
      urls.current.push(url);
      setFoto({ url, ancho: c.width, alto: c.height, chico, k });
    })();
    return () => { vivo = false; urls.current.forEach(u => URL.revokeObjectURL(u)); };
  }, [pagina.blobOriginal]);

  // Vista previa en chico (rápida) cada vez que cambia algo, salvo mientras se arrastra
  useEffect(() => {
    if (!foto || arrastre.current) return;
    let vivo = true;
    const t = setTimeout(async () => {
      const esq = esquinas.map(p => ({ x: p.x * foto.k, y: p.y * foto.k }));
      const blob = await procesarPagina(foto.chico, { esquinas: esq, filtro, rotacion }, 0.8);
      if (!vivo) return;
      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      setVista(url);
    }, 120);
    return () => { vivo = false; clearTimeout(t); };
  }, [foto, esquinas, filtro, rotacion]);

  useEffect(() => {
    const tecla = e => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);

  const aFoto = ev => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: Math.min(foto.ancho, Math.max(0, ((ev.clientX - r.left) / r.width) * foto.ancho)), y: Math.min(foto.alto, Math.max(0, ((ev.clientY - r.top) / r.height) * foto.alto)) };
  };
  const empezar = (ev, i) => { ev.preventDefault(); ev.currentTarget.setPointerCapture(ev.pointerId); arrastre.current = i; };
  const mover = ev => { if (arrastre.current === null) return; const p = aFoto(ev); setEsquinas(es => es.map((q, j) => (j === arrastre.current ? p : q))); };
  const soltar = () => { arrastre.current = null; setEsquinas(es => [...es]); };

  const guardar = async () => {
    setTrabajando(true);
    await onGuardar({ esquinas, filtro, rotacion });
  };

  const radio = foto ? Math.max(foto.ancho, foto.alto) / 45 : 0;

  return createPortal(
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
      <div role="dialog" aria-modal="true" aria-label="Ajustar página" onClick={e => e.stopPropagation()}
        style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", width: "100%", maxWidth: 1000, maxHeight: "96vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Ajustar página</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Arrastrá los círculos a las puntas de la hoja.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Boton tamaño="sm" variante="fantasma" onClick={onCerrar}>Cancelar</Boton>
            <Boton tamaño="sm" variante="primario" onClick={guardar} disabled={!foto || trabajando}>{trabajando ? "Procesando…" : "Listo"}</Boton>
          </div>
        </div>

        <div className="escaner-cuerpo" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)", gridAutoRows: "max-content", gap: 14, padding: 14, overflow: "auto", minHeight: 0 }}>
          <div style={{ background: "#111", borderRadius: "var(--r-sm)", padding: 8, display: "flex", justifyContent: "center" }}>
            {!foto ? <div style={{ color: "#aaa", fontSize: 13, padding: 40 }}>Cargando foto…</div> : (
              <div style={{ position: "relative", lineHeight: 0, touchAction: "none" }}>
                <img src={foto.url} alt="Foto original" draggable={false} style={{ display: "block", maxWidth: "100%", maxHeight: "62vh", userSelect: "none" }} />
                <svg ref={svgRef} viewBox={`0 0 ${foto.ancho} ${foto.alto}`} preserveAspectRatio="none"
                  onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none" }}>
                  <polygon points={esquinas.map(p => `${p.x},${p.y}`).join(" ")} fill="rgba(80,160,255,.18)" stroke="#4da3ff" strokeWidth={radio / 4} />
                  {esquinas.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={radio} fill="rgba(77,163,255,.35)" stroke="#fff" strokeWidth={radio / 5}
                      onPointerDown={ev => empezar(ev, i)} style={{ cursor: "grab", touchAction: "none" }} />
                  ))}
                </svg>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Boton tamaño="sm" onClick={() => original.current && setEsquinas(detectarHoja(original.current))} disabled={!foto}>Detectar la hoja</Boton>
              <Boton tamaño="sm" onClick={() => foto && setEsquinas(margenCompleto(foto.ancho, foto.alto, 0))} disabled={!foto}>Toda la foto</Boton>
              <Boton tamaño="sm" variante="fantasma" onClick={() => setRotacion(r => (r + 270) % 360)} aria-label="Rotar a la izquierda"><Icono nombre="recargar" size={14} style={{ transform: "scaleX(-1)" }} /></Boton>
              <Boton tamaño="sm" variante="fantasma" onClick={() => setRotacion(r => (r + 90) % 360)} aria-label="Rotar a la derecha"><Icono nombre="recargar" size={14} /></Boton>
            </div>
            <div role="radiogroup" aria-label="Filtro" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FILTROS.map(f => (
                <button key={f.k} type="button" role="radio" aria-checked={filtro === f.k} onClick={() => setFiltro(f.k)}
                  style={{ font: "inherit", fontSize: 13, fontWeight: 600, padding: "6px 12px", borderRadius: "var(--r-xl)", cursor: "pointer", border: `1px solid ${filtro === f.k ? "var(--text)" : "var(--border)"}`, background: filtro === f.k ? "var(--text)" : "var(--card)", color: filtro === f.k ? "var(--bg)" : "var(--sub)" }}>{f.l}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--sub)" }}>Vista previa</div>
            <div style={{ background: "var(--card2)", borderRadius: "var(--r-sm)", padding: 8, display: "flex", justifyContent: "center", minHeight: 160 }}>
              {vista ? <img src={vista} alt="Vista previa" style={{ maxWidth: "100%", maxHeight: "42vh", boxShadow: "0 1px 6px rgba(0,0,0,.25)" }} /> : <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>…</span>}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
