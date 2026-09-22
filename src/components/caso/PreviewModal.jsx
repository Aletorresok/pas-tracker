import { useState, useEffect } from "react";
import { getExtension } from "../../utils/formatters.js";

export default function PreviewModal({ archivo, onClose }) {
  const [url, setUrl] = useState(null);
  
  useEffect(() => {
    if (!archivo) return;
    const objectUrl = URL.createObjectURL(archivo.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [archivo]);

  if (!archivo || !url) return null;
  const esImagen = [".jpg", ".jpeg", ".png"].includes(getExtension(archivo.nombre));
  const esPdf = getExtension(archivo.nombre) === ".pdf";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.88)", zIndex: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 780, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>{archivo.nombre}</div>
          <button onClick={onClose} style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--sub)", padding: "4px 12px", cursor: "pointer" }}>✕ Cerrar</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
          {esImagen && <img src={url} alt={archivo.nombre} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 8, objectFit: "contain" }} />}
          {esPdf && <iframe src={url} title={archivo.nombre} style={{ width: "100%", height: "70vh", border: "none", borderRadius: 8 }} />}
          {!esImagen && !esPdf && <div style={{ color: "var(--muted)" }}>Tipo de archivo no soportado para previsualización</div>}
        </div>
      </div>
    </div>
  );
}