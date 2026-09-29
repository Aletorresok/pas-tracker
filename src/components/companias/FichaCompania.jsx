import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  TIPOS_CONTACTO, useDirectorio, fichaDe, guardarCompania, guardarContactoCia, borrarContactoCia, eliminarCompania,
  cuitValido, formatearCuit, faltantes, domicilioDe, textoDomicilio,
} from "../../utils/companias.js";
import { useMargenes, guardarMargen, margenPara } from "../../utils/margenes.js";
import { esActivo } from "../../utils/metricas.js";
import { linkWhatsApp } from "../../utils/mensajes.js";
import { copiar } from "../../utils/menus.js";
import EstadoPill from "../ui/EstadoPill.jsx";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";
import { abrirCompania, cerrarCompania, suscribirCompania, companiaAbierta } from "../../utils/companiaAbierta.js";


// Se monta una vez en App (necesita los casos para listar los de la compañía y poder abrirlos)
export function CompaniaHost({ allCasos, onAbrirCaso }) {
  const actual = useSyncExternalStore(suscribirCompania, companiaAbierta);
  if (!actual) return null;
  return <FichaCompania key={actual.nombre || "nueva"} nombre={actual.nombre} allCasos={allCasos} onClose={cerrarCompania}
    onAbrirCaso={c => { cerrarCompania(); onAbrirCaso(c); }} onCreada={n => abrirCompania(n)} />;
}

const campo = { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 };
const etiqueta = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4, fontWeight: 500 };
const seccion = { background: "var(--card)", border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: 18, display: "flex", flexDirection: "column", gap: 12 };
const titulo = { margin: 0, fontSize: 15, fontWeight: 700 };
const grilla = cols => ({ display: "grid", gridTemplateColumns: cols, gap: 12 });

// Campo que guarda al salir (solo si cambió)
function Campo({ l, valor, onGuardar, tipo = "text", ph, ayuda, error, formatear, style }) {
  const [v, setV] = useState(valor ?? "");
  useEffect(() => setV(valor ?? ""), [valor]);
  const salir = () => {
    const limpio = formatear ? formatear(v) : String(v).trim();
    if (limpio !== (valor ?? "")) onGuardar(limpio || null);
    if (formatear) setV(limpio);
  };
  return (
    <label style={{ display: "block", minWidth: 0, ...style }}>
      <span style={etiqueta}>{l}</span>
      <input type={tipo} value={v} placeholder={ph} onChange={e => setV(e.target.value)} onBlur={salir}
        onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
        style={{ ...campo, borderColor: error ? "var(--bad)" : undefined }} aria-invalid={error ? true : undefined} />
      {(error || ayuda) && <span style={{ display: "block", fontSize: 11, marginTop: 3, color: error ? "var(--bad)" : "var(--muted)" }}>{error || ayuda}</span>}
    </label>
  );
}

function Domicilio({ ficha, pref, guardar }) {
  return (
    <div style={grilla("minmax(0, 2fr) 90px minmax(0, 1fr) minmax(0, 1fr)")} className="grid-4">
      <Campo l="Calle y número" valor={ficha[`${pref}domicilio`]} onGuardar={v => guardar({ [`${pref}domicilio`]: v })} ph="Calle, número, piso" />
      <Campo l="CP" valor={ficha[`${pref}cp`]} onGuardar={v => guardar({ [`${pref}cp`]: v })} ph="" />
      <Campo l="Localidad" valor={ficha[`${pref}localidad`]} onGuardar={v => guardar({ [`${pref}localidad`]: v })} ph="" />
      <Campo l="Provincia" valor={ficha[`${pref}provincia`]} onGuardar={v => guardar({ [`${pref}provincia`]: v })} ph="" />
    </div>
  );
}

