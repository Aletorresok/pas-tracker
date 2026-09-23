import { useState, useEffect, useRef, useCallback } from "react";
import { DOCS_CLIENTE, subirDocumentoCliente, extrasCliente, etiquetaDoc } from "../../utils/subidasCliente.js";
import { notificarSubidaCliente } from "../../utils/portalStorageUtils.js";
import { supabase } from "../../supabase.js";
import { fmtDate, fmtMoney } from "./portalTheme.js";
import { primerNombre } from "../../utils/formatters.js";
import { estadoInfo } from "../../constants.js";
import { PASOS_SIMPLES } from "../ui/BarraAvance.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { alpha } from "../../utils/theme.js";
import Icono from "../ui/Icono.jsx";
import Boton from "../ui/Boton.jsx";
import { useInstalarApp } from "../../hooks/useInstalarApp.js";

const WHATSAPP = "5491133133259";
const ABOGADO = "Dr. Alexis Torres Gaveglio";

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

// Qué está pasando ahora con tu caso
const ahora = caso => {
  const cia = caso.compania_aseguradora || "la compañía";
  switch (caso.estado) {
    case "doc_pendiente": return "Estamos reuniendo la documentación de tu siniestro. Si te pedimos algo, mandalo cuanto antes así avanzamos.";
    case "iniciado": return "Ya tenemos tu caso y estamos preparando el reclamo.";
    case "reclamado": return `Presentamos el reclamo ante ${cia}. Ahora esperamos su respuesta.`;
    case "con_ofrecimiento": return `${cia} hizo un ofrecimiento. Lo estamos analizando para conseguir el mejor monto posible.`;
    case "en_mediacion": return `El caso está en mediación: una reunión formal para llegar a un acuerdo con ${cia}.`;
    case "en_juicio": return "Iniciamos una demanda judicial para defender tu reclamo. Estos procesos llevan más tiempo; te vamos a ir contando.";
    case "esperando_pago": return `Hay acuerdo. Ahora ${cia} tiene que pagar${caso.fecha_pago ? ` (fecha estimada: ${fmtDate(caso.fecha_pago)})` : ""}.`;
    case "cobrado": return "¡Listo! Tu reclamo está cobrado.";
    case "desistido": return "Este reclamo quedó cerrado. Si tenés dudas, escribinos.";
    default: return "";
  }
};

// Fecha que acompaña a cada paso, si la hay
const fechaPaso = (caso, i) => [caso.fecha_derivacion, caso.fecha_inicio_reclamo, caso.fecha_ofrecimiento, caso.fecha_pago, null][i];

const linkWhatsApp = patente => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola ${ABOGADO}, te escribo por mi reclamo${patente ? ` (patente ${patente})` : ""}.`)}`;

function BotonWhatsApp({ patente, texto = "Escribinos por WhatsApp" }) {
  return (
    <a className="btn-wa-grande" href={linkWhatsApp(patente)} target="_blank" rel="noopener noreferrer">
      <Icono nombre="mensaje" size={18} /> {texto}
    </a>
  );
}

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
                ? <div style={{ marginTop: 6, background: alpha("var(--accent)", 10), borderRadius: 8, padding: "10px 12px", fontSize: 14, lineHeight: 1.5, color: "var(--text)" }}>{ahora(caso)}</div>
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

