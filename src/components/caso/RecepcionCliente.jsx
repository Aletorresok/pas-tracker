import { useState } from "react";
import { etiquetaDoc, descargarRecepcion, marcarGuardado } from "../../utils/subidasCliente.js";
import { verificarPermiso } from "../../utils/formatters.js";
import Boton from "../ui/Boton.jsx";

const extension = (s, blob) => {
  const m = String(s.nombre_original || s.ruta).match(/\.([a-z0-9]{2,5})$/i);
  if (m) return "." + m[1].toLowerCase();
  return blob?.type === "application/pdf" ? ".pdf" : ".jpg";
};

// Próximo nombre libre en la carpeta: DNI_1.jpg, DNI_2.jpg… (mismo criterio que el checklist)
async function siguienteNombre(dirHandle, tipo, ext) {
  let max = 0;
  const patron = new RegExp(`^${tipo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}_(\\d+)\\.[a-z0-9]+$`, "i");
  for await (const [nombre] of dirHandle.entries()) {
    const m = nombre.match(patron);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${tipo}_${max + 1}${ext}`;
}

function bajarAlNavegador(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Lo que mandó el cliente desde su vista y todavía está en la nube. Se guarda en la carpeta del caso y se borra de Supabase.
export default function RecepcionCliente({ pendientes, dirHandleRef, onGuardado, setToast, Th }) {
  const [trabajando, setTrabajando] = useState(null); // id | "todo"
  if (!pendientes?.length) return null;

  const guardarUno = async (s) => {
    // El permiso de la carpeta se pide primero, mientras dura el toque del botón
    const dir = dirHandleRef.current && await verificarPermiso(dirHandleRef.current, "readwrite") ? dirHandleRef.current : null;
    const blob = await descargarRecepcion(s);
    if (!blob) { setToast({ msg: "No se pudo bajar el archivo de la nube.", type: "error" }); return false; }
    const ext = extension(s, blob);
    if (dir) {
      const nombre = await siguienteNombre(dir, s.tipo, ext);
      const fh = await dir.getFileHandle(nombre, { create: true });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
    } else {
      bajarAlNavegador(blob, `${s.tipo}_cliente${ext}`);
    }
    return await marcarGuardado(s);
  };

  const guardar = async (s) => {
    setTrabajando(s.id);
    const ok = await guardarUno(s).catch(e => { console.error(e); return false; });
    setTrabajando(null);
    if (ok) { setToast({ msg: dirHandleRef.current ? "Guardado en la carpeta del caso" : "Descargado", type: "success" }); onGuardado?.(); }
  };

  const guardarTodo = async () => {
    setTrabajando("todo");
    let n = 0;
    for (const s of pendientes) { if (await guardarUno(s).catch(() => false)) n++; }
    setTrabajando(null);
    setToast({ msg: `${n} ${n === 1 ? "archivo guardado" : "archivos guardados"}`, type: n ? "success" : "error" });
    onGuardado?.();
  };

  const ver = async (s) => {
    const blob = await descargarRecepcion(s);
    if (blob) window.open(URL.createObjectURL(blob), "_blank", "noopener");
  };

  return (
    <div style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--card))", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))", borderRadius: 12, padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: Th.text }}>El cliente mandó {pendientes.length === 1 ? "1 archivo" : `${pendientes.length} archivos`}</span>
        {pendientes.length > 1 && <Boton tamaño="sm" variante="primario" onClick={guardarTodo} disabled={!!trabajando}>{trabajando === "todo" ? "Guardando…" : "Guardar todo"}</Boton>}
      </div>
      <div style={{ fontSize: 12, color: Th.sub, marginBottom: 8 }}>
        {dirHandleRef.current ? "Se guardan en la carpeta vinculada con su nombre (DNI_1, FOTOS_2…) y se borran de la nube." : "Vinculá la carpeta del caso (abajo) para guardarlos ahí; si no, se descargan. Después se borran de la nube."}
      </div>
      {pendientes.map((s, i) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i ? `1px solid ${Th.border}` : "none", flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: 160 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: Th.text }}>{etiquetaDoc(s.tipo)}</span>
            <span style={{ display: "block", fontSize: 12, color: Th.muted }}>{s.nombre_original} · {new Date(s.creado).toLocaleString("es-AR", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </span>
          <Boton tamaño="sm" variante="fantasma" onClick={() => ver(s)}>Ver</Boton>
          <Boton tamaño="sm" onClick={() => guardar(s)} disabled={!!trabajando}>{trabajando === s.id ? "Guardando…" : "Guardar"}</Boton>
        </div>
      ))}
    </div>
  );
}
