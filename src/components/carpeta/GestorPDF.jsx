import { useState, useRef, useEffect } from "react";
import { combinarArchivos, esPdf, esImagen } from "../../utils/pdfManager.js";
import { verificarPermisoCarpeta } from "../../utils/carpeta.js";
import { TIPOS_DOC } from "../../constants.js";

const SOPORTADOS = [".pdf", ".jpg", ".jpeg", ".png"];

// Orden sugerido: sigue el mismo orden que TIPOS_DOC (DNI, LICENCIA, ..., INFO TERCERO),
// los archivos sin categorizar quedan al final, por nombre.
const indiceTipo = nombre => {
  const n = nombre.toUpperCase();
  const i = TIPOS_DOC.findIndex(t => n.startsWith(`${t.toUpperCase()}_`) || n.startsWith(`${t.toUpperCase()}.`));
  return i === -1 ? TIPOS_DOC.length : i;
};

let contadorExterno = 0;

// Arma un único PDF con los documentos del caso: combina PDFs e imágenes (como páginas),
// permite reordenar/rotar/excluir, sumar imágenes sueltas de la PC, y guardarlo en la
// misma carpeta local o descargarlo.
export default function GestorPDF({ archivos, dirHandle, caso, Th, onToast, onGuardado, onClose }) {
  const [items, setItems] = useState(() =>
    archivos
      .filter(a => SOPORTADOS.includes(a.ext))
      .map(a => ({ id: a.nombre, archivo: a, incluir: true, rotacion: 0 }))
      .sort((a, b) => indiceTipo(a.archivo.nombre) - indiceTipo(b.archivo.nombre) || a.archivo.nombre.localeCompare(b.archivo.nombre))
  );
  const [portada, setPortada] = useState(true);
  const [nombreArchivo, setNombreArchivo] = useState("Documentación completa.pdf");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null); // { blob, url }
  const inputImagenRef = useRef(null);

  useEffect(() => () => { if (resultado) URL.revokeObjectURL(resultado.url); }, [resultado]);

  const mover = (i, dir) => setItems(prev => {
    const j = i + dir;
    if (j < 0 || j >= prev.length) return prev;
    const copia = [...prev];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    return copia;
  });
  const rotar = i => setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, rotacion: (it.rotacion + 90) % 360 } : it)));
  const toggle = i => setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, incluir: !it.incluir } : it)));
  const quitar = i => setItems(prev => prev.filter((_, idx) => idx !== i));

  const agregarImagenes = e => {
    const nuevos = [...e.target.files].map(f => ({
      id: `externo-${++contadorExterno}`,
      archivo: { nombre: f.name, ext: `.${f.name.split(".").pop().toLowerCase()}`, blob: f, tamaño: f.size },
      incluir: true, rotacion: 0, externo: true,
    }));
    e.target.value = "";
    setItems(prev => [...prev, ...nuevos]);
  };

  const generar = async () => {
    const seleccionados = items.filter(it => it.incluir);
    if (!seleccionados.length) { setError("Elegí al menos un archivo."); return; }
    setProcesando(true); setError(""); setResultado(null);
    try {
      const bytes = await combinarArchivos({ items: seleccionados, portada, caso });
      const blob = new Blob([bytes], { type: "application/pdf" });
      setResultado({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      console.error("[gestor-pdf] generar:", e);
      setError(`No se pudo generar el PDF: ${e.message}`);
    }
    setProcesando(false);
  };

  const nombreFinal = () => (nombreArchivo.trim().toLowerCase().endsWith(".pdf") ? nombreArchivo.trim() : `${nombreArchivo.trim()}.pdf`);

  const descargar = () => {
    const a = document.createElement("a");
    a.href = resultado.url;
    a.download = nombreFinal();
    a.click();
  };

  const guardarEnCarpeta = async () => {
    try {
      const permiso = await verificarPermisoCarpeta(dirHandle);
      if (!permiso) { onToast({ msg: "Sin permiso para escribir en la carpeta", type: "error" }); return; }
      const handle = await dirHandle.getFileHandle(nombreFinal(), { create: true });
      const writable = await handle.createWritable();
      await writable.write(resultado.blob);
      await writable.close();
      onToast({ msg: `${nombreFinal()} guardado en la carpeta`, type: "success" });
      onGuardado?.();
      onClose();
    } catch (e) {
      onToast({ msg: `Error al guardar: ${e.message}`, type: "error" });
    }
  };

  const boton = (variante = "normal") => ({
    background: variante === "primario" ? "var(--accent)" : Th.card2,
    border: `1px solid ${variante === "primario" ? "var(--accent)" : Th.border}`,
    borderRadius: 7, color: variante === "primario" ? "var(--on-accent)" : Th.sub,
    padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700,
  });
  const iconBtn = { background: "none", border: "none", color: Th.sub, cursor: "pointer", fontSize: 14, padding: "2px 6px" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${Th.border}` }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: Th.text }}>Gestor de PDF</span>
          <button onClick={onClose} style={{ ...iconBtn, fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: "12px 18px", overflowY: "auto", flex: 1 }}>
          <div style={{ fontSize: 12, color: Th.muted, marginBottom: 10 }}>
            Elegí qué archivos incluir y en qué orden. Se arma un solo PDF con todo, con portada e índice.
          </div>

          {items.map((it, i) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 8, background: Th.card2, marginBottom: 5, opacity: it.incluir ? 1 : 0.5 }}>
              <input type="checkbox" checked={it.incluir} onChange={() => toggle(i)} style={{ accentColor: "var(--accent)" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: Th.muted, width: 28 }}>{esPdf(it.archivo) ? "PDF" : esImagen(it.archivo) ? "IMG" : "?"}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: Th.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.archivo.nombre}</span>
              {it.rotacion > 0 && <span className="num" style={{ fontSize: 11, color: Th.muted }}>{it.rotacion}°</span>}
              <button onClick={() => rotar(i)} title="Rotar 90°" style={iconBtn}>⟳</button>
              <button onClick={() => mover(i, -1)} disabled={i === 0} title="Subir" style={{ ...iconBtn, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
              <button onClick={() => mover(i, 1)} disabled={i === items.length - 1} title="Bajar" style={{ ...iconBtn, opacity: i === items.length - 1 ? 0.3 : 1 }}>↓</button>
              {it.externo && <button onClick={() => quitar(i)} title="Quitar" style={{ ...iconBtn, color: "var(--bad)" }}>✕</button>}
            </div>
          ))}

          {!items.length && <div style={{ fontSize: 12, color: Th.muted, padding: "10px 0" }}>No hay PDFs ni imágenes en la carpeta.</div>}

          <input ref={inputImagenRef} type="file" accept="image/jpeg,image/png" multiple hidden onChange={agregarImagenes} />
          <button onClick={() => inputImagenRef.current?.click()} style={{ ...boton(), marginTop: 6, width: "100%" }}>+ Agregar imagen desde tu PC</button>

          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: Th.sub, marginTop: 14 }}>
            <input type="checkbox" checked={portada} onChange={e => setPortada(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
            Agregar portada con índice y membrete institucional
          </label>

          <label style={{ display: "block", marginTop: 12 }}>
            <span style={{ display: "block", fontSize: 12, color: Th.sub, marginBottom: 4 }}>Nombre del archivo final</span>
            <input value={nombreArchivo} onChange={e => setNombreArchivo(e.target.value)} style={{ ...Th.input, width: "100%", padding: "8px 10px", fontSize: 13 }} />
          </label>

          {error && <div role="alert" style={{ fontSize: 13, color: "var(--bad)", marginTop: 10 }}>{error}</div>}
        </div>

        <div style={{ padding: "12px 18px", borderTop: `1px solid ${Th.border}`, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {!resultado ? (
            <button onClick={generar} disabled={procesando} style={{ ...boton("primario"), opacity: procesando ? 0.6 : 1 }}>
              {procesando ? "Generando…" : "Generar PDF"}
            </button>
          ) : (
            <>
              <span style={{ fontSize: 13, color: "var(--ok)", fontWeight: 600 }}>PDF listo ✓</span>
              {dirHandle && <button onClick={guardarEnCarpeta} style={boton("primario")}>Guardar en la carpeta</button>}
              <button onClick={descargar} style={boton()}>Descargar</button>
              <button onClick={() => setResultado(null)} style={{ ...iconBtn, fontSize: 12 }}>Volver a editar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
