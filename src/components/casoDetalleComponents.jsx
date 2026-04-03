// casoDetalleComponents.jsx
import { useState, useEffect } from "react";
import { getExtension } from "../utils/casoDetalleUtils.js";

export function Toast({ msg, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  const colors = { success: "#22c55e", error: "#ef4444", info: "#6366f1", warn: "#f97316" };
  const c = colors[type] || colors.info;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 20, zIndex: 999, background: "#1a2535", border: `1px solid ${c}55`, borderRadius: 12, padding: "12px 18px", color: c, fontSize: 14, fontWeight: 600, maxWidth: 340, boxShadow: "0 8px 32px #0008", display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: c, cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
    </div>
  );
}

export function PreviewModal({ archivo, onClose }) {
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
      <div onClick={e => e.stopPropagation()} style={{ background: "#1a2535", border: "1px solid #2d3f55", borderRadius: 16, width: "100%", maxWidth: 780, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #2d3f55" }}>
          <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{archivo.nombre}</div>
          <button onClick={onClose} style={{ background: "#222f42", border: "1px solid #2d3f55", borderRadius: 8, color: "#94a3b8", padding: "4px 12px", cursor: "pointer" }}>✕ Cerrar</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
          {esImagen && <img src={url} alt={archivo.nombre} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 8, objectFit: "contain" }} />}
          {esPdf && <iframe src={url} title={archivo.nombre} style={{ width: "100%", height: "70vh", border: "none", borderRadius: 8 }} />}
          {!esImagen && !esPdf && <div style={{ color: "#64748b" }}>Tipo de archivo no soportado para previsualización</div>}
        </div>
      </div>
    </div>
  );
}

export function ArchivoRow({ archivo, onPreview, onCategorizar, dark, Th, TIPOS_DOC }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const esImagen = [".jpg", ".jpeg", ".png"].includes(archivo.ext);
  const kb = (archivo.tamaño / 1024).toFixed(1);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: Th.card2, borderRadius: 8, padding: "9px 12px", marginBottom: 6, border: `1px solid ${Th.border}` }}>
      <div style={{ fontSize: 20 }}>{esImagen ? "🖼" : "📄"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: Th.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{archivo.nombre}</div>
        <div style={{ fontSize: 11, color: Th.muted }}>{kb} KB · {archivo.tipo || archivo.ext}</div>
      </div>
      <button onClick={onPreview} style={{ background: "#6366f122", border: "1px solid #6366f144", borderRadius: 6, color: "#818cf8", padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Ver</button>
      <div style={{ position: "relative" }}>
        <button onClick={() => setMenuOpen(m => !m)} style={{ background: "#f9731622", border: "1px solid #f9731644", borderRadius: 6, color: "#f97316", padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Categorizar ▾</button>
        {menuOpen && (
          <div style={{ position: "absolute", right: 0, top: "110%", background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 10, zIndex: 50, minWidth: 160, boxShadow: "0 8px 24px #0006", overflow: "hidden" }}>
            {TIPOS_DOC.map(tipo => (
              <button key={tipo} onClick={() => { onCategorizar(tipo); setMenuOpen(false); }} style={{ display: "block", width: "100%", background: "none", border: "none", padding: "9px 14px", color: Th.text, fontSize: 13, cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => e.target.style.background = Th.card2}
                onMouseLeave={e => e.target.style.background = "none"}
              >{tipo}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
