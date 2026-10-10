import { useState, useEffect, useRef, useCallback } from "react";
import { DOCS_CLIENTE, subirDocumentoCliente, extrasCliente, etiquetaDoc } from "../../utils/subidasCliente.js";
import { notificarSubidaCliente } from "../../utils/portalStorageUtils.js";
import { supabase } from "../../supabase.js";
import { fmtDate, fmtMoney } from "./portalTheme.js";
import { primerNombre, diaDeAccion, fechaLocalISO } from "../../utils/formatters.js";
import { estadoInfo } from "../../constants.js";
import { PASOS_SIMPLES } from "../ui/BarraAvance.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { alpha } from "../../utils/theme.js";
import Icono from "../ui/Icono.jsx";
import Boton from "../ui/Boton.jsx";
import { useInstalarApp } from "../../hooks/useInstalarApp.js";
import Logo from "../ui/Logo.jsx";
import { textoEtapaCliente, fechaPagoEstimada, queHacerCliente, referenciaPlazo } from "../../utils/vistaCliente.js";
import { cargarPlazosPublicos } from "../../utils/consultas.js";
import Ilustracion from "../ui/Ilustracion.jsx";
import { novedadesDelCaso } from "../../utils/novedadesCliente.js";

export const WHATSAPP = "5491133133259";
export const ABOGADO = "Dr. Alexis Torres Gaveglio";
// Horario de atención que se muestra junto al botón de WhatsApp (vacío = no se muestra)
export const HORARIO_ATENCION = "de lunes a viernes de 9 a 18";


const limpiarPatente = v => v.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

// Paso actual (1 a 5) según la etapa del estado
const pasoDe = estado => {
  const etapa = estadoInfo(estado).etapa;
  return etapa <= 0 ? 0 : etapa <= 2 ? 1 : etapa === 3 ? 2 : etapa <= 5 ? 3 : etapa === 6 ? 4 : 5;
};

// Qué significa cada paso, en palabras simples
const PASOS_TEXTO = [
  "Juntamos las fotos, la denuncia y los papeles del siniestro.",
  "Presentamos el reclamo ante la compañía.",
  "La compañía responde y negociamos el monto.",
  "Con el acuerdo firmado, la compañía paga.",
  "Recibís tu dinero.",
];

// Qué está pasando ahora con tu caso (mismo texto que ve el estudio en la ficha)
const ahora = textoEtapaCliente;

// Fecha que acompaña a cada paso, si la hay
const fechaPaso = (caso, i) => [caso.fecha_derivacion, caso.fecha_inicio_reclamo, caso.fecha_ofrecimiento, fechaPagoEstimada(caso), caso.fecha_cobro][i];

const linkWhatsApp = patente => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola ${ABOGADO}, te escribo por mi reclamo${patente ? ` (patente ${patente})` : ""}.`)}`;

function BotonWhatsApp({ patente, texto = "Escribinos por WhatsApp" }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <a className="btn-wa-grande" href={linkWhatsApp(patente)} target="_blank" rel="noopener noreferrer">
        <Icono nombre="mensaje" size={18} /> {texto}
      </a>
      {HORARIO_ATENCION && <span style={{ fontSize: 12, color: "var(--muted)" }}>Respondemos {HORARIO_ATENCION}</span>}
    </span>
  );
}