function SubirDocumentacion({ caso, patente, dni, aviso: avisoSesion, extras, onRecargar }) {
  const [subiendo, setSubiendo] = useState(null); // tipo en curso
  const [aviso, setAviso] = useState(null); // { tipo, ok, texto }
  const inputRef = useRef(null);
  const tipoRef = useRef(null);

  if (!extras) return null; // la función todavía no existe o falló: no mostramos nada
  const { enviados, tenemos } = extras;
  const cargar = onRecargar;

  const porTipo = {};
  enviados.forEach(e => { (porTipo[e.tipo] ||= []).push(e); });

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
    <section style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Mandanos tu documentación</div>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--sub)", lineHeight: 1.45 }}>Podés sacar la foto con el celular o elegir un PDF. Si preferís, mandalo por WhatsApp.</p>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={alElegir} />
      {DOCS_CLIENTE.map((d, i) => {
        const env = porTipo[d.tipo] || [];
        const loTenemos = Boolean(tenemos?.[d.tipo]);
        const listo = env.length > 0 || loTenemos;
        const esteAviso = aviso && aviso.tipo === d.tipo ? aviso : null;
        return (
          <div key={d.tipo} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 5, flex: "none", display: "grid", placeItems: "center", background: listo ? "var(--ok)" : "transparent", border: `1.5px solid ${listo ? "var(--ok)" : "var(--border2)"}`, color: "#fff" }}>
                {listo && <Icono nombre="check" size={12} />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{d.l}{d.requerido && !listo && <span style={{ color: "var(--muted)", fontWeight: 400 }}> · necesario</span>}</span>
                {loTenemos
                  ? <span style={{ display: "block", fontSize: 12, color: "var(--ok)" }}>Ya lo tenemos</span>
                  : env.length > 0 && <span style={{ display: "block", fontSize: 12, color: "var(--ok)" }}>Enviado{env.length > 1 ? ` (${env.length})` : ""} · {new Date(env[0].creado).toLocaleDateString("es-AR")}</span>}
              </span>
              <button type="button" onClick={() => elegir(d.tipo)} disabled={!!subiendo}
                style={{ font: "inherit", fontSize: 13, fontWeight: 600, padding: "7px 12px", borderRadius: 8, cursor: subiendo ? "default" : "pointer", border: `1px solid ${listo ? "var(--border2)" : "var(--accent)"}`, background: listo ? "var(--card)" : "var(--accent)", color: listo ? "var(--text)" : "var(--on-accent)", opacity: subiendo && subiendo !== d.tipo ? 0.5 : 1, whiteSpace: "nowrap" }}>
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

function TarjetaCaso({ caso, patente, dni, aviso }) {
  const cerrado = ["cobrado", "desistido"].includes(caso.estado);
  const [extras, setExtras] = useState(null);
  const cargarExtras = useCallback(() => extrasCliente({ patente, dni, casoId: caso.id }).then(setExtras), [patente, dni, caso.id]);
  useEffect(() => { if (!cerrado) cargarExtras(); }, [cerrado, cargarExtras]);
  const evento = extras?.proximoEvento;
  const ofrecido = Number(caso.monto_ofrecimiento) || 0;
  const cobras = Number(caso.monto_cobro_asegurado) || 0;
  const caja = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 };

  return (
    <article style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section style={caja}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "var(--sub)" }}>Reclamo ante</div>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{caso.compania_aseguradora || "la compañía"}</div>
          </div>
          {caso.patente && <span style={{ flex: "none", fontFamily: "var(--mono)", fontWeight: 600, fontSize: 13, border: "1.5px solid var(--text)", borderRadius: 4, padding: "1px 7px", letterSpacing: 0.5 }}>{caso.patente}</span>}
        </div>

        {caso.estado === "desistido"
          ? <div style={{ background: "var(--card2)", borderRadius: 8, padding: "12px 14px", fontSize: 14, lineHeight: 1.5 }}>{ahora(caso)}</div>
          : <LineaDeTiempo caso={caso} />}

        {evento && (
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "flex-start", background: "color-mix(in srgb, var(--info) 10%, var(--card))", border: "1px solid color-mix(in srgb, var(--info) 30%, transparent)", borderRadius: 10, padding: "10px 12px" }}>
            <Icono nombre="calendario" size={18} />
            <span style={{ fontSize: 14, lineHeight: 1.45 }}>
              <b>{evento.tipo === "audiencia" ? "Audiencia" : "Mediación"}:</b> {new Date(evento.inicio).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}, {new Date(evento.inicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} hs.
              <span style={{ display: "block", fontSize: 12, color: "var(--sub)" }}>Te confirmamos los detalles por WhatsApp.</span>
            </span>
          </div>
        )}

        {caso.fecha_ultimo_movimiento && !cerrado && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 14 }}>Último movimiento en tu caso: <span className="num">{fmtDate(caso.fecha_ultimo_movimiento)}</span></div>
        )}
      </section>

      {caso.mensaje_cliente && (
        <section style={{ ...caja, borderLeft: "3px solid var(--accent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Mensaje del estudio</span>
            {caso.mensaje_cliente_fecha && <span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(caso.mensaje_cliente_fecha).toLocaleDateString("es-AR")}</span>}
          </div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{caso.mensaje_cliente}</p>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{ABOGADO}</div>
        </section>
      )}

      {!cerrado && <SubirDocumentacion caso={caso} patente={patente} dni={dni} aviso={aviso} extras={extras} onRecargar={cargarExtras} />}

      {(cobras > 0 || (ofrecido > 0 && !cerrado)) && (
        <section style={{ ...caja, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {ofrecido > 0 && !cerrado && (
            <div>
              <div style={{ fontSize: 13, color: "var(--sub)" }}>Ofrecimiento de la compañía</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{fmtMoney(ofrecido)}</div>
            </div>
          )}
          {cobras > 0 && (
            <div>
              <div style={{ fontSize: 13, color: "var(--sub)" }}>{caso.estado === "cobrado" ? "Cobraste" : "Vas a cobrar"}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--ok)" }}>{fmtMoney(cobras)}</div>
            </div>
          )}
        </section>
      )}
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
  const campo = { background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 10, color: "var(--text)", padding: "13px 14px", fontSize: 18, width: "100%", boxSizing: "border-box", fontFamily: "var(--mono)", fontWeight: 600, letterSpacing: 1.5, textAlign: "center", outline: "none" };
  const etiqueta = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column" }}>
      <header style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "12px 16px", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, fontFamily: "var(--mono)", flex: "none" }}>ATG</div>
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

      <main style={{ flex: 1, width: "100%", maxWidth: 560, margin: "0 auto", padding: "24px 16px 32px", boxSizing: "border-box" }}>
        {!casos ? (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 6px", letterSpacing: -0.3 }}>¿Cómo va tu reclamo?</h1>
            <p style={{ fontSize: 15, color: "var(--sub)", margin: "0 0 20px", lineHeight: 1.5 }}>Ingresá la patente de tu vehículo y los últimos 3 números de tu DNI.</p>

            <form onSubmit={buscar} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <label>
                <span style={etiqueta}>Patente</span>
                <input value={patente} onChange={e => setPatente(limpiarPatente(e.target.value).slice(0, 8))} placeholder="AB123CD" autoComplete="off" autoCapitalize="characters" style={campo} />
              </label>
              <label>
                <span style={etiqueta}>Últimos 3 números del DNI</span>
                <input value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="•••" inputMode="numeric" autoComplete="off" style={{ ...campo, maxWidth: 140, letterSpacing: 6 }} />
              </label>

              {error && <div role="alert" style={{ background: alpha("var(--bad)", 9), border: `1px solid ${alpha("var(--bad)", 25)}`, borderRadius: 8, padding: "10px 12px", color: "var(--bad)", fontSize: 14, lineHeight: 1.45 }}>{error}</div>}

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
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {casos.map(c => <TarjetaCaso key={c.id} caso={c} patente={patente} dni={dni} aviso={aviso} />)}
            </div>
            {(aviso.cantidad > 0 || aviso.avisados > 0) && (
              <div role="status" style={{ marginTop: 16, background: "var(--card)", border: "1px solid color-mix(in srgb, var(--ok) 40%, var(--border))", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
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
