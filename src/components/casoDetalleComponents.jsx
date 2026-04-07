// casoDetalleComponents.jsx
import { useState, useEffect } from "react";
import { getExtension } from "../utils/casoDetalleUtils.js";
import { TIPOS_DOC, DOCS_REQUERIDOS_RECLAMO } from "../utils/categorizarArchivo.js";

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
export function Toast({ msg, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  const colors = { success: "#22c55e", error: "#ef4444", info: "#6366f1", warn: "#f97316" };
  const c = colors[type] || colors.info;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 20, zIndex: 999, background: "#1a2535", border: `1px solid ${c}55`, borderRadius: 12, padding: "12px 18px", color: c, fontSize: 14, fontWeight: 600, maxWidth: 340, boxShadow: "0 8px 32px #0008", display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: c, cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW MODAL
// ─────────────────────────────────────────────────────────────────────────────
export function PreviewModal({ archivo, onClose }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!archivo) return;
    const objectUrl = URL.createObjectURL(archivo.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [archivo]);

  if (!archivo || !url) return null;
  const esImagen = [".jpg", ".jpeg", ".png"].includes(getExtension(archivo.nombre));
  const esPdf = getExtension(archivo.nombre) === ".pdf";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.88)", zIndex: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#1a2535", border: "1px solid #2d3f55", borderRadius: 16, width: "100%", maxWidth: 780, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #2d3f55" }}>
          <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{archivo.nombre}</div>
          <button onClick={onClose} style={{ background: "#222f42", border: "1px solid #2d3f55", borderRadius: 8, color: "#94a3b8", padding: "4px 12px", cursor: "pointer" }}>✕ Cerrar</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
          {esImagen && <img src={url} alt={archivo.nombre} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 8, objectFit: "contain" }} />}
          {esPdf && <iframe src={url} title={archivo.nombre} style={{ width: "100%", height: "70vh", border: "none", borderRadius: 8 }} />}
          {!esImagen && !esPdf && <div style={{ color: "#64748b" }}>Tipo de archivo no soportado para previsualización</div>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVO ROW
// ─────────────────────────────────────────────────────────────────────────────
export function ArchivoRow({ archivo, onPreview, onCategorizar, onRenombrar, Th }) {
  const [menuOpen, setMenuOpen]         = useState(false);
  const [renombrando, setRenombrando]   = useState(false);
  const [nuevoNombre, setNuevoNombre]   = useState("");
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  const esImagen = [".jpg", ".jpeg", ".png"].includes(archivo.ext);
  const kb = (archivo.tamaño / 1024).toFixed(1);

  const iniciarRenombrar = () => {
    // Pre-cargar el nombre actual sin extensión como punto de partida
    const sinExt = archivo.nombre.replace(/\.[^.]+$/, "");
    setNuevoNombre(sinExt);
    setRenombrando(true);
    setMenuOpen(false);
  };

  const confirmarRenombrar = async () => {
    if (!nuevoNombre.trim()) return;
    setGuardandoNombre(true);
    await onRenombrar(nuevoNombre.trim());
    setGuardandoNombre(false);
    setRenombrando(false);
    setNuevoNombre("");
  };

  const cancelarRenombrar = () => {
    setRenombrando(false);
    setNuevoNombre("");
  };

  return (
    <div style={{ background: Th.card2, borderRadius: 8, marginBottom: 6, border: `1px solid ${Th.border}`, overflow: "hidden" }}>
      {/* Fila principal */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px" }}>
        <div style={{ fontSize: 20 }}>{esImagen ? "🖼" : "📄"}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: Th.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {archivo.nombre}
          </div>
          <div style={{ fontSize: 11, color: Th.muted }}>{kb} KB · {archivo.tipo || archivo.ext}</div>
        </div>

        {/* Botón Ver */}
        <button
          onClick={onPreview}
          style={{ background: "#6366f122", border: "1px solid #6366f144", borderRadius: 6, color: "#818cf8", padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
        >
          Ver
        </button>

        {/* Menú Categorizar / Renombrar */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(m => !m)}
            style={{ background: "#f9731622", border: "1px solid #f9731644", borderRadius: 6, color: "#f97316", padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
          >
            Categorizar ▾
          </button>

          {menuOpen && (
            <div
              style={{ position: "absolute", right: 0, top: "110%", background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 10, zIndex: 50, minWidth: 180, boxShadow: "0 8px 24px #0006", overflow: "hidden" }}
              // Cerrar si se hace click fuera
              onMouseLeave={() => setMenuOpen(false)}
            >
              {/* Tipos de documento con numeración implícita */}
              {TIPOS_DOC.map((tipo, idx) => (
                <button
                  key={tipo}
                  onClick={() => { onCategorizar(tipo); setMenuOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "8px 14px", color: Th.text, fontSize: 13, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => e.currentTarget.style.background = Th.card2}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <span style={{ fontSize: 11, color: Th.muted, minWidth: 16, textAlign: "right" }}>{idx + 1}</span>
                  <span>{tipo}</span>
                </button>
              ))}

              {/* Separador */}
              <div style={{ borderTop: `1px solid ${Th.border}`, margin: "4px 0" }} />

              {/* Renombrar libre */}
              <button
                onClick={iniciarRenombrar}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "8px 14px", color: "#818cf8", fontSize: 13, cursor: "pointer", textAlign: "left", fontWeight: 600 }}
                onMouseEnter={e => e.currentTarget.style.background = Th.card2}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                ✏️ Renombrar…
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Panel de renombrado (se expande inline) */}
      {renombrando && (
        <div style={{ borderTop: `1px solid ${Th.border}`, padding: "10px 12px", display: "flex", gap: 8, alignItems: "center", background: Th.card }}>
          <span style={{ fontSize: 12, color: Th.muted, whiteSpace: "nowrap" }}>Nuevo nombre:</span>
          <input
            autoFocus
            value={nuevoNombre}
            onChange={e => setNuevoNombre(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") confirmarRenombrar(); if (e.key === "Escape") cancelarRenombrar(); }}
            placeholder="nombre sin extensión"
            style={{ ...Th.input, flex: 1, fontSize: 13, padding: "6px 10px" }}
          />
          <span style={{ fontSize: 12, color: Th.muted }}>{archivo.ext}</span>
          <button
            onClick={confirmarRenombrar}
            disabled={guardandoNombre || !nuevoNombre.trim()}
            style={{ background: "#22c55e", border: "none", borderRadius: 6, color: "white", padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: guardandoNombre ? 0.5 : 1, whiteSpace: "nowrap" }}
          >
            {guardandoNombre ? "..." : "✓"}
          </button>
          <button
            onClick={cancelarRenombrar}
            style={{ background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 6, color: Th.muted, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKLIST DE DOCUMENTACIÓN
// Usá este componente en CasoUnificado en lugar del grid inline que tenías
// ─────────────────────────────────────────────────────────────────────────────
export function ChecklistDocumental({ archivos, Th }) {
  // Para cada tipo, contamos cuántos archivos hay
  const conteo = {};
  TIPOS_DOC.forEach(t => { conteo[t] = 0; });
  archivos.forEach(a => {
    // El nombre tiene formato TIPO_N.ext — extraemos el tipo
    const match = a.nombre.match(/^([^_]+(?:_[^_\d][^_]*)*)_\d+\.[a-z0-9]+$/i);
    const tipo = match ? match[1].toUpperCase() : null;
    if (tipo && conteo[tipo] !== undefined) conteo[tipo]++;
    // También chequeamos el campo tipo por si ya fue categorizado antes
    if (a.tipo && conteo[a.tipo] !== undefined) conteo[a.tipo] = Math.max(conteo[a.tipo], 1);
  });

  const faltanRequeridos = DOCS_REQUERIDOS_RECLAMO.filter(t => conteo[t] === 0);
  const listoParaReclamo = faltanRequeridos.length === 0;

  return (
    <div>
      {/* Banner de estado de reclamo */}
      <div style={{
        borderRadius: 8,
        padding: "10px 14px",
        marginBottom: 14,
        background: listoParaReclamo ? "#22c55e15" : "#ef444415",
        border: `1px solid ${listoParaReclamo ? "#22c55e44" : "#ef444444"}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>{listoParaReclamo ? "✅" : "⚠️"}</span>
        <div style={{ flex: 1 }}>
          {listoParaReclamo ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>
              Listo para iniciar reclamo
            </span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
              Faltan para el reclamo:{" "}
              <span style={{ fontWeight: 400 }}>{faltanRequeridos.join(", ")}</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid de todos los tipos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {TIPOS_DOC.map((tipo, idx) => {
          const cantidad = conteo[tipo];
          const tiene = cantidad > 0;
          const esRequerido = DOCS_REQUERIDOS_RECLAMO.includes(tipo);
          return (
            <div
              key={tipo}
              style={{
                border: `1px solid ${tiene ? "#22c55e66" : esRequerido ? "#ef444444" : Th.border}`,
                borderRadius: 8,
                padding: "8px 10px",
                background: tiene ? "#22c55e0d" : esRequerido ? "#ef44440d" : "transparent",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 11, color: Th.muted, minWidth: 14, textAlign: "right", flexShrink: 0 }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: tiene ? "#22c55e" : esRequerido ? "#ef4444" : Th.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tipo}
                </div>
                {tiene && cantidad > 1 && (
                  <div style={{ fontSize: 10, color: Th.muted }}>{cantidad} archivos</div>
                )}
              </div>
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {tiene ? "✅" : esRequerido ? "❌" : "○"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}