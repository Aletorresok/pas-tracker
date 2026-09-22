import { useState } from "react";
import { getExtension } from "../../utils/formatters.js";
import PreviewModal from "./PreviewModal.jsx";

export default function ArchivoRow({ archivo, onDelete, Th }) {
  const [showPreview, setShowPreview] = useState(false);
  const ext = getExtension(archivo.nombre || archivo.name);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: Th?.card || "var(--border)", border: `1px solid ${Th?.border || "var(--border2)"}`, borderRadius: 8, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: Th?.text || "var(--card2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {archivo.nombre || archivo.name}
        </div>
        <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--border2)", color: "var(--border)", textTransform: "uppercase" }}>
          {ext.replace(".", "")}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button 
          onClick={() => setShowPreview(true)}
          style={{ background: "transparent", border: "1px solid var(--muted)", borderRadius: 6, color: "var(--sub)", padding: "4px 8px", fontSize: 12, cursor: "pointer" }}
        >
          Ver
        </button>
        {onDelete && (
          <button 
            onClick={() => onDelete(archivo)}
            style={{ background: "transparent", border: "1px solid color-mix(in srgb, var(--bad) 33%, transparent)", borderRadius: 6, color: "var(--bad)", padding: "4px 8px", fontSize: 12, cursor: "pointer" }}
          >
            
          </button>
        )}
      </div>

      {showPreview && <PreviewModal archivo={archivo} onClose={() => setShowPreview(false)} />}
    </div>
  );
}