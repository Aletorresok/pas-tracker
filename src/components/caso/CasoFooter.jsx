import Boton from "../ui/Boton.jsx";

export default function CasoFooter({
  Th, setModalEscrito, handleExportarPDF, exportandoPDF,
  recargarArchivos, archivosActualizando, onClose, guardarCaso, guardando
}) {
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: `1px solid ${Th.border}` }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Boton variante="primario" icono="escrito" onClick={() => setModalEscrito(true)}>Generar escrito</Boton>
          <Boton icono="pdf" onClick={handleExportarPDF} disabled={exportandoPDF}>{exportandoPDF ? "Exportando…" : "Exportar PDF"}</Boton>
          <Boton icono="recargar" onClick={recargarArchivos} disabled={archivosActualizando}>{archivosActualizando ? "Actualizando…" : "Actualizar archivos"}</Boton>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Boton variante="fantasma" onClick={guardarCaso} disabled={guardando}>{guardando ? "Guardando…" : "Guardar ahora"}</Boton>
          <Boton onClick={onClose}>Cerrar</Boton>
        </div>
      </div>
      <div style={{ fontSize: 12, color: Th.muted, marginTop: 10 }}>Los cambios se guardan automáticamente.</div>
    </>
  );
}
