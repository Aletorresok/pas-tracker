import { CarpetaLocal } from "../CarpetaLocal.jsx";

// Documentos del caso: la carpeta local vinculada (File System Access). Los documentos se guardan solo en la PC.
export default function CasoDocumentos({ versionCarpeta, Th, caso, setToast, setPreviewArchivo, dirHandleRef }) {
  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: Th.text, marginBottom: 14 }}>Documentos del caso</div>
      <CarpetaLocal
        Th={Th}
        onToast={setToast}
        onPreview={arch => setPreviewArchivo(arch)}
        caso={caso}
        onDirHandleChange={h => { dirHandleRef.current = h; }}
        version={versionCarpeta}
      />
    </div>
  );
}
