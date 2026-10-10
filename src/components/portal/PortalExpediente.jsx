import { useState } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { alpha } from "../../utils/theme.js";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";
import EncabezadoCliente from "./EncabezadoCliente.jsx";
import Ilustracion from "../ui/Ilustracion.jsx";
import { Novedades, WHATSAPP, ABOGADO, HORARIO_ATENCION } from "./PortalCliente.jsx";
import { consultarExpedienteCliente, ESTADO_EXPEDIENTE_CLIENTE } from "../../utils/novedadesCliente.js";

const limpiarCodigo = v => v.replace(/[^A-Za-z0-9-]/g, "").toUpperCase().slice(0, 10);
const TIPO_EVENTO = { mediacion: "Mediación", audiencia: "Audiencia", reunion: "Reunión" };
const linkWa = codigo => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola ${ABOGADO}, te escribo por mi expediente${codigo ? ` (código ${codigo})` : ""}.`)}`;

// Vista pública del cliente de un expediente judicial: entra con su DNI + el código que le pasó el estudio.
// La consulta pasa por consultar_expediente_cliente (SQL 35): solo expedientes con "Visible para el cliente"
// y solo los movimientos marcados "Lo ve el cliente". 5 intentos fallidos cada 15 minutos.
export default function PortalExpediente() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [codigo, setCodigo] = useState(() => limpiarCodigo(new URLSearchParams(window.location.search).get("codigo") || ""));
  const [dni, setDni] = useState("");
  const [exp, setExp] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const puedeBuscar = codigo.replace(/-/g, "").length >= 4 && dni.length >= 7 && !cargando;
  const buscar = async e => {
    e.preventDefault();
    if (!puedeBuscar) return;
    setCargando(true); setError("");
    try {
      const data = await consultarExpedienteCliente({ dni, codigo });
      if (!data) setError("No encontramos un expediente con ese DNI y código. Revisá los datos o escribinos por WhatsApp.");
      else setExp(data);
    } catch (err) {
      console.error("[PortalExpediente]", err);
      setError(String(err?.message || "").includes("demasiados_intentos")
        ? "Hiciste varios intentos seguidos. Esperá 15 minutos y probá de nuevo, o escribinos por WhatsApp."
        : "No pudimos consultar tu expediente en este momento. Probá de nuevo en un rato.");
    }
    setCargando(false);
  };

  const caja = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 18 };
  const campo = { background: "var(--card)", border: "1px solid var(--border2)", borderRadius: "var(--r-sm)", color: "var(--text)", padding: "13px 14px", fontSize: 18, width: "100%", boxSizing: "border-box", fontFamily: "var(--mono)", fontWeight: 600, letterSpacing: 1.5, textAlign: "center", outline: "none" };
  const etiqueta = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 };
  const est = exp ? ESTADO_EXPEDIENTE_CLIENTE[exp.estado] || { l: exp.estado, d: "" } : null;
  const botonWa = (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <a className="btn-wa-grande" href={linkWa(codigo)} target="_blank" rel="noopener noreferrer"><Icono nombre="mensaje" size={18} /> Escribinos por WhatsApp</a>
      {HORARIO_ATENCION && <span style={{ fontSize: 12, color: "var(--muted)" }}>Respondemos {HORARIO_ATENCION}</span>}
    </span>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column" }}>
      <EncabezadoCliente subtitulo="Seguimiento de tu expediente" onSalir={exp && (() => { setExp(null); setDni(""); })} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <main style={{ flex: 1, width: "100%", maxWidth: exp ? 760 : 560, margin: "0 auto", padding: "24px 16px 32px", boxSizing: "border-box" }}>
        {!exp ? (
          <>
            <Ilustracion nombre="carpeta" size={96} style={{ margin: "0 0 4px -8px" }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px", letterSpacing: -0.3 }}>¿Cómo va tu expediente?</h1>
            <p style={{ fontSize: 15, color: "var(--sub)", margin: "0 0 20px", lineHeight: 1.5 }}>Ingresá tu DNI y el código que te pasó el estudio.</p>
            <form onSubmit={buscar} style={{ ...caja, boxShadow: "var(--sh-1)", display: "flex", flexDirection: "column", gap: 14 }}>
              <label htmlFor="exp-codigo"><span style={etiqueta}>Código</span>
                <input id="exp-codigo" value={codigo} onChange={e => setCodigo(limpiarCodigo(e.target.value))} placeholder="ABCD-12" autoComplete="off" autoCapitalize="characters" style={campo} />
              </label>
              <label htmlFor="exp-dni"><span style={etiqueta}>DNI (sin puntos)</span>
                <input id="exp-dni" value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="30123456" inputMode="numeric" autoComplete="off" style={campo} />
              </label>
              {error && <div role="alert" style={{ background: alpha("var(--bad)", 9), border: `1px solid ${alpha("var(--bad)", 25)}`, borderRadius: "var(--r-sm)", padding: "10px 12px", color: "var(--bad)", fontSize: 14, lineHeight: 1.45 }}>{error}</div>}
              <Boton variante="primario" type="submit" disabled={!puedeBuscar} style={{ width: "100%", padding: 13, fontSize: 15 }}>{cargando ? "Buscando…" : "Ver mi expediente"}</Boton>
            </form>
            <div style={{ marginTop: 24, textAlign: "center", fontSize: 14, color: "var(--sub)" }}>
              <p style={{ margin: "0 0 10px" }}>¿No tenés el código o no podés entrar?</p>
              {botonWa}
            </div>
          </>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <section style={caja}>
              <div style={{ fontSize: 13, color: "var(--sub)" }}>Expediente</div>
              <div style={{ fontSize: 19, fontWeight: 700, overflowWrap: "anywhere" }}>{exp.caratula}</div>
              {(exp.juzgado || exp.numero) && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{[exp.juzgado, exp.numero && `Expte. ${exp.numero}`].filter(Boolean).join(" · ")}</div>}
              <div style={{ marginTop: 14, background: alpha("var(--accent)", 10), borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{est.l}</div>
                {est.d && <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 2 }}>{est.d}</div>}
              </div>
              {(exp.proximos || []).map((ev, i) => (
                <div key={i} style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start", background: "color-mix(in srgb, var(--info) 10%, var(--card))", border: "1px solid color-mix(in srgb, var(--info) 30%, transparent)", borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
                  <Icono nombre="calendario" size={18} />
                  <span style={{ fontSize: 14, lineHeight: 1.45 }}>
                    <b>{TIPO_EVENTO[ev.tipo] || "Evento"}:</b> {new Date(ev.inicio).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}, {new Date(ev.inicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} hs.
                    {ev.lugar && <span style={{ display: "block", fontSize: 13, color: "var(--sub)", marginTop: 2 }}>Lugar: {ev.lugar}</span>}
                    {ev.link && <a href={ev.link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 6, fontSize: 13, fontWeight: 600 }}>Link para entrar</a>}
                    <span style={{ display: "block", fontSize: 12, color: "var(--sub)", marginTop: 6 }}>Te confirmamos por WhatsApp si tenés que participar.</span>
                  </span>
                </div>
              ))}
            </section>
            {exp.mensaje && (
              <section style={{ ...caja, borderLeft: "3px solid var(--accent)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Mensaje del estudio</span>
                  {exp.mensaje_fecha && <span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(exp.mensaje_fecha).toLocaleDateString("es-AR")}</span>}
                </div>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{exp.mensaje}</p>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{ABOGADO}</div>
              </section>
            )}
            {exp.movimientos?.length > 0 && <Novedades lista={exp.movimientos} caja={caja} titulo="Novedades de tu expediente" />}
            <div style={{ marginTop: 10, textAlign: "center" }}>{botonWa}</div>
          </div>
        )}
      </main>
      <footer style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 0px))" }}>ATG Lex Solutions · {ABOGADO}</footer>
    </div>
  );
}
