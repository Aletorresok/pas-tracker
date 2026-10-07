import { useCallback, useEffect, useState } from "react";
import { cargarConsultasAbiertas, marcarConsulta, pasarConsultaACaso } from "../../utils/consultas.js";
import { linkWhatsApp } from "../../utils/mensajes.js";
import { primerNombre, fmtDate } from "../../utils/formatters.js";
import { propsMenu } from "../ui/MenuContextual.jsx";
import { copiar } from "../../utils/menus.js";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";

function hace(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `hace ${Math.max(min, 1)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

const mensaje = c => `Hola ${primerNombre(c.nombre)}, soy Alexis de ATG Lex. Recibimos tu consulta por el choque${c.patente ? ` (patente ${c.patente})` : ""}. Para arrancar, ¿me mandás fotos de los daños, la denuncia del siniestro y tu DNI?`;
const esSinPas = p => /^sin\s*pas$/i.test(String(p?.nombre || "").trim());

// Hoy → lo que dejaron en la página pública /reclamo personas que todavía no son clientes (SQL 47).
// WhatsApp (queda como contactada), Pasar a caso (caso directo en "Sin Pas") o Descartar. Se oculta si no hay ninguna.
export default function ConsultasWeb({ todosLosPas = [], onCasoLocal, onAbrir }) {
  const [lista, setLista] = useState([]);
  const [ocupada, setOcupada] = useState(null);
  const [error, setError] = useState("");
  const recargar = useCallback(() => { cargarConsultasAbiertas().then(l => setLista(l || [])); }, []);
  useEffect(() => {
    recargar();
    const alVolver = () => { if (document.visibilityState === "visible") recargar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [recargar]);
  if (!lista.length) return null;

  const sacar = id => setLista(l => l.filter(x => x.id !== id));
  const contactada = async c => { if (c.estado === "nueva" && !(await marcarConsulta(c.id, "contactada"))) setLista(l => l.map(x => (x.id === c.id ? { ...x, estado: "contactada" } : x))); };
  const descartar = async c => {
    if (!window.confirm(`¿Descartar la consulta de ${c.nombre}?`)) return;
    const err = await marcarConsulta(c.id, "descartada");
    if (err) setError("No se pudo descartar: " + err); else sacar(c.id);
  };
  const pasarACaso = async c => {
    setOcupada(c.id); setError("");
    const r = await pasarConsultaACaso(c, todosLosPas.find(esSinPas));
    setOcupada(null);
    if (r.error) { setError(r.error); return; }
    sacar(c.id);
    onCasoLocal?.(r.pasId, r.caso);
    onAbrir?.(r.caso, r.pasId);
  };

  return (
    <section aria-labelledby="consultas-web" style={{ background: "var(--card)", border: "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <h2 id="consultas-web" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Consultas de la web</h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{lista.filter(c => c.estado === "nueva").length} sin contestar</span>
      </div>
      {error && <div role="alert" style={{ fontSize: 13, color: "var(--bad)", margin: "4px 0 8px" }}>{error}</div>}
      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {lista.map((c, i) => {
          const wa = linkWhatsApp(c.telefono, mensaje(c));
          const datos = [c.patente, c.compania_tercero || "compañía sin dato", c.fecha_siniestro && `choque ${fmtDate(c.fecha_siniestro)}`].filter(Boolean).join(" · ");
          return (
            <div key={c.id} className="tarea" {...propsMenu(() => [
              wa && { label: "WhatsApp", onClick: () => { window.open(wa, "_blank", "noopener"); contactada(c); } },
              { label: "Pasar a caso", onClick: () => pasarACaso(c) },
              c.estado === "nueva" && { label: "Ya la contacté", onClick: () => contactada(c) },
              { separador: true },
              { label: "Copiar teléfono", onClick: () => copiar(c.telefono) },
              c.relato && { label: "Copiar lo que contó", onClick: () => copiar(c.relato) },
              { separador: true },
              { label: "Descartar", peligro: true, onClick: () => descartar(c) },
            ])} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : "none", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <span style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <b style={{ fontSize: 14 }}>{c.nombre}</b>
                  {c.estado === "contactada" && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ok)" }}>Contactada</span>}
                  {c.lesiones && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--warn)" }}>Con lesiones</span>}
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{hace(c.created_at)}{c.ref ? ` · llegó por ${c.ref}` : ""}</span>
                </span>
                <span style={{ display: "block", fontSize: 12, color: "var(--sub)" }}>{datos}</span>
                {c.relato && <span style={{ display: "block", fontSize: 13, color: "var(--sub)", marginTop: 2 }}>“{c.relato}”</span>}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {wa && <a href={wa} target="_blank" rel="noreferrer" onClick={() => contactada(c)} className="btn-wa" aria-label={`Escribirle por WhatsApp a ${c.nombre}`} title="Escribirle por WhatsApp"><Icono nombre="mensaje" size={16} /></a>}
                <Boton tamaño="sm" variante="fantasma" onClick={() => descartar(c)}>Descartar</Boton>
                <Boton tamaño="sm" variante="primario" onClick={() => pasarACaso(c)} disabled={ocupada === c.id}>{ocupada === c.id ? "Creando…" : "Pasar a caso"}</Boton>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Llegan desde la página pública <b>/reclamo</b>. "Pasar a caso" lo crea como caso directo (Sin Pas) y abre la ficha.</div>
    </section>
  );
}