function FilaContacto({ contacto, onGuardar, onBorrar }) {
  const [c, setC] = useState(contacto);
  useEffect(() => setC(contacto), [contacto]);
  const cambio = (k, v) => setC(x => ({ ...x, [k]: v }));
  const salir = () => { if (JSON.stringify(c) !== JSON.stringify(contacto)) onGuardar(c); };
  const wa = c.telefono && linkWhatsApp(c.telefono, "");
  return (
    <div className="contacto-cia" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) salir(); }}>
      <select value={c.tipo || "siniestros"} onChange={e => { const n = { ...c, tipo: e.target.value }; setC(n); onGuardar(n); }} aria-label="Tipo de contacto" style={campo}>
        {TIPOS_CONTACTO.map(t => <option key={t.k} value={t.k}>{t.l}</option>)}
      </select>
      <input value={c.nombre || ""} onChange={e => cambio("nombre", e.target.value)} placeholder="Nombre / estudio" aria-label="Nombre" style={campo} />
      <input type="email" value={c.mail || ""} onChange={e => cambio("mail", e.target.value)} placeholder="mail@compania.com" aria-label="Mail" style={campo} />
      <input type="tel" value={c.telefono || ""} onChange={e => cambio("telefono", e.target.value)} placeholder="11 5555-5555" aria-label="Teléfono" style={campo} />
      <span style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
        {c.mail && <a href={`mailto:${c.mail}`} className="btn-wa" title={`Mail a ${c.mail}`} aria-label="Mandar mail"><Icono nombre="sobre" size={16} /></a>}
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn-wa" title="WhatsApp" aria-label="WhatsApp"><Icono nombre="mensaje" size={16} /></a>}
        <button type="button" className="btn-wa" onClick={onBorrar} title="Borrar contacto" aria-label="Borrar contacto" style={{ cursor: "pointer" }}><Icono nombre="papelera" size={16} /></button>
      </span>
      <input value={c.notas || ""} onChange={e => cambio("notas", e.target.value)} placeholder="Notas (horarios, a quién preguntar, referencia…)" aria-label="Notas" style={{ ...campo, gridColumn: "1 / -1", fontSize: 13 }} />
    </div>
  );
}

function Numero({ l, valor, placeholder, max, unidad, onGuardar }) {
  return (
    <Campo l={l} valor={valor != null ? String(valor) : ""} ph={placeholder} tipo="number"
      ayuda={unidad} onGuardar={v => { const n = Number(String(v || "").replace(",", ".")); onGuardar(n > 0 && n <= max ? n : null); }} />
  );
}