// Lo que pasa ahora se cuenta en "Qué sigue": acá cada paso lleva su descripción corta
function LineaDeTiempo({ caso }) {
  const paso = pasoDe(caso.estado);
  const color = paso === 5 ? "var(--ok)" : "var(--accent)";
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label="Avance del reclamo">
      {PASOS_SIMPLES.map((nombre, i) => {
        const hecho = i < paso - 1 || paso === 5;
        const actual = i === paso - 1 && paso !== 5;
        const fecha = fechaPaso(caso, i);
        const ultimo = i === PASOS_SIMPLES.length - 1;
        return (
          <li key={nombre} aria-current={actual ? "step" : undefined} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{
                width: 24, height: 24, boxSizing: "border-box", borderRadius: "50%", flex: "none", display: "grid", placeItems: "center",
                background: hecho ? color : "var(--card)",
                border: `2px solid ${hecho || actual ? color : "var(--border2)"}`,
                color: "var(--on-accent)",
              }}>
                {hecho ? <Icono nombre="check" size={13} /> : actual ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} /> : null}
              </span>
              {!ultimo && <span style={{ width: 2, flex: 1, minHeight: 14, background: hecho ? color : "var(--border)" }} />}
            </div>
            <div style={{ paddingBottom: ultimo ? 0 : 16, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={{ fontSize: 15, fontWeight: actual ? 700 : 600, color: hecho || actual ? "var(--text)" : "var(--muted)" }}>{nombre}</span>
                {fecha && (hecho || actual) && <span className="num" style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>{fmtDate(fecha)}{i === 3 && !hecho ? " (estimada)" : ""}</span>}
              </div>
              {actual
                ? <div style={{ marginTop: 6, background: alpha("var(--accent)", 10), borderRadius: "var(--r-sm)", padding: "10px 12px", fontSize: 14, lineHeight: 1.5, color: "var(--text)" }}>{PASOS_TEXTO[i]}</div>
                : <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>{PASOS_TEXTO[i]}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// "Mandanos tu documentación": el cliente sube fotos o PDF de lo que falta, desde el celular
// Junta lo que el cliente sube en esta sesión y manda UN solo mail al estudio: al tocar "Listo",
// al salir o cerrar la página, al irse a otra app (no cuenta abrir la cámara o elegir un archivo),
// o a los 10 minutos sin subir nada más.
const ESPERA_AVISO = 10 * 60 * 1000;
function useAvisoDeSesion() {
  const pendientes = useRef([]);
  const eligiendo = useRef(false);
  const timer = useRef(null);
  const [cantidad, setCantidad] = useState(0);
  const [avisados, setAvisados] = useState(0);

  const enviar = useCallback(() => {
    clearTimeout(timer.current);
    if (!pendientes.current.length) return;
    notificarSubidaCliente(pendientes.current);
    setAvisados(n => n + pendientes.current.length);
    pendientes.current = [];
    setCantidad(0);
  }, []);

  const agregar = useCallback((items) => {
    pendientes.current.push(...items);
    setCantidad(pendientes.current.length);
    clearTimeout(timer.current);
    timer.current = setTimeout(enviar, ESPERA_AVISO);
  }, [enviar]);

  useEffect(() => {
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "hidden") { if (!eligiendo.current) enviar(); }
      else eligiendo.current = false; // volvió de la cámara / el selector de archivos
    };
    const alVolverFoco = () => { eligiendo.current = false; }; // cerró el selector de archivos sin elegir
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("pagehide", enviar);
    window.addEventListener("focus", alVolverFoco);
    return () => { document.removeEventListener("visibilitychange", alCambiarVisibilidad); window.removeEventListener("pagehide", enviar); window.removeEventListener("focus", alVolverFoco); clearTimeout(timer.current); };
  }, [enviar]);

  return { agregar, enviar, cantidad, avisados, eligiendo: (v = true) => { eligiendo.current = v; } };
}

function SubirDocumentacion({ caso, patente, dni, aviso: avisoSesion, extras, onRecargar, abrirSenal = 0 }) {
  // La lista de lo que falta solo se muestra mientras se junta la documentación
  const enDocumentacion = ["doc_pendiente", "iniciado"].includes(caso.estado);
  const [abierto, setAbierto] = useState(false);
  const [subiendo, setSubiendo] = useState(null); // tipo en curso
  const [aviso, setAviso] = useState(null); // { tipo, ok, texto }
  const inputRef = useRef(null);
  const tipoRef = useRef(null);
  // "Mandar documentación" en Qué sigue la abre y la trae a la vista
  useEffect(() => { if (abrirSenal) setAbierto(true); }, [abrirSenal]);

  if (!extras) return null; // la función todavía no existe o falló: no mostramos nada
  const { enviados, tenemos } = extras;
  const cargar = onRecargar;

  const porTipo = {};
  enviados.forEach(e => { (porTipo[e.tipo] ||= []).push(e); });
  const estaListo = d => (porTipo[d.tipo] || []).length > 0 || Boolean(tenemos?.[d.tipo]);
  const faltan = DOCS_CLIENTE.filter(d => d.requerido && !estaListo(d));
  const listos = DOCS_CLIENTE.filter(estaListo).length;

  const elegir = (tipo) => { tipoRef.current = tipo; setAviso(null); avisoSesion?.eligiendo(); inputRef.current?.click(); };
  const alElegir = async (e) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    avisoSesion?.eligiendo(false); // ya eligió: si ahora se va a otra app, sale el mail
    const tipo = tipoRef.current;
    if (!archivos.length || !tipo) return;
    setSubiendo(tipo);
    let ok = 0, error = "";
    const subidos = [];
    for (const file of archivos) {
      const r = await subirDocumentoCliente({ patente, dni, casoId: caso.id, tipo, file });
      if (r.ok) { ok++; subidos.push({ tipo: etiquetaDoc(tipo), nombre: file.name }); } else { error = r.error; break; }
    }
    if (subidos.length) avisoSesion?.agregar(subidos.map(s => ({ ...s, caso }))); // el mail sale uno solo por sesión
    setSubiendo(null);
    setAviso(error ? { tipo, ok: false, texto: error } : { tipo, ok: true, texto: ok === 1 ? "¡Recibido! Gracias." : `¡Recibimos ${ok} archivos! Gracias.` });
    cargar();
  };

  return (
    <section id={`doc-${caso.id}`} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 18, scrollMarginTop: 12 }}>
      <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}
        style={{ width: "100%", display: "flex", gap: 12, alignItems: "center", background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit" }}>
        <Ilustracion nombre="foto" size={48} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Mandanos tu documentación</span>
          {enDocumentacion ? (
            <span style={{ display: "block", fontSize: 13, lineHeight: 1.45, color: faltan.length ? "var(--sub)" : "var(--ok)" }}>
              {faltan.length ? `Compartí toda la documentación necesaria. Nos falta: ${faltan.map(d => d.l.replace(/ \(.*\)/, "")).join(", ")}` : "✓ Ya tenemos lo necesario. Podés sumar más si querés."}
              <span style={{ color: "var(--muted)" }}> · {listos} de {DOCS_CLIENTE.length}</span>
            </span>
          ) : (
            <span style={{ display: "block", fontSize: 13, lineHeight: 1.45, color: "var(--sub)" }}>¿Tenés documentación nueva del siniestro? Compartila acá.</span>
          )}
        </span>
        <span style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: "var(--accent-ink)" }}>
          {abierto ? "Cerrar" : "Ver"}
          <span style={{ display: "inline-flex", transform: abierto ? "rotate(180deg)" : "none", transition: "transform .15s" }}><Icono nombre="chevron" size={16} /></span>
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={alElegir} />
      {abierto && <p style={{ margin: "12px 0 4px", fontSize: 13, color: "var(--sub)", lineHeight: 1.45 }}>Podés sacar la foto con el celular o elegir un PDF. Si preferís, mandalo por WhatsApp.</p>}
      {abierto && DOCS_CLIENTE.map((d, i) => {
        const env = porTipo[d.tipo] || [];
        const loTenemos = Boolean(tenemos?.[d.tipo]);
        const listo = env.length > 0 || loTenemos;
        const esteAviso = aviso && aviso.tipo === d.tipo ? aviso : null;
        return (
          <div key={d.tipo} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: "var(--r-xs)", flex: "none", display: "grid", placeItems: "center", background: listo ? "var(--ok)" : "transparent", border: `1.5px solid ${listo ? "var(--ok)" : "var(--border2)"}`, color: "#fff" }}>
                {listo && <Icono nombre="check" size={12} />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{d.l}{enDocumentacion && d.requerido && !listo && <span style={{ color: "var(--muted)", fontWeight: 400 }}> · necesario</span>}</span>
                {loTenemos
                  ? <span style={{ display: "block", fontSize: 12, color: "var(--ok)" }}>Ya lo tenemos</span>
                  : env.length > 0 && <span style={{ display: "block", fontSize: 12, color: "var(--ok)" }}>Enviado{env.length > 1 ? ` (${env.length})` : ""} · {new Date(env[0].creado).toLocaleDateString("es-AR")}</span>}
              </span>
              <button type="button" onClick={() => elegir(d.tipo)} disabled={!!subiendo}
                style={{ font: "inherit", fontSize: 13, fontWeight: 600, padding: "7px 12px", borderRadius: "var(--r-sm)", cursor: subiendo ? "default" : "pointer", border: `1px solid ${listo ? "var(--border2)" : "var(--accent)"}`, background: listo ? "var(--card)" : "var(--accent)", color: listo ? "var(--text)" : "var(--on-accent)", opacity: subiendo && subiendo !== d.tipo ? 0.5 : 1, whiteSpace: "nowrap" }}>
                {subiendo === d.tipo ? "Subiendo…" : listo ? "Agregar" : "Subir"}
              </button>
            </div>
            {esteAviso && <div role="status" style={{ marginTop: 6, fontSize: 13, color: esteAviso.ok ? "var(--ok)" : "var(--bad)" }}>{esteAviso.texto}</div>}
          </div>
        );
      })}
    </section>
  );
}

