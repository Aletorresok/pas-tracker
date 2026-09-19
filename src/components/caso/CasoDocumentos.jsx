import React from 'react';
import { CarpetaLocal } from "../CarpetaLocal.jsx";
import { ArchivoRow } from "../casoDetalleComponents.jsx";

export default function CasoDocumentos({ 
  Th, caso, archivos, archivosActualizando, setToast, setPreviewArchivo, 
  dirHandleRef, handleCategorizarArchivo, handleRenombrarArchivo 
}) {
  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>📁 Documentos del caso</div>
      
      <CarpetaLocal 
        Th={Th} 
        onToast={setToast} 
        onPreview={arch => setPreviewArchivo(arch)} 
        caso={caso} 
        onDirHandleChange={h => { dirHandleRef.current = h; }} 
      />
      
      <div style={{ borderTop: `1px solid ${Th.border}`, marginTop: 16, paddingTop: 16 }}>
        {archivos.length === 0 && !archivosActualizando && (
          <div style={{ textAlign: "center", padding: "16px 0", color: Th.muted, fontSize: 13 }}>
            Sin archivos en este caso
          </div>
        )}
        {archivos.map(arch => (
          <ArchivoRow 
            key={arch.nombre} 
            archivo={arch} 
            onPreview={() => setPreviewArchivo(arch)} 
            onCategorizar={tipo => handleCategorizarArchivo(arch, tipo)} 
            onRenombrar={nuevoNombre => handleRenombrarArchivo(arch, nuevoNombre)} 
            Th={Th} 
          />
        ))}
      </div>
    </div>
  );
}