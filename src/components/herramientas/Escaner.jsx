import { useState, useRef, useEffect } from "react";
import { cargarImagen, detectarHoja, procesarPagina, nuevoCanvas, FILTROS } from "../../utils/escaner.js";
import { armarPdf, elegirDestino, escribirEn, puedeElegirDestino, pesoLegible } from "../../utils/pdfEditor.js";
import { canvasABlob } from "../../utils/pdfjs.js";
import { fechaLocalISO } from "../../utils/formatters.js";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";
import RecorteEscaner from "./RecorteEscaner.jsx";

let contador = 0;
const CALIDADES = [
  { k: "normal", l: "Normal", lado: 2000, calidad: 0.85 },
  { k: "liviana", l: "Liviana", lado: 1400, calidad: 0.65 },
];

async function reducir(blob, lado, calidad) {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, lado / Math.max(bmp.width, bmp.height));
  const c = nuevoCanvas(bmp.width * k, bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return canvasABlob(c, "image/jpeg", calidad);
}

// Escáner con el celular (como CamScanner): sacás fotos de la documentación, la app encuentra la hoja,
// la endereza y la deja como escaneada. Se ajusta a mano si hace falta y se guarda como PDF.
export default function Escaner() {
  const [paginas, setPaginas] = useState([]); // { id, blobOriginal, esquinas, filtro, rotacion, resultado, url }
  const [procesando, setProcesando] = useState("");
  const [editando, setEditando] = useState(null);
  const [calidad, setCalidad] = useState("normal");
  const [nombre, setNombre] = useState(() => `Escaneo ${fechaLocalISO().split("-").reverse().join("-")}.pdf`);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const camaraRef = useRef(null);
  const archivosRef = useRef(null);
  const urls = useRef([]);

  useEffect(() => () => urls.current.forEach(u => URL.revokeObjectURL(u)), []);
  const nuevaUrl = blob => { const u = URL.createObjectURL(blob); urls.current.push(u); return u; };

  const agregar = async lista => {
    const fotos = [...lista].filter(f => f.type.startsWith("image/"));
    if (!fotos.length) return;
    setError(""); setResultado(null);
    for (let i = 0; i < fotos.length; i++) {
      setProcesando(fotos.length > 1 ? `Procesando foto ${i + 1} de ${fotos.length}…` : "Procesando la foto…");
      try {
        const canvas = await cargarImagen(fotos[i]);
        const blobOriginal = await canvasABlob(canvas, "image/jpeg", 0.9);
        const ajustes = { esquinas: detectarHoja(canvas), filtro: "mejorada", rotacion: 0 };
        const res = await procesarPagina(canvas, ajustes);
        canvas.width = canvas.height = 0;
        setPaginas(p => [...p, { id: `s${++contador}`, blobOriginal, ...ajustes, resultado: res, url: nuevaUrl(res) }]);
      } catch (e) {
        console.error("[escaner] foto:", e);
        setError(`No se pudo procesar ${fotos[i].name}.`);
      }
    }
    setProcesando("");
  };

  const reprocesar = async (id, ajustes) => {
    const p = paginas.find(x => x.id === id);
    const canvas = await cargarImagen(p.blobOriginal);
    const res = await procesarPagina(canvas, ajustes);
    canvas.width = canvas.height = 0;
    setPaginas(ps => ps.map(x => (x.id === id ? { ...x, ...ajustes, resultado: res, url: nuevaUrl(res) } : x)));
    setResultado(null);
  };

  const rotar = async (p, grados) => {
    setProcesando("Rotando…");
    await reprocesar(p.id, { esquinas: p.esquinas, filtro: p.filtro, rotacion: (p.rotacion + grados + 360) % 360 });
    setProcesando("");
  };
  const filtroParaTodas = async filtro => {
    for (let i = 0; i < paginas.length; i++) {
      setProcesando(`Aplicando filtro ${i + 1} de ${paginas.length}…`);
      const p = paginas[i];
      if (p.filtro !== filtro) await reprocesar(p.id, { esquinas: p.esquinas, filtro, rotacion: p.rotacion });
    }
    setProcesando("");
  };
  const mover = (i, j) => setPaginas(ps => {
    if (j < 0 || j >= ps.length) return ps;
    const c = [...ps];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  });

  const guardar = async () => {
    setError(""); setResultado(null);
    const nombreFinal = /\.pdf$/i.test(nombre.trim()) ? nombre.trim() : `${nombre.trim() || "Escaneo"}.pdf`;
    let destino;
    try { destino = await elegirDestino(nombreFinal); } catch (e) { setError(`No se pudo abrir el explorador: ${e.message}`); return; }
    if (!destino) return;
    try {
      const q = CALIDADES.find(c => c.k === calidad);
      const fuentes = {};
      const lista = [];
      for (let i = 0; i < paginas.length; i++) {
        setProcesando(`Armando el PDF (${i + 1} de ${paginas.length})…`);
        fuentes[i] = { tipo: "imagen", blob: q.k === "normal" ? paginas[i].resultado : await reducir(paginas[i].resultado, q.lado, q.calidad) };
        lista.push({ fuenteId: i, indice: 0, rotacion: 0, estampas: [] });
      }
      const bytes = await armarPdf({ fuentes, paginas: lista });
      const guardado = await escribirEn(destino, bytes, nombreFinal);
      setResultado({ nombre: guardado, peso: bytes.length, paginas: paginas.length, descargado: destino === "descargar" });
    } catch (e) {
      console.error("[escaner] guardar:", e);
      setError(`No se pudo guardar el PDF: ${e.message}`);
    }
    setProcesando("");
  };

  const pagEditando = paginas.find(p => p.id === editando);
  const iconBtn = { background: "none", border: "none", color: "var(--sub)", cursor: "pointer", padding: 4, borderRadius: "var(--r-xs)", display: "grid", placeItems: "center" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input ref={camaraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => { agregar(e.target.files); e.target.value = ""; }} />
      <input ref={archivosRef} type="file" accept="image/*" multiple hidden onChange={e => { agregar(e.target.files); e.target.value = ""; }} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Boton variante="primario" icono="camara" onClick={() => camaraRef.current?.click()} disabled={!!procesando}>{paginas.length ? "Sacar otra foto" : "Sacar foto"}</Boton>
        <Boton onClick={() => archivosRef.current?.click()} disabled={!!procesando}>Elegir fotos</Boton>
        {procesando && <span role="status" style={{ fontSize: 13, color: "var(--sub)" }}>{procesando}</span>}
      </div>

      {!paginas.length && !procesando && (
        <div style={{ background: "var(--card)", border: "1px dashed var(--border2)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: "28px 18px", color: "var(--sub)", fontSize: 14, lineHeight: 1.6 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Escaneá DNI, denuncias, cédulas o cualquier papel</div>
          Apoyá la hoja sobre una superficie <b>oscura</b>, con buena luz, y sacá la foto desde arriba. La app encuentra la hoja, la endereza y la deja blanca como un escaneo. Podés sacar varias fotos y se juntan en un solo PDF. En la compu podés elegir fotos que ya tengas.
        </div>
      )}

      {error && <div role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>{error}</div>}

      {paginas.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--sub)" }}>Filtro para todas:</span>
            {FILTROS.map(f => <Boton key={f.k} tamaño="sm" variante="fantasma" onClick={() => filtroParaTodas(f.k)} disabled={!!procesando}>{f.l}</Boton>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {paginas.map((p, i) => (
              <div key={p.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <b className="num">{i + 1}</b>
                  <span style={{ color: "var(--muted)" }}>{FILTROS.find(f => f.k === p.filtro)?.l}</span>
                </div>
                <button type="button" onClick={() => setEditando(p.id)} title="Ajustar recorte y filtro"
                  style={{ height: 190, display: "grid", placeItems: "center", background: "var(--card2)", border: "none", borderRadius: "var(--r-xs)", cursor: "pointer", padding: 4 }}>
                  <img src={p.url} alt={`Página ${i + 1}`} style={{ maxWidth: "100%", maxHeight: 180, boxShadow: "0 1px 4px rgba(0,0,0,.25)" }} />
                </button>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button type="button" style={iconBtn} aria-label="Mover a la izquierda" title="Mover a la izquierda" onClick={() => mover(i, i - 1)} disabled={i === 0}><Icono nombre="chevron" size={15} style={{ transform: "rotate(90deg)", opacity: i === 0 ? 0.3 : 1 }} /></button>
                  <button type="button" style={iconBtn} aria-label="Rotar" title="Rotar" onClick={() => rotar(p, 90)} disabled={!!procesando}><Icono nombre="recargar" size={15} /></button>
                  <button type="button" style={iconBtn} aria-label="Ajustar" title="Ajustar recorte y filtro" onClick={() => setEditando(p.id)}><Icono nombre="firma" size={15} /></button>
                  <button type="button" style={{ ...iconBtn, color: "var(--bad)" }} aria-label="Sacar página" title="Sacar página" onClick={() => setPaginas(ps => ps.filter(x => x.id !== p.id))}><Icono nombre="papelera" size={15} /></button>
                  <button type="button" style={iconBtn} aria-label="Mover a la derecha" title="Mover a la derecha" onClick={() => mover(i, i + 1)} disabled={i === paginas.length - 1}><Icono nombre="chevron" size={15} style={{ transform: "rotate(-90deg)", opacity: i === paginas.length - 1 ? 0.3 : 1 }} /></button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 16, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ flex: "1 1 240px" }}>
              <span style={{ display: "block", fontSize: 12, color: "var(--sub)", marginBottom: 4 }}>Nombre del archivo</span>
              <input value={nombre} onChange={e => setNombre(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
            </label>
            <div role="radiogroup" aria-label="Calidad">
              <span style={{ display: "block", fontSize: 12, color: "var(--sub)", marginBottom: 4 }}>Calidad</span>
              <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", overflow: "hidden" }}>
                {CALIDADES.map(c => (
                  <button key={c.k} type="button" role="radio" aria-checked={calidad === c.k} onClick={() => setCalidad(c.k)}
                    style={{ font: "inherit", fontSize: 13, padding: "8px 12px", border: "none", cursor: "pointer", fontWeight: calidad === c.k ? 600 : 500, background: calidad === c.k ? "var(--text)" : "var(--card)", color: calidad === c.k ? "var(--bg)" : "var(--sub)" }}>{c.l}</button>
                ))}
              </div>
            </div>
            <Boton variante="primario" icono="guardar" onClick={guardar} disabled={!!procesando}>{puedeElegirDestino() ? "Guardar PDF…" : "Descargar PDF"}</Boton>
            {resultado && <div role="status" style={{ flexBasis: "100%", fontSize: 13, color: "var(--ok)", fontWeight: 600 }}>{resultado.descargado ? "Descargado" : "Guardado"}: {resultado.nombre} · {resultado.paginas} {resultado.paginas === 1 ? "página" : "páginas"} · {pesoLegible(resultado.peso)}</div>}
          </div>
        </>
      )}

      {pagEditando && (
        <RecorteEscaner pagina={pagEditando} onCerrar={() => setEditando(null)}
          onGuardar={async ajustes => { await reprocesar(pagEditando.id, ajustes); setEditando(null); }} />
      )}
    </div>
  );
}
