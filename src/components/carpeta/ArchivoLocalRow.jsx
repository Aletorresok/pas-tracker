import { useState, useRef, useEffect } from "react";
import { renombrarArchivoLocal } from "../../utils/carpeta.js";
import { TIPOS_DOC } from "../../utils/categorizarArchivo.js";

export default function ArchivoLocalRow({ archivo, dirHandle, Th, onRenombrado, onCategorizar, onToast, onPreview }) {
  const [menuOpen, setMenuOpen]        = useState(false);
  const [dropUp, setDropUp]            = useState(false);
  const [renombrando, setRenombrando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [guardando, setGuardando]     = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (menuOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 320);
    }
  }, [menuOpen]);

  const esImagen = [".jpg", ".jpeg", ".png"].includes(archivo.ext);
  const kb = (archivo.tamaño / 1024).toFixed(1);

  const iniciarRenombrar = () => {
    setNuevoNombre(archivo.nombre.replace(/\.[^.]+$/, ""));
    setRenombrando(true);
    setMenuOpen(false);
  };

  const ejecutarRenombrar = async (nombreBase) => {
    if (!nombreBase.trim()) return;
    setGuardando(true);
    const nombreFinal = nombreBase.trim().includes(".")
      ? nombreBase.trim()
      : `${nombreBase.trim()}${archivo.ext}`;
    try {
      await renombrarArchivoLocal(dirHandle, archivo, nombreFinal);
      onRenombrado(archivo.nombre, nombreFinal, archivo.blob);
      onToast({ msg: `✏️ ${archivo.nombre} → ${nombreFinal}`, type: "success" });
    } catch (e) {
      onToast({ msg: `Error al renombrar: ${e.message}`, type: "error" });
    }
    setGuardando(false);
    setRenombrando(false);
    setNuevoNombre("");
  };

  const handleCategorizar = (tipo) => {
    setMenuOpen(false);
    onCategorizar(archivo, tipo);
  };

  return (
    <div style={{ background: Th.card2, borderRadius: 8, marginBottom: 6, border: "1px solid #f9731644", overflow: "visible", position: "relative", zIndex: menuOpen ? 100 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <span style={{ fontSize: 20 }}>{esImagen ? "🖼" : "📄"}</span>
          <span style={{
            position: "absolute", top: -4, right: -8,
            fontSize: 8, background: "#f97316", color: "white",
            borderRadius: 3, padding: "1px 3px", fontWeight: 700, whiteSpace: "nowrap",
          }}>
            LOCAL
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: Th.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {archivo.nombre}
          </div>
          <div style={{ fontSize: 11, color: Th.muted }}>{kb} KB · disco local</div>
        </div>

        <button
          onClick={() => onPreview(archivo)}
          style={{ background: "#6366f122", border: "1px solid #6366f144", borderRadius: 6, color: "#818cf8", padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
        >
          Ver
        </button>

        <div style={{ position: "relative" }}>
          <button
            ref={btnRef}
            onClick={() => setMenuOpen(m => !m)}
            style={{ background: "#f9731622", border: "1px solid #f9731644", borderRadius: 6, color: "#f97316", padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
          >
            Categorizar ▾
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              style={{ position: "absolute", right: 0, ...(dropUp ? { bottom: "110%" } : { top: "110%" }), background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 10, zIndex: 9999, minWidth: 190, boxShadow: "0 8px 24px #0006", overflow: "hidden" }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              {TIPOS_DOC.map((tipo, idx) => (
                <button
                  key={tipo}
                  onClick={() => handleCategorizar(tipo)}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "8px 14px", color: Th.text, fontSize: 13, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = Th.card2}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <span style={{ fontSize: 11, color: Th.muted, minWidth: 16, textAlign: "right" }}>{idx + 1}</span>
                  <span>{tipo}</span>
                </button>
              ))}
              <div style={{ borderTop: `1px solid ${Th.border}`, margin: "4px 0" }} />
              <button
                onClick={iniciarRenombrar}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "8px 14px", color: "#818cf8", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
                onMouseEnter={e => e.currentTarget.style.background = Th.card2}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                ✏️ Renombrar…
              </button>
            </div>
          )}
        </div>
      </div>

      {renombrando && (
        <div style={{ borderTop: `1px solid ${Th.border}`, padding: "10px 12px", display: "flex", gap: 8, alignItems: "center", background: Th.card }}>
          <span style={{ fontSize: 12, color: Th.muted, whiteSpace: "nowrap" }}>Nuevo nombre:</span>
          <input
            autoFocus
            value={nuevoNombre}
            onChange={e => setNuevoNombre(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") ejecutarRenombrar(nuevoNombre);
              if (e.key === "Escape") { setRenombrando(false); setNuevoNombre(""); }
            }}
            placeholder="nombre sin extensión"
            style={{ ...Th.input, flex: 1, fontSize: 13, padding: "6px 10px" }}
          />
          <span style={{ fontSize: 12, color: Th.muted, flexShrink: 0 }}>{archivo.ext}</span>
          <button
            onClick={() => ejecutarRenombrar(nuevoNombre)}
            disabled={guardando || !nuevoNombre.trim()}
            style={{ background: "#22c55e", border: "none", borderRadius: 6, color: "white", padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: guardando ? 0.5 : 1 }}
          >
            {guardando ? "..." : "✓"}
          </button>
          <button
            onClick={() => { setRenombrando(false); setNuevoNombre(""); }}
            style={{ background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 6, color: Th.muted, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}