export default function FichaCompania({ nombre, allCasos = [], onClose, onAbrirCaso, onCreada }) {
  const dir = useDirectorio();
  const margenes = useMargenes();
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [estado, setEstado] = useState(""); // "" | guardando | ok | error: …
  const [borrador, setBorrador] = useState(false); // contacto nuevo sin guardar

  const ficha = useMemo(() => (nombre && dir ? fichaDe(dir.fichas, nombre) || { compania: nombre } : null), [dir, nombre]);
  const contactos = useMemo(() => (dir?.contactos || []).filter(c => c.compania === ficha?.compania), [dir, ficha]);
  const casos = useMemo(() => allCasos.filter(c => (c.compania_aseguradora || "").trim().toLowerCase() === (nombre || "").trim().toLowerCase())
    .sort((a, b) => esActivo(b) - esActivo(a)), [allCasos, nombre]);

  useEffect(() => {
    const tecla = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onClose]);

  const resultado = err => { setEstado(err ? `No se guardó: ${err}` : "ok"); if (!err) setTimeout(() => setEstado(e => (e === "ok" ? "" : e)), 1500); };
  const guardar = async datos => { setEstado("guardando"); resultado(await guardarCompania(ficha.compania, datos)); };
  const guardarContacto = async c => { setEstado("guardando"); const r = await guardarContactoCia({ ...c, compania: ficha.compania }); resultado(r.error); if (!r.error && !c.id) setBorrador(false); };
  const borrarContacto = async c => {
    if (!c.id) { setBorrador(false); return; }
    if (!window.confirm(`¿Borrar el contacto${c.nombre ? ` "${c.nombre}"` : ""}?`)) return;
    resultado(await borrarContactoCia(c.id));
  };
  const crear = async e => {
    e.preventDefault();
    const n = nuevoNombre.trim();
    if (!n) return;
    const err = await guardarCompania(n, {});
    if (err) { setEstado(`No se guardó: ${err}`); return; }
    onCreada?.(n);
  };

  const falta = ficha ? faltantes(ficha) : [];
  const cuitOk = ficha ? cuitValido(ficha.cuit) : null;
  const activos = casos.filter(esActivo).length;
  const margenPropio = margenes?.[ficha?.compania];

  return (
    <>
      <div className="fondo-modal" onClick={onClose} />
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label={nombre ? `Compañía ${nombre}` : "Nueva compañía"}
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 451, width: "100%", maxWidth: 920, maxHeight: "92vh", overflow: "auto", padding: 16 }}>
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-3)", minHeight: 240 }}>
          <div className="modal-sticky" style={{ position: "sticky", background: "var(--card)", borderRadius: "var(--r-lg) var(--r-lg) 0 0", borderBottom: "1px solid var(--border)", padding: "16px 20px", zIndex: 5, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: "var(--r-sm)", display: "grid", placeItems: "center", flex: "none", background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-ink)" }}><Icono nombre="edificio" size={20} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre || "Nueva compañía"}</h2>
              {ficha && <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {ficha.razon_social || "Sin razón social"}{ficha.cuit ? ` · CUIT ${ficha.cuit}` : ""} · {casos.length} {casos.length === 1 ? "caso" : "casos"}{activos ? ` (${activos} en curso)` : ""}
              </div>}
            </div>
            <span role="status" style={{ fontSize: 12, fontWeight: 600, color: estado.startsWith("No") ? "var(--bad)" : estado === "ok" ? "var(--ok)" : "var(--muted)" }}>
              {estado === "guardando" ? "Guardando…" : estado === "ok" ? "✓ Guardado" : estado}
            </span>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="btn-wa" style={{ cursor: "pointer" }}><Icono nombre="cerrar" size={16} /></button>
          </div>

          {!nombre && (
            <form onSubmit={crear} style={{ padding: 20, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <label style={{ flex: "1 1 260px" }}>
                <span style={etiqueta}>Nombre corto (el mismo que usás en los casos)</span>
                <input autoFocus value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Ej.: Sancor Seguros" style={campo} />
              </label>
              <Boton variante="primario" icono="agregar" type="submit" disabled={!nuevoNombre.trim()}>Crear compañía</Boton>
              {estado && <span style={{ color: "var(--bad)", fontSize: 13, width: "100%" }}>{estado}</span>}
            </form>
          )}

          {nombre && !ficha && <div style={{ padding: 24, color: "var(--muted)" }}>Cargando…</div>}

          {ficha && (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {dir?.faltaSql && <div role="alert" style={{ ...seccion, display: "block", color: "var(--warn)", fontSize: 13 }}>Falta correr el SQL 30 (<code>sql/2026-09-28_30_companias.sql</code>) en Supabase: hasta entonces no se guardan razón social, CUIT ni contactos.</div>}
              {falta.length > 0 && !dir?.faltaSql && (
                <div style={{ fontSize: 13, padding: "10px 14px", borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--warn) 10%, transparent)", color: "var(--warn)" }}>
                  Para usarla en escritos y cartas falta: <b>{falta.join(", ")}</b>.
                </div>
              )}

              <section style={seccion}>
                <h3 style={titulo}>Datos fiscales</h3>
                <div style={grilla("minmax(0, 2fr) minmax(0, 1fr)")} className="grid-2">
                  <Campo l="Razón social" valor={ficha.razon_social} onGuardar={v => guardar({ razon_social: v })} ph="Como figura en AFIP" />
                  <Campo l="CUIT" valor={ficha.cuit} onGuardar={v => guardar({ cuit: v })} ph="11 dígitos" formatear={formatearCuit}
                    error={cuitOk === false ? "El CUIT no es válido (revisá los números)" : ""} ayuda={cuitOk ? "CUIT válido" : ""} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ficha.razon_social && <Boton tamaño="sm" variante="fantasma" icono="copiar" onClick={() => copiar(ficha.razon_social)}>Copiar razón social</Boton>}
                  {ficha.cuit && <Boton tamaño="sm" variante="fantasma" icono="copiar" onClick={() => copiar(ficha.cuit)}>Copiar CUIT</Boton>}
                  {ficha.domicilio && <Boton tamaño="sm" variante="fantasma" icono="copiar" onClick={() => copiar(textoDomicilio(domicilioDe(ficha)))}>Copiar domicilio</Boton>}
                </div>
              </section>

              <section style={seccion}>
                <h3 style={titulo}>Domicilio <span style={{ fontWeight: 400, fontSize: 12, color: "var(--muted)" }}>· legal y para notificar: lo usan los escritos y las cartas documento</span></h3>
                <Domicilio ficha={ficha} pref="" guardar={guardar} />
              </section>

              <section style={seccion}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <h3 style={titulo}>Contactos</h3>
                  <Boton tamaño="sm" icono="agregar" onClick={() => setBorrador(true)} disabled={borrador || dir?.faltaSql}>Agregar contacto</Boton>
                </div>
                <div style={grilla("minmax(0, 1fr) minmax(0, 1fr)")} className="grid-2">
                  <Campo l="Mail general" tipo="email" valor={ficha.mail} onGuardar={v => guardar({ mail: v })} ph="" />
                  <Campo l="Teléfono general" tipo="tel" valor={ficha.telefono} onGuardar={v => guardar({ telefono: v })} ph="" />
                </div>
                {contactos.map(c => <FilaContacto key={c.id} contacto={c} onGuardar={guardarContacto} onBorrar={() => borrarContacto(c)} />)}
                {borrador && <FilaContacto contacto={{ tipo: "estudio" }} onGuardar={guardarContacto} onBorrar={() => setBorrador(false)} />}
                {!contactos.length && !borrador && <div style={{ fontSize: 13, color: "var(--muted)" }}>Sumá estudios gestores, analistas o el mail de siniestros de terceros: aparecen en la ficha de cada caso de esta compañía.</div>}
              </section>

              <section style={seccion}>
                <h3 style={titulo}>Condiciones</h3>
                <div style={grilla("repeat(3, minmax(0, 1fr))")} className="grid-3">
                  <Numero l="Honorarios" valor={ficha.honorarios_pct} placeholder="20" max={100} unidad="% sobre la indemnización" onGuardar={n => guardar({ honorarios_pct: n })} />
                  <Numero l="Plazo de pago" valor={ficha.plazo_pago_dias} placeholder="30" max={365} unidad="días desde la firma" onGuardar={n => guardar({ plazo_pago_dias: n ? Math.round(n) : null })} />
                  <Numero l="Margen para reiterar" valor={margenPropio} placeholder={String(margenPara(margenes, ficha.compania))} max={365}
                    unidad={margenPropio ? "días sin respuesta" : "días (usa el general)"} onGuardar={async n => { setEstado("guardando"); resultado((await guardarMargen(ficha.compania, n ? Math.round(n) : null)) ? null : "error"); }} />
                </div>
              </section>

              <section style={seccion}>
                <h3 style={titulo}>Casos <span style={{ fontWeight: 400, fontSize: 12, color: "var(--muted)" }}>· {casos.length}</span></h3>
                {!casos.length && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, color: "var(--muted)" }}>
                    Todavía no hay casos con esta compañía.
                    {dir?.fichas[ficha.compania] && <Boton tamaño="sm" variante="peligro" icono="papelera" onClick={async () => {
                      if (!window.confirm(`¿Eliminar ${ficha.compania} y sus contactos del directorio?`)) return;
                      const err = await eliminarCompania(ficha.compania);
                      if (err) setEstado(`No se eliminó: ${err}`); else onClose();
                    }}>Eliminar compañía</Boton>}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {casos.slice(0, 50).map(c => (
                    <button key={c.id} type="button" className="fila-simple" onClick={() => onAbrirCaso?.(c)}>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{c.asegurado || "Sin nombre"}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>{c.patente || ""}</span>
                      <EstadoPill estado={c.estado} size="sm" />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
