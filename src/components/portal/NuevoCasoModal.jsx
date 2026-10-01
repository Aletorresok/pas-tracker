import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase.js";
import { subirArchivosYNotificar } from "../../utils/portalStorageUtils.js";
import { listaCompanias } from "../../utils/companias.js";
import { linkWhatsApp, linkVistaCliente, clientePuedeEntrar, FIRMA } from "../../utils/mensajes.js";
import { primerNombre, fechaLocalISO } from "../../utils/formatters.js";
import { estadoInfo } from "../../constants.js";
import SelectorArchivos from "./SelectorArchivos.jsx";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";

const VACIO = { asegurado: "", telefono: "", patente: "", dni: "", fecha_siniestro: "", compania: "" };
const BORRADOR = "draft_nuevo_caso";
const leerBorrador = () => { try { return { ...VACIO, ...JSON.parse(sessionStorage.getItem(BORRADOR) || "{}") }; } catch { return VACIO; } };
const guardarBorrador = v => { try { sessionStorage.setItem(BORRADOR, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const borrarBorrador = () => { try { sessionStorage.removeItem(BORRADOR); sessionStorage.removeItem("draft_otra_compania"); } catch { /* sin almacenamiento */ } };
const soloPatente = v => String(v || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

const etiqueta = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 };
const opcional = { fontWeight: 500, color: "var(--muted)" };
const campo = { width: "100%", boxSizing: "border-box", background: "var(--card)", border: "1px solid var(--border2)", borderRadius: "var(--r-sm)", padding: "10px 12px", color: "var(--text)", font: "inherit", fontSize: 15, outline: "none" };
const ayuda = { display: "block", fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 };

// Derivar un caso desde el portal: datos del asegurado, compañía del tercero y documentación.
// Al terminar muestra la confirmación y ofrece pasarle al cliente el link de seguimiento.
export default function NuevoCasoModal({ pasId, pasNombre, onClose, onCasoCreado, casos = [], companias = [] }) {
  const [form, setForm] = useState(leerBorrador);
  const [archivos, setArchivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(null); // { caso, fallidos }

  useEffect(() => { if (!listo) guardarBorrador(form); }, [form, listo]);
  // Esc cierra (si no está enviando)
  useEffect(() => {
    const tecla = e => { if (e.key === "Escape" && !enviando) onClose(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [enviando, onClose]);

  const opcionesCompania = useMemo(() => listaCompanias(companias), [companias]);
  const cambiar = (k, v) => setForm(f => ({ ...f, [k]: k === "patente" ? v.toUpperCase() : v }));

  // Mismo auto ya derivado por este PAS (puede ser otro siniestro: solo avisa)
  const repetido = useMemo(() => {
    const p = soloPatente(form.patente);
    return p.length >= 6 ? casos.find(c => !c._demo && soloPatente(c.patente) === p) : null;
  }, [form.patente, casos]);
  const faltaSeguimiento = !soloPatente(form.patente) || String(form.dni).replace(/\D/g, "").length < 3;

  const enviar = async (e) => {
    e.preventDefault();
    const faltan = [!form.asegurado.trim() && "el titular", !form.telefono.trim() && "el teléfono", !form.fecha_siniestro && "la fecha del siniestro", !form.compania.trim() && "la compañía"].filter(Boolean);
    if (faltan.length) { setError(`Falta completar ${faltan.join(", ").replace(/, ([^,]*)$/, " y $1")}.`); return; }
    setEnviando(true);
    setError("");

    const nuevoCaso = {
      pas_id: pasId,
      asegurado: form.asegurado.trim(),
      telefono_asegurado: form.telefono.trim(),
      origen: "portal",
      patente: soloPatente(form.patente),
      dni_asegurado: String(form.dni).replace(/\D/g, "") || null,
      fecha_siniestro: form.fecha_siniestro,
      compania_aseguradora: form.compania.trim(),
      estado: "doc_pendiente",
      fecha_derivacion: fechaLocalISO(),
      caso_id: Date.now(),
    };
    const { data, error: dbError } = await supabase.from("pas_casos").insert([nuevoCaso]).select().single();
    if (dbError || !data) {
      console.error("[derivar] no se guardó el caso:", dbError);
      setError("No se pudo derivar el caso: no se guardó nada. Revisá la conexión y probá de nuevo (lo que cargaste queda guardado).");
      setEnviando(false);
      return;
    }

    // El caso ya está: los archivos y el aviso no lo pueden deshacer
    let fallidos = [];
    try {
      const r = await subirArchivosYNotificar({ pasId, casoId: data.id, pasNombre, casoData: form, archivos });
      fallidos = r.fallidos;
    } catch (err) {
      console.error("[derivar] archivos:", err);
      fallidos = archivos.map(f => f.name);
    }
    borrarBorrador();
    onCasoCreado?.(data);
    setListo({ caso: data, fallidos });
    setEnviando(false);
  };

  const otro = () => { setForm(VACIO); setArchivos([]); setListo(null); setError(""); };

  return (
    <div className="modal-portal" role="dialog" aria-modal="true" aria-label="Derivar un caso"
      onClick={e => e.target === e.currentTarget && !enviando && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16, overflowY: "auto" }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", width: "100%", maxWidth: 480, padding: 24, boxShadow: "var(--shadow)", maxHeight: "100%", overflowY: "auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{listo ? "Caso derivado" : "Derivar un caso"}</h2>
          <button type="button" onClick={onClose} disabled={enviando} aria-label="Cerrar" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex", padding: 4 }}><Icono nombre="cerrar" size={18} /></button>
        </div>

        {listo ? <Confirmacion {...listo} pasNombre={pasNombre} onOtro={otro} onListo={onClose} /> : (
          <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && <div role="alert" style={{ background: "color-mix(in srgb, var(--bad) 10%, var(--card))", border: "1px solid var(--bad)", borderRadius: "var(--r-sm)", padding: "10px 12px", color: "var(--bad)", fontSize: 13 }}>{error}</div>}

            <label><span style={etiqueta}>Titular (apellido y nombre)</span>
              <input value={form.asegurado} onChange={e => cambiar("asegurado", e.target.value)} placeholder="Ej: Pérez Juan" autoComplete="off" style={campo} />
            </label>
            <label><span style={etiqueta}>Teléfono del titular</span>
              <input type="tel" inputMode="tel" value={form.telefono} onChange={e => cambiar("telefono", e.target.value)} placeholder="Ej: 11 2345 6789" style={campo} />
              <span style={ayuda}>El estudio le escribe por WhatsApp para pedirle la documentación.</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              <label><span style={etiqueta}>Patente <span style={opcional}>(recomendado)</span></span>
                <input value={form.patente} onChange={e => cambiar("patente", e.target.value)} placeholder="Ej: AB123CD" autoCapitalize="characters" style={{ ...campo, textTransform: "uppercase", fontFamily: "var(--mono)" }} />
              </label>
              <label><span style={etiqueta}>DNI del titular <span style={opcional}>(recomendado)</span></span>
                <input inputMode="numeric" value={form.dni} onChange={e => cambiar("dni", e.target.value)} placeholder="Ej: 25123456" style={campo} />
              </label>
            </div>
            {repetido
              ? <div role="status" style={{ fontSize: 13, color: "var(--warn)", marginTop: -6 }}>Ya derivaste un caso con esta patente: <b>{repetido.asegurado}</b> ({estadoInfo(repetido.estado).label}). Si es otro siniestro, seguí igual.</div>
              : <span style={{ ...ayuda, marginTop: -8, color: faltaSeguimiento ? "var(--warn)" : "var(--muted)" }}>
                  {faltaSeguimiento ? "Sin patente y DNI el titular no puede seguir su caso online ni mandar la documentación por el link." : "Con la patente y el DNI el titular sigue su caso online y manda la documentación por el link."}
                </span>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              <label><span style={etiqueta}>Fecha del siniestro</span>
                <input type="date" value={form.fecha_siniestro} max={fechaLocalISO()} onChange={e => cambiar("fecha_siniestro", e.target.value)} style={campo} />
              </label>
              <label><span style={etiqueta}>Compañía del tercero</span>
                <input value={form.compania} onChange={e => cambiar("compania", e.target.value)} list="companias-portal" placeholder="Escribí para buscar" autoComplete="off" style={campo} />
                <datalist id="companias-portal">{opcionesCompania.map(c => <option key={c} value={c} />)}</datalist>
              </label>
            </div>
            <div>
              <span style={etiqueta}>Documentación <span style={opcional}>(opcional, se puede mandar después)</span></span>
              <SelectorArchivos archivos={archivos} onChange={setArchivos} disabled={enviando} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <Boton variante="fantasma" onClick={onClose} disabled={enviando}>Cancelar</Boton>
              <Boton type="submit" variante="primario" disabled={enviando}>
                {enviando ? (archivos.length ? "Enviando archivos…" : "Derivando…") : "Derivar caso"}
              </Boton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Confirmacion({ caso, fallidos, pasNombre, onOtro, onListo }) {
  const puede = clientePuedeEntrar(caso);
  const texto = `Hola ${primerNombre(caso.asegurado || "")}, soy ${pasNombre ? primerNombre(pasNombre) : "tu productor de seguros"}. Le pasé tu caso al ${FIRMA}, que se va a encargar del reclamo${caso.compania_aseguradora ? ` ante ${caso.compania_aseguradora}` : ""}. Te va a escribir en estos días.${puede ? ` Podés seguir cómo va y mandar la documentación acá: ${linkVistaCliente(caso.patente)} (entrás con la patente y los últimos 3 números de tu DNI).` : ""}`;
  const wa = linkWhatsApp(caso.telefono_asegurado, texto);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ flex: "none", width: 36, height: 36, borderRadius: "50%", background: "color-mix(in srgb, var(--ok) 15%, var(--card))", color: "var(--ok)", display: "grid", placeItems: "center" }}><Icono nombre="check" size={20} /></span>
        <div style={{ fontSize: 14, color: "var(--sub)", lineHeight: 1.5 }}>
          <b style={{ color: "var(--text)" }}>{caso.asegurado}</b> ya está en el estudio. Lo ves en "En curso"; cuando lo tomemos, la tarjeta lo muestra.
        </div>
      </div>
      {fallidos.length > 0 && (
        <div role="alert" style={{ fontSize: 13, color: "var(--warn)", background: "color-mix(in srgb, var(--warn) 10%, var(--card))", borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
          {fallidos.length === 1 ? "Un archivo no se pudo subir" : `${fallidos.length} archivos no se pudieron subir`} ({fallidos.join(", ")}). Mandalos desde la tarjeta del caso → "Adjuntar documentación".
        </div>
      )}
      {wa && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Avisale a tu cliente</div>
          <div style={{ fontSize: 13, color: "var(--sub)", marginBottom: 10, lineHeight: 1.45 }}>
            Un WhatsApp contándole que el estudio lo va a contactar{puede ? " y con el link para seguir el caso y mandar la documentación" : ""}.
          </div>
          <a href={wa} target="_blank" rel="noreferrer" className="btn-wa-grande" style={{ padding: "9px 14px", fontSize: 14 }}><Icono nombre="mensaje" size={16} /> Avisarle por WhatsApp</a>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <Boton variante="fantasma" icono="agregar" onClick={onOtro}>Derivar otro</Boton>
        <Boton variante="primario" onClick={onListo}>Listo</Boton>
      </div>
    </div>
  );
}
