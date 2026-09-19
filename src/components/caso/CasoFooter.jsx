import React from 'react';

export default function CasoFooter({ 
  Th, setModalEscrito, handleExportarPDF, exportandoPDF, 
  recargarArchivos, archivosActualizando, onClose, guardarCaso, guardando 
}) {
  return (
    <>
      {/* Acciones rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <button onClick={() => setModalEscrito(true)} style={{ background: "#f97316", border: "none", borderRadius: 8, color: "white", padding: "12px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          📝 Escrito
        </button>
        <button
          onClick={handleExportarPDF}
          disabled={exportandoPDF}
          style={{ background: exportandoPDF ? Th.card2 : "#8b5cf6", border: "none", borderRadius: 8, color: "white", padding: "12px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: exportandoPDF ? 0.5 : 1 }}
        >
          {exportandoPDF ? "..." : "📄 Exportar PDF"}
        </button>
        <button onClick={recargarArchivos} disabled={archivosActualizando} style={{ background: archivosActualizando ? Th.card2 : "#3b82f6", border: "none", borderRadius: 8, color: "white", padding: "12px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: archivosActualizando ? 0.5 : 1 }}>
          {archivosActualizando ? "..." : "🔄 Archivos"}
        </button>
      </div>

      {/* Cerrar / Guardar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingTop: 10, borderTop: `1px solid ${Th.border}` }}>
        <button onClick={onClose} style={{ background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 8, color: Th.sub, padding: "12px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          Cerrar
        </button>
        <button onClick={guardarCaso} disabled={guardando} style={{ background: guardando ? Th.card2 : "#10b981", border: "none", borderRadius: 8, color: "white", padding: "12px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: guardando ? 0.5 : 1 }}>
          {guardando ? "Guardando..." : "✓ Guardar ahora"}
        </button>
      </div>
      <div style={{ textAlign: "center", fontSize: 11, color: Th.muted, marginTop: 8 }}>Los cambios se guardan automáticamente</div>
    </>
  );
}