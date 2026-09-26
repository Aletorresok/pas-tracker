import { useState } from "react";
import { generarEscrito } from "../../utils/generarEscrito.js";
import Boton from "../ui/Boton.jsx";

const ADICIONALES = [
  { k: "licencia", l: "Licencia de conducir", def: true },
  { k: "presupuesto", l: "Presupuesto", def: true },
  { k: "estudiosMedicos", l: "Estudios médicos / Constancia de atención", def: false },
  { k: "cartaFranquicia", l: "Carta de franquicia", def: false },
];

// Portal PAS: el productor genera el reclamo extrajudicial para imprimir y que el asegurado lo firme en el momento.
// Los datos salen del caso y se pueden corregir acá (no se guardan: solo van al PDF).
export default function EscritoPortal({ caso, onClose }) {
  const [datos, setDatos] = useState({
    asegurado: caso.asegurado || "",
    dni: caso.dni_asegurado || "",
    fecha_siniestro: String(caso.fecha_siniestro || "").slice(0, 10),
    compania_aseguradora: caso.compania_aseguradora || "",
  });
  const [docs, setDocs] = useState(Object.fromEntries(ADICIONALES.map(a => [a.k, a.def])));
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState("");

  const cambiar = (k, v) => setDatos(d => ({ ...d, [k]: v }));
  const falta = !datos.asegurado.trim() ? "el nombre del asegurado"
    : !datos.dni.trim() ? "el DNI"
    : !datos.fecha_siniestro ? "la fecha del siniestro"
    : !datos.compania_aseguradora.trim() ? "la compañía" : "";

  const generar = async () => {
    if (falta) return;
    setGenerando(true); setError(""); setListo("");
    await generarEscrito({
      caso: { ...caso, asegurado: datos.asegurado.trim(), fecha_siniestro: datos.fecha_siniestro, compania_aseguradora: datos.compania_aseguradora.trim() },
      dni: datos.dni.trim(),
      opcionesDoc: docs,
      conFirma: true,
      onSuccess: ({ nombreArchivo }) => setListo(`Listo: se descargó ${nombreArchivo}. Imprimilo y que lo firme el asegurado.`),
      onError: setError,
    });
    setGenerando(false);
  };

  const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sub)", marginBottom: 5 };
  const campo = { width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" };

  return (
    <div className="modal-portal" role="dialog" aria-modal="true" aria-labelledby="titulo-escrito"
      style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, #000 60%, transparent)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="slide-up" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 460, padding: "22px 20px", boxShadow: "var(--shadow)", maxHeight: "100%", overflowY: "auto" }}>
        <div id="titulo-escrito" style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Reclamo para firmar</div>
        <p style={{ margin: "4px 0 16px", fontSize: 13, color: "var(--sub)", lineHeight: 1.45 }}>
          Se descarga en PDF con el lugar para la firma del asegurado. Revisá que los datos estén bien: los podés corregir acá.
        </p>

        <div style={{ display: "grid", gap: 12 }}>
          <label><span style={etiqueta}>Asegurado (nombre completo)</span>
            <input value={datos.asegurado} onChange={e => cambiar("asegurado", e.target.value)} style={campo} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label><span style={etiqueta}>DNI</span>
              <input inputMode="numeric" value={datos.dni} onChange={e => cambiar("dni", e.target.value)} placeholder="Ej: 25123456" style={campo} /></label>
            <label><span style={etiqueta}>Fecha del siniestro</span>
              <input type="date" value={datos.fecha_siniestro} onChange={e => cambiar("fecha_siniestro", e.target.value)} style={campo} /></label>
          </div>
          <label><span style={etiqueta}>Compañía a la que se reclama</span>
            <input value={datos.compania_aseguradora} onChange={e => cambiar("compania_aseguradora", e.target.value)} style={campo} /></label>

          <div>
            <span style={etiqueta}>Documentación que se acompaña</span>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Siempre: denuncia, certificado de cobertura, fotos de los daños, DNI y cédula o título.</div>
            <div style={{ display: "grid", gap: 6 }}>
              {ADICIONALES.map(a => (
                <label key={a.k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text)", cursor: "pointer" }}>
                  <input type="checkbox" checked={docs[a.k]} onChange={e => setDocs(d => ({ ...d, [a.k]: e.target.checked }))} />
                  {a.l}
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <div role="alert" style={{ marginTop: 12, fontSize: 13, color: "var(--bad)" }}>{error}</div>}
        {listo && <div role="status" style={{ marginTop: 12, fontSize: 13, color: "var(--ok)", fontWeight: 600 }}>{listo}</div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
          {falta && <span style={{ fontSize: 12, color: "var(--muted)", marginRight: "auto" }}>Falta {falta}</span>}
          <Boton variante="fantasma" onClick={onClose}>{listo ? "Cerrar" : "Cancelar"}</Boton>
          <Boton variante="primario" icono="pdf" onClick={generar} disabled={generando || !!falta}>{generando ? "Generando…" : "Descargar PDF"}</Boton>
        </div>
      </div>
    </div>
  );
}
