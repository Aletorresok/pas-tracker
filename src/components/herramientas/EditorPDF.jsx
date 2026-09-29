import { useState, useEffect, useRef, useCallback } from "react";
import { armarPdf, comprimirPdf, normalizarImagen, elegirDestino, escribirEn, puedeElegirDestino, pesoLegible, COMPRESIONES } from "../../utils/pdfEditor.js";
import { abrirPdf, dibujarPagina, canvasABlob } from "../../utils/pdfjs.js";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";
import PaginaEstampas from "./PaginaEstampas.jsx";

const ANCHO_MINI = 132;
const ALTO_MINI = 176;
let contador = 0;
const nuevoId = p => `${p}${++contador}`;
const extension = nombre => nombre.split(".").pop().toLowerCase();

// Editor de PDF independiente de los casos: juntar PDFs e imágenes, sacar, ordenar y rotar páginas,
// poner firmas o sellos, extraer algunas páginas y comprimir. Todo queda en el navegador.
export default function EditorPDF() {
  const fuentes = useRef({}); // id → { tipo: "pdf", nombre, bytes, doc } | { tipo: "imagen", nombre, blob, url }
  const [paginas, setPaginas] = useState([]); // { id, fuenteId, indice, rotacion, estampas, sel }
  const [minis, setMinis] = useState({}); // `${fuenteId}:${indice}` → url
  const [cargando, setCargando] = useState("");
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("documento.pdf");
  const [compresion, setCompresion] = useState("no");
  const [generando, setGenerando] = useState("");
  const [resultado, setResultado] = useState(null);
  const [editando, setEditando] = useState(null);
  const [arrastrando, setArrastrando] = useState(null);
  const [sobre, setSobre] = useState(null);
  const [soltandoArchivos, setSoltandoArchivos] = useState(false);
  const inputRef = useRef(null);
  const vivo = useRef(true);
  const urlsMinis = useRef([]);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
      Object.values(fuentes.current).forEach(f => { f.doc?.destroy(); if (f.url) URL.revokeObjectURL(f.url); });
      urlsMinis.current.forEach(u => URL.revokeObjectURL(u));
    };
  }, []);

  const dibujarMiniaturas = async (fuenteId, doc) => {
    for (let i = 0; i < doc.numPages && vivo.current; i++) {
      try {
        const { canvas } = await dibujarPagina(doc, i, { ancho: ANCHO_MINI * 2 });
        const url = URL.createObjectURL(await canvasABlob(canvas, "image/jpeg", 0.8));
        urlsMinis.current.push(url);
        if (vivo.current) setMinis(m => ({ ...m, [`${fuenteId}:${i}`]: url }));
      } catch (e) { console.error("[editor-pdf] miniatura:", e); }
    }
  };

  const agregarArchivos = useCallback(async lista => {
    const archivos = [...lista];
    if (!archivos.length) return;
    setError(""); setResultado(null);
    const errores = [];
    for (const file of archivos) {
      const ext = extension(file.name);
      setCargando(`Abriendo ${file.name}…`);
      try {
        if (ext === "pdf") {
          const bytes = await file.arrayBuffer();
          const doc = await abrirPdf(bytes);
          const id = nuevoId("f");
          fuentes.current[id] = { tipo: "pdf", nombre: file.name, bytes, doc };
          const nuevas = Array.from({ length: doc.numPages }, (_, i) => ({ id: nuevoId("p"), fuenteId: id, indice: i, rotacion: 0, estampas: [], sel: false }));
          setPaginas(p => [...p, ...nuevas]);
          setNombre(n => (n === "documento.pdf" ? file.name.replace(/\.pdf$/i, "") + " (editado).pdf" : n));
          dibujarMiniaturas(id, doc);
        } else if (["jpg", "jpeg", "png"].includes(ext)) {
          const { blob } = await normalizarImagen(file);
          const id = nuevoId("f");
          const url = URL.createObjectURL(blob);
          fuentes.current[id] = { tipo: "imagen", nombre: file.name, blob, url };
          setMinis(m => ({ ...m, [`${id}:0`]: url }));
          setPaginas(p => [...p, { id: nuevoId("p"), fuenteId: id, indice: 0, rotacion: 0, estampas: [], sel: false }]);
        } else {
          errores.push(`${file.name}: solo PDF, JPG o PNG`);
        }
      } catch (e) {
        console.error("[editor-pdf] abrir:", e);
        errores.push(e?.name === "PasswordException" ? `${file.name} está protegido con contraseña` : `${file.name} no se pudo abrir`);
      }
    }
    setCargando("");
    if (errores.length) setError(errores.join(" · "));
  }, []);

  const cambiarPaginas = fn => { setPaginas(fn); setResultado(null); };
  const rotar = (id, grados) => cambiarPaginas(ps => ps.map(p => (p.id === id ? { ...p, rotacion: (p.rotacion + grados + 360) % 360 } : p)));
  const quitar = id => cambiarPaginas(ps => ps.filter(p => p.id !== id));
  const mover = (desde, hasta) => cambiarPaginas(ps => {
    if (hasta < 0 || hasta >= ps.length || desde === hasta) return ps;
    const copia = [...ps];
    const [p] = copia.splice(desde, 1);
    copia.splice(hasta, 0, p);
    return copia;
  });
  const alternarSel = id => setPaginas(ps => ps.map(p => (p.id === id ? { ...p, sel: !p.sel } : p)));
  const todasSel = sel => setPaginas(ps => ps.map(p => ({ ...p, sel })));

  const seleccionadas = paginas.filter(p => p.sel);
  const hayArchivos = paginas.length > 0;

  const generar = async (lista, nombreArchivo) => {
    setError(""); setResultado(null);
    const nombreFinal = /\.pdf$/i.test(nombreArchivo.trim()) ? nombreArchivo.trim() : `${nombreArchivo.trim() || "documento"}.pdf`;
    let destino;
    try {
      // Primero se elige dónde guardar: el navegador solo abre el explorador justo después del click
      destino = await elegirDestino(nombreFinal);
    } catch (e) {
      setError(`No se pudo abrir el explorador de archivos: ${e.message}`);
      return;
    }
    if (!destino) return;
    try {
      setGenerando("Armando el PDF…");
      const bytes = await armarPdf({ fuentes: fuentes.current, paginas: lista });
      let final = bytes;
      let aviso = "";
      const opcion = COMPRESIONES.find(c => c.k === compresion);
      if (opcion.dpi) {
        const comprimido = await comprimirPdf(bytes, opcion, (i, n) => setGenerando(`Comprimiendo página ${i} de ${n}…`));
        if (comprimido.length < bytes.length) final = comprimido;
        else aviso = "Este PDF ya era liviano (casi todo texto): se descargó sin comprimir para que no pese más.";
      }
      const guardado = await escribirEn(destino, final, nombreFinal);
      setResultado({ peso: final.length, antes: bytes.length, paginas: lista.length, aviso, nombre: guardado, descargado: destino === "descargar" });
    } catch (e) {
      console.error("[editor-pdf] generar:", e);
      setError(`No se pudo generar el PDF: ${e.message}`);
    }
    setGenerando("");
  };

  const soltarEn = indice => {
    if (arrastrando === null) return;
    mover(paginas.findIndex(p => p.id === arrastrando), indice);
    setArrastrando(null); setSobre(null);
  };

  const iconBtn = { background: "none", border: "none", color: "var(--sub)", cursor: "pointer", padding: 4, borderRadius: "var(--r-xs)", display: "grid", placeItems: "center" };
  const pagEditando = paginas.find(p => p.id === editando);

  return (
    <div
      onDragOver={e => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setSoltandoArchivos(true); } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setSoltandoArchivos(false); }}
      onDrop={e => { if (e.dataTransfer.files.length) { e.preventDefault(); setSoltandoArchivos(false); agregarArchivos(e.dataTransfer.files); } }}
      style={{ display: "flex", flexDirection: "column", gap: 14, outline: soltandoArchivos ? "2px dashed var(--accent)" : "none", outlineOffset: 6, borderRadius: "var(--r-md)" }}>

      <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png" multiple hidden
        onChange={e => { agregarArchivos(e.target.files); e.target.value = ""; }} />

      {!hayArchivos && (
        <button type="button" onClick={() => inputRef.current?.click()}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 16px", border: "2px dashed var(--border2)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", background: "var(--card)", color: "var(--sub)", cursor: "pointer", font: "inherit" }}>
          <Icono nombre="adjuntar" size={28} />
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{cargando || "Elegí o arrastrá PDFs e imágenes"}</span>
          <span style={{ fontSize: 13, maxWidth: 460, lineHeight: 1.5 }}>
            Podés juntar varios archivos, sacar páginas, ordenarlas, rotarlas, poner una firma o sello, quedarte con algunas y comprimir. Los archivos no se suben a ningún lado.
          </span>
        </button>
      )}

      {hayArchivos && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Boton icono="agregar" onClick={() => inputRef.current?.click()} disabled={!!cargando}>Agregar archivos</Boton>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{cargando || `${paginas.length} ${paginas.length === 1 ? "página" : "páginas"} · arrastralas para ordenarlas`}</span>
          <span style={{ flex: 1 }} />
          {seleccionadas.length > 0 ? (
            <>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{seleccionadas.length} {seleccionadas.length === 1 ? "elegida" : "elegidas"}:</span>
              <Boton tamaño="sm" onClick={() => cambiarPaginas(ps => ps.map(p => (p.sel ? { ...p, rotacion: (p.rotacion + 90) % 360 } : p)))}>Rotar</Boton>
              <Boton tamaño="sm" onClick={() => generar(seleccionadas, nombre.replace(/(\.pdf)?$/i, " (extracto).pdf"))} disabled={!!generando}>{puedeElegirDestino() ? "Guardar solo estas…" : "Descargar solo estas"}</Boton>
              <Boton tamaño="sm" variante="peligro" onClick={() => cambiarPaginas(ps => ps.filter(p => !p.sel))}>Sacar</Boton>
              <Boton tamaño="sm" variante="fantasma" onClick={() => todasSel(false)}>Ninguna</Boton>
            </>
          ) : (
            <>
              <Boton tamaño="sm" variante="fantasma" onClick={() => todasSel(true)}>Elegir todas</Boton>
              <Boton tamaño="sm" variante="fantasma" onClick={() => { if (window.confirm("¿Empezar de nuevo? Se sacan todas las páginas.")) { setPaginas([]); setResultado(null); setNombre("documento.pdf"); } }}>Empezar de nuevo</Boton>
            </>
          )}
        </div>
      )}

      {error && <div role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>{error}</div>}

      {hayArchivos && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${ANCHO_MINI + 16}px, 1fr))`, gap: 12 }}>
          {paginas.map((p, i) => {
            const url = minis[`${p.fuenteId}:${p.indice}`];
            const girada = p.rotacion % 180 !== 0;
            return (
              <div key={p.id} draggable
                onDragStart={e => { setArrastrando(p.id); e.dataTransfer.effectAllowed = "move"; }}
                onDragEnd={() => { setArrastrando(null); setSobre(null); }}
                onDragOver={e => { if (arrastrando) { e.preventDefault(); setSobre(p.id); } }}
                onDrop={e => { if (arrastrando) { e.preventDefault(); e.stopPropagation(); soltarEn(i); } }}
                style={{ background: "var(--card)", border: `1px solid ${p.sel ? "var(--accent)" : sobre === p.id && arrastrando !== p.id ? "var(--accent)" : "var(--border)"}`,
                  boxShadow: p.sel ? "0 0 0 1px var(--accent)" : "none", borderRadius: "var(--r-sm)", padding: 8, display: "flex", flexDirection: "column", gap: 6,
                  opacity: arrastrando === p.id ? 0.4 : 1, cursor: "grab" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--sub)", cursor: "pointer" }}>
                    <input type="checkbox" checked={p.sel} onChange={() => alternarSel(p.id)} style={{ accentColor: "var(--accent)" }} />
                    <span className="num" style={{ fontWeight: 600, color: "var(--text)" }}>{i + 1}</span>
                  </label>
                  {p.estampas.length > 0 && <span title="Tiene imágenes encima" style={{ color: "var(--accent-ink)", display: "flex" }}><Icono nombre="firma" size={14} /></span>}
                </div>
                <button type="button" onClick={() => setEditando(p.id)} title="Poner firma, sello o imagen"
                  style={{ height: ALTO_MINI, display: "grid", placeItems: "center", background: "var(--card2)", border: "none", borderRadius: "var(--r-xs)", cursor: "pointer", padding: 0, overflow: "hidden" }}>
                  {url
                    ? <img src={url} alt={`Página ${i + 1}`} draggable={false}
                        style={{ maxWidth: girada ? ALTO_MINI - 8 : ANCHO_MINI, maxHeight: girada ? ANCHO_MINI : ALTO_MINI - 8, transform: `rotate(${p.rotacion}deg)`, transition: "transform .15s", boxShadow: "0 1px 4px rgba(0,0,0,.2)", background: "#fff" }} />
                    : <span style={{ fontSize: 12, color: "var(--muted)" }}>…</span>}
                </button>
                <div title={fuentes.current[p.fuenteId]?.nombre} style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {fuentes.current[p.fuenteId]?.nombre}{fuentes.current[p.fuenteId]?.tipo === "pdf" ? ` · p. ${p.indice + 1}` : ""}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button type="button" style={iconBtn} title="Mover a la izquierda" aria-label="Mover a la izquierda" disabled={i === 0} onClick={() => mover(i, i - 1)}><Icono nombre="chevron" size={15} style={{ transform: "rotate(90deg)", opacity: i === 0 ? 0.3 : 1 }} /></button>
                  <button type="button" style={iconBtn} title="Rotar a la izquierda" aria-label="Rotar a la izquierda" onClick={() => rotar(p.id, -90)}><Icono nombre="recargar" size={15} style={{ transform: "scaleX(-1)" }} /></button>
                  <button type="button" style={iconBtn} title="Rotar a la derecha" aria-label="Rotar a la derecha" onClick={() => rotar(p.id, 90)}><Icono nombre="recargar" size={15} /></button>
                  <button type="button" style={iconBtn} title="Firma, sello o imagen" aria-label="Firma, sello o imagen" onClick={() => setEditando(p.id)}><Icono nombre="firma" size={15} /></button>
                  <button type="button" style={{ ...iconBtn, color: "var(--bad)" }} title="Sacar página" aria-label="Sacar página" onClick={() => quitar(p.id)}><Icono nombre="papelera" size={15} /></button>
                  <button type="button" style={iconBtn} title="Mover a la derecha" aria-label="Mover a la derecha" disabled={i === paginas.length - 1} onClick={() => mover(i, i + 1)}><Icono nombre="chevron" size={15} style={{ transform: "rotate(-90deg)", opacity: i === paginas.length - 1 ? 0.3 : 1 }} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hayArchivos && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ flex: "1 1 260px" }}>
              <span style={{ display: "block", fontSize: 12, color: "var(--sub)", marginBottom: 4 }}>Nombre del archivo</span>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
            </label>
            <div role="radiogroup" aria-label="Compresión" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--sub)" }}>Comprimir</span>
              <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", overflow: "hidden" }}>
                {COMPRESIONES.map(c => (
                  <button key={c.k} type="button" role="radio" aria-checked={compresion === c.k} title={c.desc} onClick={() => { setCompresion(c.k); setResultado(null); }}
                    style={{ font: "inherit", fontSize: 13, padding: "8px 12px", border: "none", cursor: "pointer", fontWeight: compresion === c.k ? 600 : 500, background: compresion === c.k ? "var(--text)" : "var(--card)", color: compresion === c.k ? "var(--bg)" : "var(--sub)" }}>{c.l}</button>
                ))}
              </div>
            </div>
            <Boton variante="primario" icono="guardar" onClick={() => generar(paginas, nombre)} disabled={!!generando || !!cargando}>
              {generando || (puedeElegirDestino() ? "Guardar PDF…" : "Descargar PDF")}
            </Boton>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {COMPRESIONES.find(c => c.k === compresion).desc}{compresion !== "no" ? ". Las páginas pasan a imagen: el texto deja de poder seleccionarse." : "."}
          </div>
          {resultado && (
            <div role="status" style={{ fontSize: 13, color: "var(--ok)", fontWeight: 600 }}>
              {resultado.descargado ? "Descargado" : "Guardado"}: {resultado.nombre} · {resultado.paginas} {resultado.paginas === 1 ? "página" : "páginas"} · {pesoLegible(resultado.peso)}
              {resultado.peso < resultado.antes && <span style={{ fontWeight: 400, color: "var(--sub)" }}> (sin comprimir pesaba {pesoLegible(resultado.antes)})</span>}
              {resultado.aviso && <div style={{ fontWeight: 400, color: "var(--sub)", marginTop: 4 }}>{resultado.aviso}</div>}
            </div>
          )}
        </div>
      )}

      {pagEditando && (
        <PaginaEstampas fuente={fuentes.current[pagEditando.fuenteId]} pagina={pagEditando}
          onCerrar={() => setEditando(null)}
          onGuardar={estampas => { cambiarPaginas(ps => ps.map(p => (p.id === pagEditando.id ? { ...p, estampas } : p))); setEditando(null); }} />
      )}
    </div>
  );
}
