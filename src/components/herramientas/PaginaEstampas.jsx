import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { armarPdf, normalizarImagen, quitarFondoBlanco } from "../../utils/pdfEditor.js";
import { abrirPdf, dibujarPagina, canvasABlob } from "../../utils/pdfjs.js";
import Boton from "../ui/Boton.jsx";

let contador = 0;

// Página en grande para poner imágenes encima (firma, sello, foto). Se arrastran con el mouse o el dedo
// y se ajusta el tamaño. Las posiciones se guardan en fracciones de la página tal como se ve.
export default function PaginaEstampas({ fuente, pagina, onGuardar, onCerrar }) {
  const urls = useRef([]);
  const nuevaUrl = blob => { const u = URL.createObjectURL(blob); urls.current.push(u); return u; };
  const [fondo, setFondo] = useState(null);
  // Las URLs de las imágenes se crean de nuevo cada vez que se abre (al cerrar se liberan)
  const [estampas, setEstampas] = useState(() => pagina.estampas.map(e => ({ ...e, url: nuevaUrl(e.blob) })));
  const [elegida, setElegida] = useState(pagina.estampas.at(-1)?.id ?? null);
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const cajaRef = useRef(null);
  const inputRef = useRef(null);
  const arrastre = useRef(null);

  // Se dibuja la página exactamente como va a salir (rotación incluida), sin las imágenes encima
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const bytes = await armarPdf({ fuentes: { f: fuente }, paginas: [{ ...pagina, fuenteId: "f", estampas: [] }] });
        const doc = await abrirPdf(bytes);
        const { canvas } = await dibujarPagina(doc, 0, { ancho: 1000 });
        doc.destroy();
        const url = URL.createObjectURL(await canvasABlob(canvas, "image/jpeg", 0.85));
        urls.current.push(url);
        if (vivo) setFondo(url);
      } catch (e) {
        console.error("[estampas] dibujar:", e);
        if (vivo) setError("No se pudo mostrar la página.");
      }
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => urls.current.forEach(u => URL.revokeObjectURL(u)), []);

  useEffect(() => {
    const tecla = e => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);

  const agregar = async e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setTrabajando(true);
    try {
      const { blob } = await normalizarImagen(file);
      const id = `e${++contador}`;
      setEstampas(l => [...l, { id, blob, url: nuevaUrl(blob), x: 0.35, y: 0.4, ancho: 0.3 }]);
      setElegida(id);
    } catch {
      setError("No se pudo leer la imagen.");
    }
    setTrabajando(false);
  };

  const cambiar = (id, cambios) => setEstampas(l => l.map(e => (e.id === id ? { ...e, ...cambios } : e)));

  const sinFondo = async id => {
    const e = estampas.find(x => x.id === id);
    setTrabajando(true);
    const blob = await quitarFondoBlanco(e.blob);
    cambiar(id, { blob, url: nuevaUrl(blob), sinFondo: true });
    setTrabajando(false);
  };

  // Arrastre con puntero (mouse, lápiz o dedo)
  const empezar = (ev, e) => {
    ev.preventDefault();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    setElegida(e.id);
    arrastre.current = { id: e.id, px: ev.clientX, py: ev.clientY, x: e.x, y: e.y, el: ev.currentTarget };
  };
  const mover = ev => {
    const a = arrastre.current;
    if (!a) return;
    const caja = cajaRef.current.getBoundingClientRect();
    const im = a.el.getBoundingClientRect();
    const x = Math.min(Math.max(0, a.x + (ev.clientX - a.px) / caja.width), Math.max(0, 1 - im.width / caja.width));
    const y = Math.min(Math.max(0, a.y + (ev.clientY - a.py) / caja.height), Math.max(0, 1 - im.height / caja.height));
    cambiar(a.id, { x, y });
  };
  const soltar = () => { arrastre.current = null; };

  const actual = estampas.find(e => e.id === elegida);

  return createPortal(
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div role="dialog" aria-modal="true" aria-label="Imágenes sobre la página" onClick={e => e.stopPropagation()}
        style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", width: "100%", maxWidth: 980, maxHeight: "94vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Firma, sello o imagen sobre la página</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Arrastrala a donde va. Para firmas, lo ideal es un PNG sin fondo (o usá "Quitar fondo blanco").</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Boton tamaño="sm" variante="fantasma" onClick={onCerrar}>Cancelar</Boton>
            <Boton tamaño="sm" variante="primario" onClick={() => onGuardar(estampas)}>Listo</Boton>
          </div>
        </div>

        <div className="estampas-cuerpo" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 240px", gridAutoRows: "max-content", gap: 16, padding: 16, overflow: "auto", minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", background: "var(--card2)", borderRadius: "var(--r-sm)", padding: 12, minHeight: 200 }}>
            {!fondo && !error && <div style={{ fontSize: 13, color: "var(--muted)", alignSelf: "center" }}>Cargando página…</div>}
            {error && <div role="alert" style={{ fontSize: 13, color: "var(--bad)", alignSelf: "center" }}>{error}</div>}
            {fondo && (
              <div ref={cajaRef} style={{ position: "relative", boxShadow: "0 2px 12px rgba(0,0,0,.25)", lineHeight: 0, touchAction: "none" }}
                onPointerDown={ev => { if (ev.target === ev.currentTarget.firstChild) setElegida(null); }}>
                <img src={fondo} alt="Página" draggable={false} style={{ display: "block", maxWidth: "100%", maxHeight: "70vh", userSelect: "none" }} />
                {estampas.map(e => (
                  <img key={e.id} src={e.url} alt="" draggable={false}
                    onPointerDown={ev => empezar(ev, e)} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}
                    style={{ position: "absolute", left: `${e.x * 100}%`, top: `${e.y * 100}%`, width: `${e.ancho * 100}%`, cursor: "move", touchAction: "none", userSelect: "none",
                      outline: e.id === elegida ? "2px dashed var(--accent)" : "1px dashed color-mix(in srgb, var(--accent) 50%, transparent)", outlineOffset: 2 }} />
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg" hidden onChange={agregar} />
            <Boton variante="primario" onClick={() => inputRef.current?.click()} disabled={trabajando || !fondo}>+ Agregar imagen</Boton>
            {actual ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                <label style={{ fontSize: 13, color: "var(--sub)" }}>
                  Tamaño <span className="num" style={{ color: "var(--text)", fontWeight: 600 }}>{Math.round(actual.ancho * 100)}%</span>
                  <input type="range" min="5" max="100" value={Math.round(actual.ancho * 100)}
                    onChange={ev => cambiar(actual.id, { ancho: Number(ev.target.value) / 100, x: Math.min(actual.x, 1 - Number(ev.target.value) / 100) })}
                    style={{ width: "100%", accentColor: "var(--accent)" }} />
                </label>
                {!actual.sinFondo && <Boton tamaño="sm" onClick={() => sinFondo(actual.id)} disabled={trabajando}>Quitar fondo blanco</Boton>}
                <Boton tamaño="sm" variante="peligro" onClick={() => { setEstampas(l => l.filter(e => e.id !== actual.id)); setElegida(null); }}>Quitar esta imagen</Boton>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                {estampas.length ? "Tocá una imagen para cambiarle el tamaño o quitarla." : "Todavía no hay imágenes en esta página."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
