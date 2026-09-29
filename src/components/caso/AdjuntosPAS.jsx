import { useEffect, useState } from "react";
import { adjuntosDelCaso, descargarAdjunto } from "../../utils/adjuntosPas.js";
import { verificarPermiso } from "../../utils/formatters.js";
import Boton from "../ui/Boton.jsx";

const fecha = s => s ? new Date(s).toLocaleString("es-AR", { day: "numeric", month: "numeric", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
const peso = b => !b ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

function bajarAlNavegador(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Nombre libre en la carpeta: si ya existe "DNI.jpg", queda "DNI (2).jpg"
async function nombreLibre(dir, nombre) {
  const existentes = new Set();
  for await (const [n] of dir.entries()) existentes.add(n.toLowerCase());
  if (!existentes.has(nombre.toLowerCase())) return nombre;
  const [base, ext] = nombre.match(/^(.*?)(\.[^.]*)?$/).slice(1);
  for (let i = 2; ; i++) { const n = `${base} (${i})${ext || ""}`; if (!existentes.has(n.toLowerCase())) return n; }
}

// Lo que adjuntó el PAS desde el portal (lo mismo que llega linkeado en el mail). Queda en la nube: no se borra al bajarlo.
export default function AdjuntosPAS({ pasId, casoId, dirHandleRef, onGuardado, setToast, Th }) {
  const [datos, setDatos] = useState(null); // { delCaso, sueltos } | "error"
  const [trabajando, setTrabajando] = useState(null); // ruta | "todo"

  useEffect(() => {
    let vivo = true;
    adjuntosDelCaso(pasId, casoId).then(d => { if (vivo) setDatos(d || "error"); });
    return () => { vivo = false; };
  }, [pasId, casoId]);

  if (!datos || datos === "error" || (!datos.delCaso.length && !datos.sueltos.length)) return null;

  const bajar = async (a, aCarpeta) => {
    const dir = aCarpeta && dirHandleRef.current && await verificarPermiso(dirHandleRef.current, "readwrite") ? dirHandleRef.current : null;
    const blob = await descargarAdjunto(a.ruta);
    if (!blob) return false;
    if (dir) {
      const fh = await dir.getFileHandle(await nombreLibre(dir, a.nombre), { create: true });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
    } else {
      bajarAlNavegador(blob, a.nombre);
    }
    return true;
  };

  const uno = async (a, aCarpeta) => {
    setTrabajando(a.ruta);
    const ok = await bajar(a, aCarpeta).catch(e => { console.error(e); return false; });
    setTrabajando(null);
    if (!ok) return setToast({ msg: "No se pudo bajar el archivo de la nube.", type: "error" });
    setToast({ msg: aCarpeta ? "Guardado en la carpeta del caso" : "Descargado", type: "success" });
    if (aCarpeta) onGuardado?.();
  };

  const todo = async (lista, aCarpeta) => {
    setTrabajando("todo");
    let n = 0;
    for (const a of lista) { if (await bajar(a, aCarpeta).catch(() => false)) n++; }
    setTrabajando(null);
    setToast({ msg: `${n} de ${lista.length} ${lista.length === 1 ? "archivo" : "archivos"} ${aCarpeta ? "guardados en la carpeta" : "descargados"}`, type: n ? "success" : "error" });
    if (aCarpeta && n) onGuardado?.();
  };

  const ver = async (a) => {
    // La pestaña se abre ya, mientras dura el click; si no, el navegador la bloquea
    const ventana = window.open("", "_blank");
    const blob = await descargarAdjunto(a.ruta);
    if (!blob) { ventana?.close(); return setToast({ msg: "No se pudo abrir el archivo.", type: "error" }); }
    const url = URL.createObjectURL(blob);
    if (ventana) ventana.location.href = url; else window.open(url, "_blank");
  };

  const conCarpeta = !!dirHandleRef.current;
  const filas = lista => lista.map((a, i) => (
    <div key={a.ruta} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i ? `1px solid ${Th.border}` : "none", flexWrap: "wrap" }}>
      <span style={{ flex: 1, minWidth: 160 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: Th.text, overflowWrap: "anywhere" }}>{a.nombre}</span>
        <span style={{ display: "block", fontSize: 12, color: Th.muted }}>{[fecha(a.creado), peso(a.peso)].filter(Boolean).join(" · ")}</span>
      </span>
      <Boton tamaño="sm" variante="fantasma" onClick={() => ver(a)}>Ver</Boton>
      <Boton tamaño="sm" icono="guardar" onClick={() => uno(a, false)} disabled={!!trabajando}>{trabajando === a.ruta ? "Bajando…" : "Descargar"}</Boton>
      {conCarpeta && <Boton tamaño="sm" onClick={() => uno(a, true)} disabled={!!trabajando}>A la carpeta</Boton>}
    </div>
  ));
  const accionesTodo = lista => lista.length > 1 && (
    <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Boton tamaño="sm" variante="primario" onClick={() => todo(lista, false)} disabled={!!trabajando}>{trabajando === "todo" ? "Bajando…" : "Descargar todo"}</Boton>
      {conCarpeta && <Boton tamaño="sm" onClick={() => todo(lista, true)} disabled={!!trabajando}>Todo a la carpeta</Boton>}
    </span>
  );

  const { delCaso, sueltos } = datos;
  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: Th.text }}>Adjuntos del PAS{delCaso.length ? ` · ${delCaso.length}` : ""}</span>
        {accionesTodo(delCaso)}
      </div>
      <div style={{ fontSize: 12, color: Th.sub, marginBottom: 8 }}>
        Lo que el PAS adjuntó desde el portal (lo mismo que llega en el mail). Quedan en la nube aunque los bajes.
      </div>
      {delCaso.length ? filas(delCaso) : <div style={{ fontSize: 13, color: Th.muted, padding: "4px 0" }}>Todavía no adjuntó archivos a este caso.</div>}
      {sueltos.length > 0 && (
        <details style={{ marginTop: 10, borderTop: `1px solid ${Th.border}`, paddingTop: 10 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: Th.sub }}>Anteriores de este PAS, sin caso asignado ({sueltos.length})</summary>
          <div style={{ fontSize: 12, color: Th.muted, margin: "6px 0" }}>Se subieron antes de que los adjuntos quedaran ligados a cada caso. Guiate por la fecha y el nombre.</div>
          {accionesTodo(sueltos)}
          {filas(sueltos)}
        </details>
      )}
    </div>
  );
}
