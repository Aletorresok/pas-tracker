import { useEffect, useRef, useState } from "react";
import Boton from "../ui/Boton.jsx";
import { alpha } from "../../utils/theme.js";
import { COLUMNAS_SQL44 } from "../../utils/datosSiniestro.js";

// Lee la denuncia, el certificado de cobertura o la carta de franquicia (PDF) y propone completar la ficha.
// Nada se guarda hasta tocar "Completar": se elige dato por dato.
export default function LeerDocumentos({ formData, onChange, Th, sql44 }) {
  const input = useRef(null);
  const [leyendo, setLeyendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [leidos, setLeidos] = useState([]);
  const [propuestas, setPropuestas] = useState(null);
  const [aviso, setAviso] = useState(null);

  const leer = async archivos => {
    const pdfs = [...archivos].filter(a => a.type === "application/pdf" || /\.pdf$/i.test(a.name));
    if (!pdfs.length) { setAviso("Elegí archivos PDF."); return; }
    setLeyendo(true); setAviso(null);
    const { leerArchivo, proponer } = await import("../../utils/lectores/index.js");
    const resultados = await Promise.all(pdfs.map(leerArchivo));
    const todas = proponer(resultados, formData).filter(p => sql44 || !COLUMNAS_SQL44.includes(p.k));
    setLeidos(resultados);
    setPropuestas(todas);
    setLeyendo(false);
  };

  // "Guardar todo y leer la denuncia" (Documentos) manda los PDF acá
  const leerRef = useRef(null);
  leerRef.current = leer;
  useEffect(() => {
    const alRecibir = e => leerRef.current?.(e.detail?.archivos || []);
    window.addEventListener("atg:leer-pdfs", alRecibir);
    return () => window.removeEventListener("atg:leer-pdfs", alRecibir);
  }, []);

  const completar = () => {
    const elegidas = propuestas.filter(p => p.marcado);
    for (const p of elegidas) onChange(p.k, p.nuevo);
    setAviso(`${elegidas.length} ${elegidas.length === 1 ? "dato completado" : "datos completados"}.`);
    setPropuestas(null); setLeidos([]);
  };
  const marcar = (k, v) => setPropuestas(ps => ps.map(p => (p.k === k ? { ...p, marcado: v } : p)));

  const zona = {
    border: `1px dashed ${arrastrando ? "var(--accent)" : Th.border}`, borderRadius: "var(--r-md)", padding: "12px 16px", marginBottom: 16,
    background: arrastrando ? alpha("var(--accent)", 8) : Th.card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
  };
  const celda = { padding: "6px 8px", borderBottom: `1px solid ${Th.border}`, fontSize: 13, verticalAlign: "top", overflowWrap: "anywhere", whiteSpace: "pre-wrap" };

  return (
    <div onDragOver={e => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)}
      onDrop={e => { e.preventDefault(); setArrastrando(false); leer(e.dataTransfer.files); }}>
      <div style={zona}>
        <div style={{ flex: "1 1 260px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: Th.text }}>Completar desde la denuncia</div>
          <div style={{ fontSize: 12, color: Th.muted, marginTop: 2 }}>Arrastrá acá la denuncia, el certificado de cobertura o la carta de franquicia (PDF). Por ahora se leen los de Provincia Seguros.</div>
        </div>
        <Boton tamaño="sm" variante="secundario" onClick={() => input.current?.click()} disabled={leyendo}>{leyendo ? "Leyendo…" : "Leer PDF"}</Boton>
        <input ref={input} type="file" accept="application/pdf,.pdf" multiple hidden onChange={e => { leer(e.target.files); e.target.value = ""; }} />
        {aviso && <div role="status" style={{ flexBasis: "100%", fontSize: 13, color: Th.sub }}>{aviso}</div>}
      </div>

      {propuestas && (
        <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-md)", boxShadow: "var(--sh-2)", padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: Th.text, marginBottom: 6 }}>Datos leídos</div>
          <div style={{ display: "grid", gap: 2, marginBottom: 10 }}>
            {leidos.map(l => (
              <div key={l.archivo.name} style={{ fontSize: 12, color: l.error ? "var(--warn)" : Th.muted }}>
                {l.archivo.name}: {l.error || l.lector.nombre}
              </div>
            ))}
          </div>
          {propuestas.length === 0 ? (
            <div style={{ fontSize: 13, color: Th.sub }}>No hay datos nuevos: la ficha ya tiene todo lo que trae{leidos.length > 1 ? "n los documentos" : " el documento"}.</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: Th.muted, marginBottom: 8 }}>Tildados: se completan. Los que ya tenían otro valor quedan sin tildar para que los revises.</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: 520 }}>
                  <colgroup><col style={{ width: 34 }} /><col style={{ width: "24%" }} /><col style={{ width: "30%" }} /><col /></colgroup>
                  <thead>
                    <tr style={{ textAlign: "left", fontSize: 12, color: Th.muted }}>
                      <th style={celda}></th><th style={celda}>Dato</th><th style={celda}>En la ficha</th><th style={celda}>Leído</th>
                    </tr>
                  </thead>
                  <tbody>
                    {propuestas.map(p => (
                      <tr key={p.k} onClick={() => marcar(p.k, !p.marcado)} style={{ cursor: "pointer", opacity: p.marcado ? 1 : 0.7 }}>
                        <td style={celda}><input type="checkbox" checked={p.marcado} onChange={e => marcar(p.k, e.target.checked)} onClick={e => e.stopPropagation()} aria-label={`Completar ${p.etiqueta}`} style={{ accentColor: "var(--accent)" }} /></td>
                        <td style={{ ...celda, color: Th.sub }}>{p.etiqueta}</td>
                        <td style={{ ...celda, color: p.actual ? "var(--warn)" : Th.muted }}>{p.actual || "vacío"}</td>
                        <td style={{ ...celda, color: Th.text }}>{p.ver}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {propuestas.length > 0 && <Boton variante="primario" onClick={completar} disabled={!propuestas.some(p => p.marcado)}>Completar {propuestas.filter(p => p.marcado).length} datos</Boton>}
            <Boton variante="fantasma" onClick={() => { setPropuestas(null); setLeidos([]); }}>Cerrar</Boton>
          </div>
        </div>
      )}
    </div>
  );
}
