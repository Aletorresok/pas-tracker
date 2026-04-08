// CarpetaLocal.jsx
import { useState } from "react";
import { getExtension } from "../utils/casoDetalleUtils.js";
import {
  elegirCarpeta,
  verificarPermisoCarpeta,
  leerArchivosCarpeta,
  renombrarArchivoLocal,
  crearCarpetaCaso,
} from "../utils/carpeta.js";
import { TIPOS_DOC } from "../utils/categorizarArchivo.js";

// ─────────────────────────────────────────────────────────────────────────────
// Fila de archivo LOCAL
// ─────────────────────────────────────────────────────────────────────────────
function ArchivoLocalRow({ archivo, dirHandle, Th, onRenombrado, onCategorizar, onToast, onPreview }) {
  const [menuOpen, setMenuOpen]       = useState(false);
  const [renombrando, setRenombrando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [guardando, setGuardando]     = useState(false);

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
    <div style={{ background: Th.card2, borderRadius: 8, marginBottom: 6, border: "1px solid #f9731644", overflow: "hidden" }}>
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
            onClick={() => setMenuOpen(m => !m)}
            style={{ background: "#f9731622", border: "1px solid #f9731644", borderRadius: 6, color: "#f97316", padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
          >
            Categorizar ▾
          </button>

          {menuOpen && (
            <div
              style={{ position: "absolute", right: 0, top: "110%", background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 10, zIndex: 50, minWidth: 190, boxShadow: "0 8px 24px #0006", overflow: "hidden" }}
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

// ─────────────────────────────────────────────────────────────────────────────
// PANEL PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export function CarpetaLocal({ Th, onToast, onPreview, caso }) {
  const [dirHandle, setDirHandle]         = useState(null);
  const [archivos, setArchivos]           = useState([]);
  const [cargando, setCargando]           = useState(false);
  const [nombreCarpeta, setNombreCarpeta] = useState("");

  const soportado = !!window.showDirectoryPicker;

  const vincularCarpeta = async () => {
    setCargando(true);
    try {
      const handle = await elegirCarpeta();
      if (!handle) { setCargando(false); return; }

      const permiso = await verificarPermisoCarpeta(handle);
      if (!permiso) {
        onToast({ msg: "Sin permiso para acceder a la carpeta", type: "error" });
        setCargando(false);
        return;
      }

      setDirHandle(handle);
      setNombreCarpeta(handle.name);
      const lista = await leerArchivosCarpeta(handle, getExtension);
      setArchivos(lista);
    } catch (e) {
      onToast({ msg: `Error: ${e.message}`, type: "error" });
    }
    setCargando(false);
  };

  const crearYVincular = async () => {
    setCargando(true);
    try {
      const result = await crearCarpetaCaso({
        asegurado: caso?.asegurado,
        compania: caso?.compania_aseguradora,
        fechaSiniestro: caso?.fecha_siniestro,
      });
      if (!result) { setCargando(false); return; }

      const { handle, nombre } = result;
      setDirHandle(handle);
      setNombreCarpeta(nombre);
      const lista = await leerArchivosCarpeta(handle, getExtension);
      setArchivos(lista);
      onToast({ msg: `📁 Carpeta "${nombre}" creada y vinculada`, type: "success" });
    } catch (e) {
      onToast({ msg: `Error: ${e.message}`, type: "error" });
    }
    setCargando(false);
  };

  const recargarCarpeta = async () => {
    if (!dirHandle) return;
    setCargando(true);
    try {
      const permiso = await verificarPermisoCarpeta(dirHandle);
      if (!permiso) {
        onToast({ msg: "Permiso revocado. Vinculá la carpeta de nuevo.", type: "error" });
        setDirHandle(null);
        setArchivos([]);
        setNombreCarpeta("");
        setCargando(false);
        return;
      }
      const lista = await leerArchivosCarpeta(dirHandle, getExtension);
      setArchivos(lista);
    } catch (e) {
      onToast({ msg: `Error: ${e.message}`, type: "error" });
    }
    setCargando(false);
  };

  const desvincularCarpeta = () => {
    setDirHandle(null);
    setArchivos([]);
    setNombreCarpeta("");
  };

  const handleRenombrado = (nombreAnterior, nuevoNombre, blob) => {
    setArchivos(prev => prev.map(a =>
      a.nombre === nombreAnterior
        ? { ...a, nombre: nuevoNombre, ext: getExtension(nuevoNombre), blob }
        : a
    ));
  };

  const handleCategorizar = async (archivo, tipo) => {
    const pattern = new RegExp(`^${tipo.replace(" ", "\\ ")}_?(\\d+)?\\.[a-z0-9]+$`, "i");
    const nums = archivos
      .map(a => { const m = a.nombre.match(pattern); return m && m[1] ? parseInt(m[1], 10) : null; })
      .filter(n => n !== null);
    const nextN = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    const nuevoNombre = `${tipo}_${nextN}${archivo.ext}`;

    try {
      await renombrarArchivoLocal(dirHandle, archivo, nuevoNombre);
      handleRenombrado(archivo.nombre, nuevoNombre, archivo.blob);
      onToast({ msg: `✅ ${archivo.nombre} → ${nuevoNombre}`, type: "success" });
    } catch (e) {
      onToast({ msg: `Error: ${e.message}`, type: "error" });
    }
  };

  if (!soportado) {
    return (
      <div style={{ background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 8, padding: "12px 14px", marginTop: 14, fontSize: 12, color: Th.muted }}>
        📁 La vinculación de carpeta local requiere Chrome o Edge. No disponible en este navegador.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, borderTop: `1px solid ${Th.border}`, paddingTop: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: Th.text }}>📁 Carpeta local</span>
          {nombreCarpeta && (
            <span style={{ fontSize: 11, color: Th.muted, marginLeft: 8 }}>{nombreCarpeta}</span>
          )}
        </div>

        {!dirHandle ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={crearYVincular}
              disabled={cargando}
              style={{ background: "#10b981", border: "none", borderRadius: 7, color: "white", padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: cargando ? 0.6 : 1 }}
            >
              {cargando ? "Creando..." : "📁 Crear carpeta"}
            </button>
            <button
              onClick={vincularCarpeta}
              disabled={cargando}
              style={{ background: "#6366f1", border: "none", borderRadius: 7, color: "white", padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: cargando ? 0.6 : 1 }}
            >
              {cargando ? "Abriendo..." : "🔗 Vincular carpeta"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={recargarCarpeta}
              disabled={cargando}
              title="Recargar archivos"
              style={{ background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 7, color: Th.sub, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}
            >
              {cargando ? "..." : "🔄"}
            </button>
            <button
              onClick={desvincularCarpeta}
              style={{ background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 7, color: Th.muted, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}
            >
              ✕ Desvincular
            </button>
          </div>
        )}
      </div>

      {/* Sin carpeta */}
      {!dirHandle && (
        <div style={{ textAlign: "center", padding: "16px 0", color: Th.muted, fontSize: 12, background: Th.card2, borderRadius: 8, border: `1px dashed ${Th.border}` }}>
          Vinculá una carpeta existente o creá una nueva para este caso
        </div>
      )}

      {/* Carpeta vacía */}
      {dirHandle && !cargando && archivos.length === 0 && (
        <div style={{ textAlign: "center", padding: "14px 0", color: Th.muted, fontSize: 12 }}>
          La carpeta no tiene archivos
        </div>
      )}

      {/* Lista */}
      {archivos.map(arch => (
        <ArchivoLocalRow
          key={arch.nombre}
          archivo={arch}
          dirHandle={dirHandle}
          Th={Th}
          onRenombrado={handleRenombrado}
          onCategorizar={handleCategorizar}
          onToast={onToast}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}