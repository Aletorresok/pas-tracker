import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { combinarArchivos, esPdf, esImagen } from "../../utils/pdfManager.js";
import { elegirDestino, escribirEn, puedeElegirDestino } from "../../utils/pdfEditor.js";
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
  const [nombreArchivo, setNombreArchivo] = useState(() => `DOCUMENTACION${caso?.asegurado ? ` - ${caso.asegurado}` : ""}.pdf`);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const inputImagenRef = useRef(null);

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

  const seleccionados = items.filter(it => it.incluir);
  const nombreFinal = () => (nombreArchivo.trim().toLowerCase().endsWith(".pdf") ? nombreArchivo.trim() : `${nombreArchivo.trim() || "DOCUMENTACION"}.pdf`);
  const terminar = msg => { onToast({ msg, type: "success" }); onGuardado?.(); onClose(); };
  const fallo = e => { console.error("[gestor-pdf] guardar:", e); setError(`No se pudo guardar el PDF: ${e.message}`); };

  // Un click: se arma y se guarda directo en la carpeta vinculada del caso
  const guardarEnCarpeta = async () => {
    if (!seleccionados.length) { setError("Elegí al menos un archivo."); return; }
    setError("");
    const nombre = nombreFinal();
    try {
      if (!(await verificarPermisoCarpeta(dirHandle))) { setError("Sin permiso para escribir en la carpeta. Volvé a vincularla."); return; }
      const existe = await dirHandle.getFileHandle(nombre).then(() => true, () => false);
      if (existe && !window.confirm(`Ya hay un archivo "${nombre}" en la carpeta del caso. ¿Reemplazarlo?`)) return;
      setProcesando(true);
      const bytes = await combinarArchivos({ items: seleccionados, portada, caso });
      await escribirEn(await dirHandle.getFileHandle(nombre, { create: true }), bytes, nombre);
      terminar(`${nombre} guardado en la carpeta del caso`);
    } catch (e) { fallo(e); }
    setProcesando(false);
  };

  // Abre el explorador (ya parado en la carpeta del caso, si hay) para elegir dónde y con qué nombre
  const guardarComo = async () => {
    if (!seleccionados.length) { setError("Elegí al menos un archivo."); return; }
    setError("");
    try {
      const destino = await elegirDestino(nombreFinal(), dirHandle);
      if (!destino) return;
      setProcesando(true);
      const bytes = await combinarArchivos({ items: seleccionados, portada, caso });
      const nombre = await escribirEn(destino, bytes, nombreFinal());
      terminar(destino === "descargar" ? `${nombre} descargado` : `${nombre} guardado`);
    } catch (e) { fallo(e); }
    setProcesando(false);
  };

  const boton = (variante = "normal") => ({
    background: variante === "primario" ? "var(--accent)" : Th.card2,
    border: `1px solid ${variante === "primario" ? "var(--accent)" : Th.border}`,
    borderRadius: "var(--r-xs)", color: variante === "primario" ? "var(--on-accent)" : Th.sub,
    padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700,
  });
  const iconBtn = { background: "none", border: "none", color: Th.sub, cursor: "pointer", fontSize: 14, padding: "2px 6px" };

  // Portal: la ficha del caso tiene transform y recortaría este modal
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", width: "100%", maxWidth: 620, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${Th.border}` }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: Th.text }}>Gestor de PDF</span>
          <button onClick={onClose} style={{ ...iconBtn, fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: "12px 18px", overflowY: "auto", flex: 1 }}>
          <div style={{ fontSize: 12, color: Th.muted, marginBottom: 10 }}>
            Elegí qué archivos incluir y en qué orden. Se arma un solo PDF con todo, con portada e índice.
          </div>

          {items.map((it, i) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: "var(--r-sm)", background: Th.card2, marginBottom: 5, opacity: it.incluir ? 1 : 0.5 }}>
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
          {procesando ? (
            <span style={{ fontSize: 13, color: Th.sub, fontWeight: 600 }}>Armando el PDF…</span>
          ) : (
            <>
              {dirHandle && <button onClick={guardarEnCarpeta} style={boton("primario")}>Guardar en la carpeta del caso</button>}
              <button onClick={guardarComo} style={dirHandle ? boton() : boton("primario")}>{puedeElegirDestino() ? "Guardar como…" : "Descargar"}</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
