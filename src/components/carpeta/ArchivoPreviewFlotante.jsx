import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const RETRASO_MS = 200;
const ANCHO = 240;
const ALTO = 300;

const IMAGENES = [".jpg", ".jpeg", ".png"];

// Vista previa al hoverear una fila de la carpeta local: imagen o primera página del PDF,
// sin abrir el modal. Se ancla al lado de la fila y no capta el mouse (pointerEvents: none)
// para que el hover de la fila decida cuándo se muestra. Va en un portal: la ficha del caso
// tiene transform, y un position: fixed adentro quedaría relativo a la ficha y recortado.
export default function ArchivoPreviewFlotante({ archivo, anchorRef, activo }) {
  const [url, setUrl] = useState(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!activo || !archivo) { setUrl(null); setPos(null); return; }
    const t = setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const arriba = window.innerHeight - rect.top < ALTO + 16;
      const izquierda = rect.right + 12 + ANCHO > window.innerWidth;
      setPos({
        top: arriba ? undefined : rect.top,
        bottom: arriba ? window.innerHeight - rect.bottom : undefined,
        left: izquierda ? undefined : rect.right + 12,
        right: izquierda ? window.innerWidth - rect.left + 12 : undefined,
      });
      setUrl(URL.createObjectURL(archivo.blob));
    }, RETRASO_MS);
    return () => clearTimeout(t);
  }, [activo, archivo, anchorRef]);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  if (!activo || !url || !pos) return null;
  const esImagen = IMAGENES.includes(archivo.ext);
  const esPdf = archivo.ext === ".pdf";

  return createPortal(
    <div style={{
      position: "fixed", ...pos, zIndex: 10000, pointerEvents: "none",
      background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10,
      boxShadow: "0 12px 32px #0008", padding: 6, width: ANCHO,
    }}>
      {esImagen && (
        <img src={url} alt="" style={{ width: "100%", maxHeight: ALTO, objectFit: "contain", borderRadius: 6, display: "block" }} />
      )}
      {esPdf && (
        <iframe src={`${url}#toolbar=0&view=FitH`} title="Vista previa" style={{ width: "100%", height: ALTO, border: "none", borderRadius: 6 }} />
      )}
      {!esImagen && !esPdf && (
        <div style={{ fontSize: 11, color: "var(--muted)", padding: 8, textAlign: "center" }}>Sin vista previa</div>
      )}
    </div>,
    document.body
  );
}
