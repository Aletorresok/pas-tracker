import { useState } from "react";
import { marcarRevisado } from "../../utils/storage.js";
import { PLANTILLAS_CLIENTE, textoCliente, linkWhatsApp } from "../../utils/mensajes.js";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";

// created_at viene sin zona horaria (es UTC)
const aFecha = c => {
  if (c.created_at) return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(c.created_at) ? c.created_at : c.created_at + "Z");
  return c.fecha_derivacion ? new Date(c.fecha_derivacion + "T12:00:00") : null;
};

function hace(fecha) {
  if (!fecha) return "";
  const min = Math.round((Date.now() - fecha.getTime()) / 60000);
  if (min < 60) return `hace ${Math.max(min, 1)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

const PRIMER_CONTACTO = PLANTILLAS_CLIENTE.find(p => p.k === "primer_contacto");

// Casos que derivaron los PAS desde el portal y todavía no abriste. Se ocultan si no hay ninguno.
export default function NuevosPortal({ casos, onAbrir, onCasoLocal }) {
  const [marcando, setMarcando] = useState(null);
  if (!casos.length) return null;

  const contactado = async (c) => {
    setMarcando(c.id);
    const cambios = await marcarRevisado(c.id, { contactado: true });
    setMarcando(null);
    if (cambios) {
      const { _pasId, _pasNombre, ...limpio } = c;
      onCasoLocal(c._pasId, { ...limpio, ...cambios });
    }
  };

  return (
    <section aria-labelledby="nuevos-portal" style={{ background: "var(--card)", border: "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <h2 id="nuevos-portal" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Nuevos del portal</h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{casos.length} sin revisar</span>
      </div>
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {casos.map((c, i) => {
          const wa = linkWhatsApp(c.telefono_asegurado, textoCliente(PRIMER_CONTACTO, c, { pasNombre: c._pasNombre }));
          return (
            <div key={c.id} className="tarea" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : "none", flexWrap: "wrap" }}>
              <button type="button" onClick={() => onAbrir(c)} style={{ flex: 1, minWidth: 180, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit" }}>
                <span style={{ display: "block", fontWeight: 600, fontSize: 14 }}>
                  {c.asegurado || "Sin nombre"}
                  {c.patente && <span style={{ marginLeft: 8, fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>{c.patente}</span>}
                </span>
                <span style={{ display: "block", fontSize: 12, color: "var(--sub)" }}>
                  {c._pasNombre} · {c.compania_aseguradora || "compañía sin cargar"} · derivado {hace(aFecha(c))}
                </span>
              </button>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn-wa" aria-label={`Escribirle por WhatsApp a ${c.asegurado}`} title="Primer contacto por WhatsApp"><Icono nombre="mensaje" size={16} /></a>}
                <Boton tamaño="sm" onClick={() => contactado(c)} disabled={marcando === c.id}>{marcando === c.id ? "Guardando…" : "Ya lo contacté"}</Boton>
                <Boton tamaño="sm" variante="primario" onClick={() => onAbrir(c)}>Abrir</Boton>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