// Documentación obligatoria que el cliente todavía no mandó (y que el estudio no marcó como recibida)
const docsFaltantes = extras => {
  if (!extras) return [];
  const enviados = new Set((extras.enviados || []).map(e => e.tipo));
  return DOCS_CLIENTE.filter(d => d.requerido && !enviados.has(d.tipo) && !extras.tenemos?.[d.tipo]).map(d => d.l.replace(/ \(.*\)/, "").replace(/^./, c => c.toLowerCase()));
};

// Plazos de referencia por compañía (los mismos de la página pública): se piden una sola vez
let plazosCache = null;
const plazosPublicos = () => (plazosCache ||= cargarPlazosPublicos());

// Arriba de todo: qué pasa ahora, qué tiene que hacer el cliente y, mientras espera, una referencia de plazos
function QueSigue({ caso, extras, onDocumentacion }) {
  const [plazos, setPlazos] = useState([]);
  useEffect(() => { if (caso.estado === "reclamado") plazosPublicos().then(setPlazos); }, [caso.estado]);
  const faltan = ["doc_pendiente", "iniciado"].includes(caso.estado) ? docsFaltantes(extras) : [];
  const hacer = queHacerCliente(caso, { faltan, hayEvento: !!extras?.proximoEvento });
  const referencia = referenciaPlazo(caso, plazos, fechaLocalISO());
  const oferta = caso.estado === "con_ofrecimiento" && Number(caso.monto_ofrecimiento) > 0 ? Number(caso.monto_ofrecimiento) : 0;
  return (
    <section aria-labelledby={`sigue-${caso.id}`} style={{ background: "var(--card)", border: "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div id={`sigue-${caso.id}`} style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--accent-ink)", marginBottom: 4 }}>Qué sigue</div>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, fontWeight: 600 }}>{ahora(caso)}</p>
      </div>
      {oferta > 0 && (
        <div style={{ background: "var(--card2)", borderRadius: "var(--r-sm)", padding: "10px 14px" }}>
          <div style={{ fontSize: 13, color: "var(--sub)" }}>Oferta de {caso.compania_aseguradora || "la compañía"}</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>{fmtMoney(oferta)}</div>
        </div>
      )}
      {hacer && (
        <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: 10, alignItems: "start" }}>
          <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: faltan.length ? "color-mix(in srgb, var(--warn) 16%, var(--card))" : "color-mix(in srgb, var(--ok) 14%, var(--card))", color: faltan.length ? "var(--warn)" : "var(--ok)" }}>
            <Icono nombre={faltan.length ? "adjuntar" : "check"} size={15} />
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Qué tenés que hacer vos</div>
            <div style={{ fontSize: 15, lineHeight: 1.5 }}>{hacer}</div>
            {faltan.length > 0 && <div style={{ marginTop: 8 }}><Boton variante="primario" tamaño="sm" icono="adjuntar" onClick={onDocumentacion}>Mandar documentación</Boton></div>}
          </div>
        </div>
      )}
      {referencia && <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--sub)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>{referencia}</div>}
    </section>
  );
}

