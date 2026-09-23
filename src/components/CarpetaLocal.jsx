import { useState, useEffect } from "react";
import { getExtension } from "../utils/formatters.js";
import {
  elegirCarpeta,
  verificarPermisoCarpeta,
  leerArchivosCarpeta,
  renombrarArchivoLocal,
  crearCarpetaCaso,
} from "../utils/carpeta.js";
import ArchivoLocalRow from "./carpeta/ArchivoLocalRow.jsx";

export function CarpetaLocal({ Th, onToast, onPreview, caso, onDirHandleChange, version }) {
  const [dirHandle, setDirHandle]         = useState(null);
  const [archivos, setArchivos]           = useState([]);
  const [cargando, setCargando]           = useState(false);
  const [nombreCarpeta, setNombreCarpeta] = useState("");

  useEffect(() => { onDirHandleChange?.(dirHandle); }, [dirHandle, onDirHandleChange]);

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
      onToast({ msg: `Carpeta "${nombre}" creada y vinculada`, type: "success" });
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

  // Al guardar archivos desde afuera (ej: lo que mandó el cliente), se relee la carpeta
  useEffect(() => { if (version) recargarCarpeta(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [version]);

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
      onToast({ msg: `${archivo.nombre} → ${nuevoNombre}`, type: "success" });
    } catch (e) {
      onToast({ msg: `Error: ${e.message}`, type: "error" });
    }
  };

  if (!soportado) {
    return (
      <div style={{ background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 8, padding: "12px 14px", marginTop: 14, fontSize: 12, color: Th.muted }}>
        La vinculación de carpeta local requiere Chrome o Edge. No disponible en este navegador.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, borderTop: `1px solid ${Th.border}`, paddingTop: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: Th.text }}>Carpeta local</span>
          {nombreCarpeta && <span style={{ fontSize: 11, color: Th.muted, marginLeft: 8 }}>{nombreCarpeta}</span>}
        </div>

        {!dirHandle ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={crearYVincular}
              disabled={cargando}
              style={{ background: "var(--ok)", border: "none", borderRadius: 7, color: "var(--on-accent)", padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: cargando ? 0.6 : 1 }}
            >
              {cargando ? "Creando..." : "Crear carpeta"}
            </button>
            <button
              onClick={vincularCarpeta}
              disabled={cargando}
              style={{ background: "var(--accent)", border: "none", borderRadius: 7, color: "var(--on-accent)", padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: cargando ? 0.6 : 1 }}
            >
              {cargando ? "Abriendo..." : "Vincular carpeta"}
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
              {cargando ? "…" : "Actualizar"}
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

      {!dirHandle && (
        <div style={{ textAlign: "center", padding: "16px 0", color: Th.muted, fontSize: 12, background: Th.card2, borderRadius: 8, border: `1px dashed ${Th.border}` }}>
          Vinculá una carpeta existente o creá una nueva para este caso
        </div>
      )}

      {dirHandle && !cargando && archivos.length === 0 && (
        <div style={{ textAlign: "center", padding: "14px 0", color: Th.muted, fontSize: 12 }}>
          La carpeta no tiene archivos
        </div>
      )}

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