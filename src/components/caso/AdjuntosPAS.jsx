import { useEffect, useState } from "react";
import { adjuntosDelCaso, descargarAdjunto, borrarAdjuntos, yaBajado, marcarBajado, esImagen, tipoSugerido, siguienteNombre } from "../../utils/adjuntosPas.js";
import { verificarPermiso } from "../../utils/formatters.js";
import Boton from "../ui/Boton.jsx";

const fecha = s => s ? new Date(s).toLocaleString("es-AR", { day: "numeric", month: "numeric", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
const peso = b => !b ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
const extension = n => (String(n).match(/\.[a-z0-9]{2,5}$/i) || [".pdf"])[0].toLowerCase();

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

// Lo que adjuntó el PAS desde el portal (lo mismo que llega linkeado en el mail). Queda en la nube hasta que vos lo borres:
// "Borrar de la nube" avisa si todavía no lo bajaste. Los PDF con nombre reconocible (denuncia, cobertura…) se guardan ya categorizados.
export default function AdjuntosPAS({ pasId, casoId, dirHandleRef, onGuardado, onLeer, setToast, Th }) {
  const [datos, setDatos] = useState(null); // { delCaso, sueltos } | "error"
  const [trabajando, setTrabajando] = useState(null); // ruta | "todo"
  const [confirmando, setConfirmando] = useState(null); // ruta | "bajados"
  const [, setVersion] = useState(0); // se vuelve a dibujar al marcar archivos como bajados

  useEffect(() => {
    let vivo = true;
    adjuntosDelCaso(pasId, casoId).then(d => { if (vivo) setDatos(d || "error"); });
    return () => { vivo = false; };
  }, [pasId, casoId]);

  if (!datos || datos === "error" || (!datos.delCaso.length && !datos.sueltos.length)) return null;

  // Baja el archivo (a la carpeta del caso o al navegador). Devuelve { blob, nombre } o null
  const bajar = async (a, aCarpeta) => {
    const dir = aCarpeta && dirHandleRef.current && await verificarPermiso(dirHandleRef.current, "readwrite") ? dirHandleRef.current : null;
    const blob = await descargarAdjunto(a.ruta);
    if (!blob) return null;
    let nombre = a.nombre;
    if (dir) {
      const tipo = tipoSugerido(a.nombre);
      nombre = tipo ? await siguienteNombre(dir, tipo, extension(a.nombre)) : await nombreLibre(dir, a.nombre);
      const fh = await dir.getFileHandle(nombre, { create: true });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
    } else {
      bajarAlNavegador(blob, a.nombre);
    }
    marcarBajado(a.ruta);
    return { blob, nombre };
  };

  const uno = async (a, aCarpeta) => {
    setTrabajando(a.ruta);
    const r = await bajar(a, aCarpeta).catch(e => { console.error(e); return null; });
    setTrabajando(null);
    if (!r) return setToast({ msg: "No se pudo bajar el archivo de la nube.", type: "error" });
    setToast({ msg: aCarpeta ? `Guardado en la carpeta como ${r.nombre}` : "Descargado", type: "success" });
    setVersion(v => v + 1);
    if (aCarpeta) onGuardado?.();
  };

  const todo = async (lista, aCarpeta, leer = false) => {
    setTrabajando("todo");
    let n = 0; const paraLeer = [];
    for (const a of lista) {
      const r = await bajar(a, aCarpeta).catch(() => null);
      if (r) { n++; if (leer && /^(DENUNCIA|CERTIFICADO)$/.test(tipoSugerido(a.nombre) || "") && /\.pdf$/i.test(a.nombre)) paraLeer.push(new File([r.blob], r.nombre, { type: "application/pdf" })); }
    }
    setTrabajando(null);
    setVersion(v => v + 1);
    setToast({ msg: `${n} de ${lista.length} ${lista.length === 1 ? "archivo" : "archivos"} ${aCarpeta ? "guardados en la carpeta" : "descargados"}`, type: n ? "success" : "error" });
    if (aCarpeta && n) onGuardado?.();
    if (paraLeer.length) onLeer?.(paraLeer);
  };

  const ver = async a => {
    // La pestaña se abre ya, mientras dura el click; si no, el navegador la bloquea
    const ventana = window.open("", "_blank");
    const blob = await descargarAdjunto(a.ruta);
    if (!blob) { ventana?.close(); return setToast({ msg: "No se pudo abrir el archivo.", type: "error" }); }
    const url = URL.createObjectURL(blob);
    if (ventana) ventana.location.href = url; else window.open(url, "_blank");
  };

  // Borrar de la nube: solo cuando vos lo decidís, con aviso si todavía no lo bajaste
  const borrar = async rutas => {
    setTrabajando("borrando");
    const ok = await borrarAdjuntos(rutas);
    setTrabajando(null); setConfirmando(null);
    if (!ok) return setToast({ msg: "No se pudo borrar de la nube.", type: "error" });
    const sin = l => l.filter(a => !rutas.includes(a.ruta));
    setDatos(d => ({ delCaso: sin(d.delCaso), sueltos: sin(d.sueltos) }));
    setToast({ msg: `${rutas.length} ${rutas.length === 1 ? "archivo borrado" : "archivos borrados"} de la nube`, type: "success" });
  };

  const conCarpeta = !!dirHandleRef.current;
  const { delCaso, sueltos } = datos;
  const todos = [...delCaso, ...sueltos];
  const sinBajar = delCaso.filter(a => !yaBajado(a.ruta));
  const bajados = todos.filter(a => yaBajado(a.ruta));
  const fotos = delCaso.filter(a => esImagen(a.nombre));
  const docs = delCaso.filter(a => !esImagen(a.nombre));
  const hayDenuncia = conCarpeta && docs.some(a => /^(DENUNCIA|CERTIFICADO)$/.test(tipoSugerido(a.nombre) || "") && /\.pdf$/i.test(a.nombre));

  const chip = (texto, color) => <span style={{ fontSize: 12, fontWeight: 600, color }}>{texto}</span>;
  const filas = lista => lista.map((a, i) => {
    const bajado = yaBajado(a.ruta);
    const tipo = conCarpeta && !bajado ? tipoSugerido(a.nombre) : null;
    return (
      <div key={a.ruta} style={{ padding: "8px 0", borderTop: i ? `1px solid ${Th.border}` : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: 160 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: Th.text, overflowWrap: "anywhere" }}>{a.nombre}</span>
            <span style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: Th.muted }}>
              {[fecha(a.creado), peso(a.peso)].filter(Boolean).join(" · ")}
              {bajado ? chip("Ya bajado", "var(--ok)") : chip("Sin bajar", "var(--warn)")}
              {tipo && chip(`Se guarda como ${tipo}_N`, "var(--accent-ink)")}
            </span>
          </span>
          <Boton tamaño="sm" variante="fantasma" onClick={() => ver(a)}>Ver</Boton>
          <Boton tamaño="sm" icono="guardar" onClick={() => uno(a, false)} disabled={!!trabajando}>{trabajando === a.ruta ? "Bajando…" : "Descargar"}</Boton>
          {conCarpeta && <Boton tamaño="sm" onClick={() => uno(a, true)} disabled={!!trabajando}>A la carpeta</Boton>}
          <Boton tamaño="sm" variante="peligro" onClick={() => setConfirmando(confirmando === a.ruta ? null : a.ruta)} disabled={!!trabajando}>Borrar de la nube</Boton>
        </div>
        {confirmando === a.ruta && (
          <div role="alert" style={{ marginTop: 8, padding: "10px 12px", borderRadius: "var(--r-sm)", background: "color-mix(in srgb, var(--bad) 8%, var(--card))", border: "1px solid color-mix(in srgb, var(--bad) 35%, var(--border))", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 200, fontSize: 13, color: Th.text }}>
              {bajado ? "Ya lo bajaste. Al borrarlo se libera espacio y no se puede deshacer." : "Todavía no lo bajaste: si lo borrás, se pierde."}
            </span>
            <Boton tamaño="sm" variante="peligro" disabled={!!trabajando} onClick={() => borrar([a.ruta])}>{trabajando === "borrando" ? "Borrando…" : bajado ? "Borrar" : "Borrar igual"}</Boton>
            <Boton tamaño="sm" variante="fantasma" onClick={() => setConfirmando(null)}>Cancelar</Boton>
          </div>
        )}
      </div>
    );
  });

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: Th.text }}>
          Adjuntos del PAS{delCaso.length ? ` · ${delCaso.length}` : ""}
          {sinBajar.length > 0 && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: "var(--warn)" }}>{sinBajar.length} sin bajar</span>}
        </span>
        {delCaso.length > 0 && (
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {hayDenuncia && onLeer && <Boton tamaño="sm" variante="primario" onClick={() => todo(sinBajar.length ? sinBajar : delCaso, true, true)} disabled={!!trabajando}>{trabajando === "todo" ? "Guardando…" : "Guardar todo y leer la denuncia"}</Boton>}
            {delCaso.length > 1 && <Boton tamaño="sm" onClick={() => todo(delCaso, false)} disabled={!!trabajando}>Descargar todo</Boton>}
            {delCaso.length > 1 && conCarpeta && <Boton tamaño="sm" onClick={() => todo(delCaso, true)} disabled={!!trabajando}>Todo a la carpeta</Boton>}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: Th.sub, marginBottom: 8 }}>
        Lo que el PAS adjuntó desde el portal (lo mismo que llega en el mail). Quedan en la nube hasta que los borres vos.
      </div>
      {docs.length > 0 && filas(docs)}
      {fotos.length > 0 && (
        <details open={docs.length === 0} style={{ marginTop: docs.length ? 10 : 0, borderTop: docs.length ? `1px solid ${Th.border}` : "none", paddingTop: docs.length ? 10 : 0 }}>
          <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: Th.text }}>Fotos · {fotos.length}</summary>
          <div style={{ margin: "6px 0" }}>
            {fotos.length > 1 && (
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <Boton tamaño="sm" onClick={() => todo(fotos, false)} disabled={!!trabajando}>Descargar las {fotos.length}</Boton>
                {conCarpeta && <Boton tamaño="sm" onClick={() => todo(fotos, true)} disabled={!!trabajando}>Guardar las {fotos.length} en la carpeta</Boton>}
              </span>
            )}
            {filas(fotos)}
          </div>
        </details>
      )}
      {delCaso.length === 0 && <div style={{ fontSize: 13, color: Th.muted, padding: "4px 0" }}>Todavía no adjuntó archivos a este caso.</div>}
      {sueltos.length > 0 && (
        <details style={{ marginTop: 10, borderTop: `1px solid ${Th.border}`, paddingTop: 10 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: Th.sub }}>Anteriores de este PAS, sin caso asignado ({sueltos.length})</summary>
          <div style={{ fontSize: 12, color: Th.muted, margin: "6px 0" }}>Se subieron antes de que los adjuntos quedaran ligados a cada caso. Guiate por la fecha y el nombre.</div>
          {sueltos.length > 1 && <Boton tamaño="sm" onClick={() => todo(sueltos, false)} disabled={!!trabajando}>Descargar todo</Boton>}
          {filas(sueltos)}
        </details>
      )}
      {bajados.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${Th.border}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {confirmando === "bajados" ? (
            <>
              <span style={{ flex: 1, minWidth: 200, fontSize: 13, color: Th.text }}>Se borran de la nube {bajados.length} {bajados.length === 1 ? "archivo que ya bajaste" : "archivos que ya bajaste"}. No se puede deshacer.</span>
              <Boton tamaño="sm" variante="peligro" disabled={!!trabajando} onClick={() => borrar(bajados.map(a => a.ruta))}>{trabajando === "borrando" ? "Borrando…" : "Borrar"}</Boton>
              <Boton tamaño="sm" variante="fantasma" onClick={() => setConfirmando(null)}>Cancelar</Boton>
            </>
          ) : (
            <Boton tamaño="sm" variante="peligro" disabled={!!trabajando} onClick={() => setConfirmando("bajados")}>Borrar de la nube los {bajados.length} ya bajados</Boton>
          )}
        </div>
      )}
    </div>
  );
}