// Historia del reclamo contada por el estudio: lo que marcó "Lo ve el cliente" en la bitácora
export function Novedades({ lista, caja, titulo = "Novedades de tu reclamo" }) {
  const [todas, setTodas] = useState(false);
  const visibles = todas ? lista : lista.slice(0, 5);
  return (
    <section style={caja}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{titulo}</div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
        {visibles.map((n, i) => (
          <li key={i} style={{ display: "grid", gridTemplateColumns: "10px minmax(0, 1fr)", gap: 10 }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, background: i === 0 ? "var(--accent)" : "var(--border2)" }} />
            <span style={{ minWidth: 0 }}>
              <span className="num" style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{new Date(`${diaDeAccion(n.fecha)}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}</span>
              <span style={{ display: "block", fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{n.texto}</span>
            </span>
          </li>
        ))}
      </ol>
      {lista.length > 5 && (
        <button type="button" onClick={() => setTodas(t => !t)} style={{ marginTop: 10, background: "none", border: "none", padding: 0, font: "inherit", fontSize: 13, fontWeight: 600, color: "var(--accent-ink)", cursor: "pointer" }}>
          {todas ? "Ver menos" : `Ver las ${lista.length}`}
        </button>
      )}
    </section>
  );
}

function TarjetaCaso({ caso, patente, dni, aviso }) {
  const cerrado = ["cobrado", "desistido"].includes(caso.estado);
  const [extras, setExtras] = useState(null);
  const cargarExtras = useCallback(() => extrasCliente({ patente, dni, casoId: caso.id }).then(setExtras), [patente, dni, caso.id]);
  useEffect(() => { if (!cerrado) cargarExtras(); }, [cerrado, cargarExtras]);
  // Novedades que el estudio marcó para el cliente (SQL 35; sin él, no se muestra nada)
  const [novedades, setNovedades] = useState(null);
  useEffect(() => { novedadesDelCaso({ patente, dni, casoId: caso.id }).then(setNovedades); }, [patente, dni, caso.id]);
  const evento = extras?.proximoEvento;
  const [abrirDoc, setAbrirDoc] = useState(0);
  const irADocumentacion = () => { setAbrirDoc(n => n + 1); setTimeout(() => document.getElementById(`doc-${caso.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };
  const cobras = Number(caso.monto_cobro_asegurado) || 0;
  const caja = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 18 };
  // El texto de la etapa va en "Qué sigue"; el mensaje aparece solo si el estudio lo escribió
  const mensaje = caso.mensaje_cliente || "";

  return (
    <article className="caso-cliente">
      <div>
      {caso.estado !== "desistido" && <QueSigue caso={caso} extras={extras} onDocumentacion={irADocumentacion} />}
      {mensaje && (
        <section style={{ ...caja, borderLeft: "3px solid var(--accent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Mensaje del estudio</span>
            {caso.mensaje_cliente && caso.mensaje_cliente_fecha && <span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(caso.mensaje_cliente_fecha).toLocaleDateString("es-AR")}</span>}
          </div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{mensaje}</p>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{ABOGADO}</div>
        </section>
      )}
      <section style={caja}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "var(--sub)" }}>Reclamo ante</div>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{caso.compania_aseguradora || "la compañía"}</div>
          </div>
          {caso.patente && <span style={{ flex: "none", fontFamily: "var(--mono)", fontWeight: 600, fontSize: 13, border: "1.5px solid var(--text)", borderRadius: "var(--r-xs)", padding: "1px 7px", letterSpacing: 0.5 }}>{caso.patente}</span>}
        </div>

        {caso.estado === "desistido"
          ? <div style={{ background: "var(--card2)", borderRadius: "var(--r-sm)", padding: "12px 14px", fontSize: 14, lineHeight: 1.5 }}>{ahora(caso)}</div>
          : <LineaDeTiempo caso={caso} />}

        {evento && (
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "flex-start", background: "color-mix(in srgb, var(--info) 10%, var(--card))", border: "1px solid color-mix(in srgb, var(--info) 30%, transparent)", borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
            <Icono nombre="calendario" size={18} />
            <span style={{ fontSize: 14, lineHeight: 1.45 }}>
              <b>{evento.tipo === "audiencia" ? "Audiencia" : "Mediación"}:</b> {new Date(evento.inicio).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}, {new Date(evento.inicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} hs.
              {evento.lugar && <span style={{ display: "block", fontSize: 13, color: "var(--sub)", marginTop: 2 }}>Lugar: {evento.lugar}</span>}
              {evento.link && (
                <a href={evento.link} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "7px 12px", borderRadius: "var(--r-sm)", background: "var(--info)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  Entrar a la {evento.tipo === "audiencia" ? "audiencia" : "mediación"}
                </a>
              )}
              <span style={{ display: "block", fontSize: 12, color: "var(--sub)", marginTop: 6 }}>Te confirmamos por WhatsApp si tenés que participar y qué necesitás.</span>
            </span>
          </div>
        )}

      </section>
      </div>
      <div>


      {novedades?.length > 0 && <Novedades lista={novedades} caja={caja} />}

      {!cerrado && <SubirDocumentacion caso={caso} patente={patente} dni={dni} aviso={aviso} extras={extras} onRecargar={cargarExtras} abrirSenal={abrirDoc} />}

      {cobras > 0 && (
        <section style={{ ...caja, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {cobras > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {caso.estado === "cobrado" && <Ilustracion nombre="cobro" size={64} />}
              <div>
              <div style={{ fontSize: 13, color: "var(--sub)" }}>{caso.estado === "cobrado" ? "Cobraste" : "Vas a cobrar"}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--ok)" }}>{fmtMoney(cobras)}</div>
              {caso.estado === "cobrado" && caso.fecha_cobro && <div className="num" style={{ fontSize: 12, color: "var(--muted)" }}>el {fmtDate(caso.fecha_cobro)}</div>}
              </div>
            </div>
          )}
        </section>
      )}
      </div>
    </article>
  );
}

// Vista pública del cliente: entra con patente + últimos 3 números del DNI.
// La consulta pasa por la función consultar_caso_cliente (sql/2026-09-23_04), que solo devuelve datos si ambos coinciden.
const PATENTE_GUARDADA = "pas_cliente_patente";

export default function PortalCliente() {
  const aviso = useAvisoDeSesion();
  const { darkMode, toggleDarkMode } = useTheme();
  // La patente queda recordada en este celular (el DNI no), así la app instalada la trae lista
  const [patente, setPatente] = useState(() => {
    let guardada = "";
    try { guardada = localStorage.getItem(PATENTE_GUARDADA) || ""; } catch { /* sin almacenamiento */ }
    return limpiarPatente(new URLSearchParams(window.location.search).get("patente") || guardada);
  });
  const app = useInstalarApp();
  const [dni, setDni] = useState("");
  const [casos, setCasos] = useState(null);
  const [casoSel, setCasoSel] = useState(0); // pestaña elegida cuando hay más de un reclamo
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const puedeBuscar = patente.length >= 5 && dni.length === 3 && !cargando;

  const buscar = async (e) => {
    e.preventDefault();
    if (!puedeBuscar) return;
    setCargando(true);
    setError("");
    try {
      const { data, error: err } = await supabase.rpc("consultar_caso_cliente", { p_patente: patente, p_dni: dni });
      if (err) throw err;
      const lista = Array.isArray(data) ? data : [];
      if (lista.length === 0) setError("No encontramos un reclamo con esa patente y DNI. Revisá los datos o escribinos por WhatsApp.");
      else {
        setCasos(lista);
        setCasoSel(0);
        try { localStorage.setItem(PATENTE_GUARDADA, patente); } catch { /* sin almacenamiento */ }
      }
    } catch (err) {
      console.error("[PortalCliente]", err);
      setError(String(err?.message || "").includes("demasiados_intentos")
        ? "Hiciste varios intentos seguidos. Esperá 15 minutos y probá de nuevo, o escribinos por WhatsApp."
        : "No pudimos consultar tu caso en este momento. Probá de nuevo en un rato.");
    } finally {
      setCargando(false);
    }
  };

  const salir = () => { aviso.enviar(); setCasos(null); setDni(""); setError(""); };
  const nombre = primerNombre(casos?.[0]?.asegurado || ""); // "APELLIDO NOMBRE" → Nombre
  const campo = { background: "var(--card)", border: "1px solid var(--border2)", borderRadius: "var(--r-sm)", color: "var(--text)", padding: "13px 14px", fontSize: 18, width: "100%", boxSizing: "border-box", fontFamily: "var(--mono)", fontWeight: 600, letterSpacing: 1.5, textAlign: "center", outline: "none" };
  const etiqueta = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column" }}>
      <header style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "12px 16px", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Logo alto={26} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap" }}>ATG Lex Solutions</div>
            <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>Seguimiento de tu reclamo</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {casos && <Boton variante="fantasma" tamaño="sm" icono="salir" onClick={salir}>Salir</Boton>}
          <Boton variante="fantasma" tamaño="sm" icono={darkMode ? "sol" : "luna"} onClick={toggleDarkMode} aria-label={darkMode ? "Modo claro" : "Modo oscuro"} />
        </div>
      </header>

      <main style={{ flex: 1, width: "100%", maxWidth: casos ? 1000 : 560, margin: "0 auto", padding: "24px 16px 32px", boxSizing: "border-box" }}>
        {!casos ? (
          <>
            <Ilustracion nombre="camino" size={96} style={{ margin: "0 0 4px -4px" }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px", letterSpacing: -0.3 }}>¿Cómo va tu reclamo?</h1>
            <p style={{ fontSize: 15, color: "var(--sub)", margin: "0 0 20px", lineHeight: 1.5 }}>Ingresá la patente de tu vehículo y los últimos 3 números de tu DNI.</p>

            <form onSubmit={buscar} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <label>
                <span style={etiqueta}>Patente</span>
                <input value={patente} onChange={e => setPatente(limpiarPatente(e.target.value).slice(0, 8))} placeholder="AB123CD" autoComplete="off" autoCapitalize="characters" style={campo} />
              </label>
              <label>
                <span style={etiqueta}>Últimos 3 números del DNI</span>
                <input value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="•••" inputMode="numeric" autoComplete="off" style={{ ...campo, maxWidth: 140, letterSpacing: 6 }} />
              </label>

              {error && <div role="alert" style={{ background: alpha("var(--bad)", 9), border: `1px solid ${alpha("var(--bad)", 25)}`, borderRadius: "var(--r-sm)", padding: "10px 12px", color: "var(--bad)", fontSize: 14, lineHeight: 1.45 }}>{error}</div>}

              <Boton variante="primario" type="submit" disabled={!puedeBuscar} style={{ width: "100%", padding: 13, fontSize: 15 }}>
                {cargando ? "Buscando…" : "Ver mi reclamo"}
              </Boton>
            </form>

            <div style={{ marginTop: 24, textAlign: "center", fontSize: 14, color: "var(--sub)" }}>
              <p style={{ margin: "0 0 10px" }}>¿Tenés dudas o no podés entrar?</p>
              <BotonWhatsApp patente={patente} />
            </div>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 4px", letterSpacing: -0.3 }}>Hola{nombre ? `, ${nombre}` : ""}</h1>
            <p style={{ fontSize: 15, color: "var(--sub)", margin: "0 0 18px" }}>
              {casos.length > 1 ? `Tenés ${casos.length} reclamos con esta patente.` : "Así va tu reclamo."}
            </p>
            {casos.length > 1 && (
              <div role="tablist" aria-label="Tus reclamos" className="pestanas-casos" style={{ marginBottom: 14 }}>
                {casos.map((c, i) => {
                  const activa = i === casoSel;
                  return (
                    <button key={c.id} type="button" role="tab" aria-selected={activa} onClick={() => setCasoSel(i)}
                      style={{ flex: "none", font: "inherit", textAlign: "left", cursor: "pointer", padding: "10px 16px", borderRadius: "var(--r-md)", border: `1.5px solid ${activa ? "var(--accent)" : "var(--border)"}`, background: activa ? "color-mix(in srgb, var(--accent) 10%, var(--card))" : "var(--card)", color: "var(--text)" }}>
                      <span style={{ display: "block", fontSize: 12, color: "var(--sub)" }}>Reclamo ante</span>
                      <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{c.compania_aseguradora || `Reclamo ${i + 1}`}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {casos[casoSel] && <TarjetaCaso key={casos[casoSel].id} caso={casos[casoSel]} patente={patente} dni={dni} aviso={aviso} />}
            {(aviso.cantidad > 0 || aviso.avisados > 0) && (
              <div role="status" style={{ marginTop: 16, background: "var(--card)", border: "1px solid color-mix(in srgb, var(--ok) 40%, var(--border))", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {aviso.cantidad > 0 ? (
                  <>
                    <span style={{ fontSize: 14, lineHeight: 1.45 }}>Recibimos {aviso.cantidad === 1 ? "1 archivo" : `${aviso.cantidad} archivos`}. Cuando termines de mandar todo, avisale al estudio.</span>
                    <Boton variante="primario" onClick={aviso.enviar} style={{ width: "100%", padding: 12, fontSize: 15 }}>Listo, ya mandé todo</Boton>
                  </>
                ) : (
                  <span style={{ fontSize: 14, color: "var(--ok)", fontWeight: 600 }}>✓ Le avisamos al estudio. ¡Gracias!</span>
                )}
              </div>
            )}
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <BotonWhatsApp patente={casos[0]?.patente} texto="Consultar por WhatsApp" />
            </div>
            {app.puede && (
              <div style={{ marginTop: 16, textAlign: "center", fontSize: 14, color: "var(--sub)" }}>
                <p style={{ margin: "0 0 8px" }}>¿Querés tenerlo a mano? Instalalo en tu celular y entrás con un toque.</p>
                <Boton variante="secundario" icono="instalar" onClick={app.instalar}>Instalar app</Boton>
              </div>
            )}
          </>
        )}
      </main>

      <footer style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 0px))" }}>
        ATG Lex Solutions · {ABOGADO}
      </footer>
    </div>
  );
}
