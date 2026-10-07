import { useEffect, useRef, useState } from "react";
import { enviarConsulta, cargarPlazosPublicos } from "../../utils/consultas.js";
import { linkWhatsApp, TELEFONO_ESTUDIO } from "../../utils/mensajes.js";
import { fechaLocalISO } from "../../utils/formatters.js";
import { useTheme } from "../../context/ThemeContext.jsx";
import Logo from "../ui/Logo.jsx";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";

const HORARIO = "de lunes a viernes de 9 a 18";
const ABOGADO = "Dr. Alexis Torres Gaveglio";

const PASOS = [
  ["Nos contás qué pasó", "Dejás tus datos acá o nos escribís por WhatsApp. Te pedimos las fotos, la denuncia y el registro."],
  ["Reclamamos y negociamos", "Presentamos el reclamo ante la compañía del otro auto y lo seguimos hasta que ofrezca."],
  ["Cobrás", "Antes de aceptar una oferta, siempre te consultamos. Cuando la compañía paga, cobrás vos."],
];

const PREGUNTAS = [
  ["¿Qué reclamos toman?", "El reclamo a la compañía del otro vehículo cuando no tuviste la culpa: los daños del auto o la moto y también las lesiones. Además, los incumplimientos de tu propia compañía de seguros."],
  ["¿Cuánto me cuesta?", "En la etapa administrativa (el reclamo ante la compañía), nada. Si hay que ir a mediación, solo el costo de la mediación. Si hay juicio, los gastos judiciales y un porcentaje de la indemnización."],
  ["¿Qué necesito?", "Fotos de los daños, la denuncia del siniestro, tu DNI, la cédula del vehículo y, si los tenés, los datos del otro auto. Si te falta algo, te ayudamos a conseguirlo."],
  ["¿Cuánto tarda?", "Depende de la compañía. Más arriba ves cuántos días suele tardar cada una en ofrecer y en pagar, con los casos del estudio."],
  ["¿Qué pasa si ofrecen poco?", "Se negocia y, si no mejora, se va a mediación o a juicio. Nunca se acepta una oferta sin consultarte."],
  ["¿Cómo sé en qué está mi reclamo?", "Con tu patente y tu DNI entrás a ver tu reclamo cuando quieras: en qué etapa está, cada novedad y los mensajes del estudio."],
  ["¿Dónde trabajan?", "Reclamos dentro de la Ciudad de Buenos Aires y la Provincia de Buenos Aires."],
];

const seccion = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: 20 };
const campo = { width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: "var(--r-sm)", border: "1px solid var(--border2)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 16 };
const etiqueta = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 };

function BotonWA({ texto = "Escribir por WhatsApp", mensaje = "Hola, quiero consultar por un choque.", grande }) {
  return (
    <a href={linkWhatsApp(TELEFONO_ESTUDIO, mensaje)} target="_blank" rel="noreferrer" className="btn-wa-grande"
      style={grande ? undefined : { padding: "10px 16px", fontSize: 14 }}><Icono nombre="mensaje" size={16} /> {texto}</a>
  );
}

// Plazos reales por compañía (medianas con 3 casos o más); no se muestra si todavía no hay datos
function PlazosCompanias() {
  const [lista, setLista] = useState([]);
  const [cia, setCia] = useState("");
  useEffect(() => { cargarPlazosPublicos().then(l => { setLista(l); setCia(l[0]?.compania || ""); }); }, []);
  if (!lista.length) return null;
  const x = lista.find(l => l.compania === cia) || lista[0];
  const dato = (n, texto) => (
    <div style={{ flex: 1, background: "var(--card2)", borderRadius: "var(--r-md)", padding: "14px 16px" }}>
      <div className="num" style={{ fontSize: 28, fontWeight: 700 }}>{n != null ? `${n} días` : "—"}</div>
      <div style={{ fontSize: 13, color: "var(--sub)" }}>{texto}</div>
    </div>
  );
  return (
    <section style={seccion} aria-labelledby="t-plazos">
      <h2 id="t-plazos" style={{ margin: "0 0 4px", fontSize: 20 }}>¿Cuánto tarda tu compañía?</h2>
      <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--sub)" }}>Con los casos reales del estudio, desde que presentamos el reclamo.</p>
      <div style={etiqueta}><label htmlFor="cia-plazos">Compañía del otro auto</label>
        <select id="cia-plazos" value={x.compania} onChange={e => setCia(e.target.value)} style={campo}>{lista.map(l => <option key={l.compania}>{l.compania}</option>)}</select></div>
      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>{dato(x.dias_oferta, "hasta que ofrece")}{dato(x.dias_cobro, "hasta que cobrás")}</div>
      <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--muted)" }}>Es la mitad de los casos: algunos salen antes y otros tardan más.</p>
    </section>
  );
}

// Página pública para quien todavía no es cliente: atglex.com.ar/reclamo (también acepta ?ref=origen)
export default function PaginaReclamo() {
  const { darkMode, toggleDarkMode } = useTheme();
  const ref = new URLSearchParams(window.location.search).get("ref") || "";
  const [f, setF] = useState({ nombre: "", telefono: "", patente: "", fecha: "", compania: "", lesiones: false, relato: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const formRef = useRef(null);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  useEffect(() => { document.title = "¿Chocaste? Reclamá a la compañía · ATG Lex"; }, []);

  const enviar = async e => {
    e.preventDefault();
    setEnviando(true); setError("");
    const r = await enviarConsulta({ ...f, ref });
    setEnviando(false);
    if (r.error) setError(r.error); else { setListo(true); formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  };
  const irAlFormulario = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const nombre = f.nombre.trim().split(/\s+/)[0];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Logo alto={26} />
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700 }}>ATG Lex</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Abogados · Reclamos por choques</div></div>
        </div>
        <Boton variante="fantasma" tamaño="sm" icono={darkMode ? "sol" : "luna"} onClick={toggleDarkMode} aria-label={darkMode ? "Modo claro" : "Modo oscuro"} />
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 40px", display: "flex", flexDirection: "column", gap: 18 }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 4px" }}>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.12, letterSpacing: -0.6 }}>¿Chocaste y no fue tu culpa?</h1>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: "var(--sub)" }}>Le reclamamos a la compañía del otro vehículo: los daños y también las lesiones. <b style={{ color: "var(--text)" }}>En la etapa administrativa no te cuesta nada.</b></p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Boton variante="primario" onClick={irAlFormulario}>Quiero que me llamen</Boton>
            <BotonWA />
          </div>
        </section>

        <section style={seccion} aria-labelledby="t-pasos">
          <h2 id="t-pasos" style={{ margin: "0 0 12px", fontSize: 20 }}>Cómo funciona</h2>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
            {PASOS.map(([t, d], i) => (
              <li key={t} style={{ display: "flex", gap: 12 }}>
                <span aria-hidden="true" style={{ width: 32, height: 32, flex: "none", borderRadius: "var(--r-pill)", background: "var(--accent)", color: "var(--on-accent, #fff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{i + 1}</span>
                <span><b style={{ fontSize: 16 }}>{t}</b><span style={{ display: "block", fontSize: 14, color: "var(--sub)", lineHeight: 1.5 }}>{d}</span></span>
              </li>
            ))}
          </ol>
        </section>

        <PlazosCompanias />

        <section ref={formRef} style={{ ...seccion, scrollMarginTop: 16 }} aria-labelledby="t-form">
          {listo ? (
            <div role="status" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 id="t-form" style={{ margin: 0, fontSize: 22 }}>¡Listo{nombre ? `, ${nombre}` : ""}!</h2>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>Recibimos tu consulta. Te escribimos por WhatsApp {HORARIO}.</p>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "var(--sub)" }}>Si ya tenés fotos del choque o la denuncia, mandalas ahora y ganamos tiempo.</p>
              <div><BotonWA grande texto="Mandar fotos por WhatsApp" mensaje={`Hola, soy ${f.nombre.trim()}. Acabo de dejar mi consulta en la web${f.patente ? ` (patente ${f.patente.toUpperCase()})` : ""}. Les mando las fotos:`} /></div>
            </div>
          ) : (
            <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <h2 id="t-form" style={{ margin: "0 0 4px", fontSize: 20 }}>Contanos qué pasó</h2>
                <p style={{ margin: 0, fontSize: 14, color: "var(--sub)" }}>Te escribimos por WhatsApp para seguir. No te compromete a nada.</p>
              </div>
              <label style={etiqueta}>Tu nombre<input required autoComplete="name" value={f.nombre} onChange={e => set("nombre", e.target.value)} style={campo} /></label>
              <label style={etiqueta}>WhatsApp<input required type="tel" inputMode="tel" autoComplete="tel" placeholder="11 2345-6789" value={f.telefono} onChange={e => set("telefono", e.target.value)} style={campo} /></label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <label style={etiqueta}>Tu patente<input value={f.patente} onChange={e => set("patente", e.target.value.toUpperCase())} placeholder="AB123CD" style={{ ...campo, textTransform: "uppercase" }} /></label>
                <label style={etiqueta}>Fecha del choque<input type="date" max={fechaLocalISO()} value={f.fecha} onChange={e => set("fecha", e.target.value)} style={campo} /></label>
              </div>
              <label style={etiqueta}>Compañía del otro auto (si la sabés)<input value={f.compania} onChange={e => set("compania", e.target.value)} style={campo} /></label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, cursor: "pointer", minHeight: 44 }}>
                <input type="checkbox" checked={f.lesiones} onChange={e => set("lesiones", e.target.checked)} style={{ width: 22, height: 22, accentColor: "var(--accent)" }} /> Hubo lesionados
              </label>
              <label style={etiqueta}>¿Qué pasó? (opcional)<textarea rows={3} maxLength={1000} value={f.relato} onChange={e => set("relato", e.target.value)} placeholder="Ej.: me chocaron de atrás en un semáforo." style={{ ...campo, resize: "vertical" }} /></label>
              {error && <div role="alert" style={{ color: "var(--bad)", fontSize: 14 }}>{error}</div>}
              <Boton type="submit" variante="primario" disabled={enviando} style={{ width: "100%", padding: "14px 20px", fontSize: 16 }}>{enviando ? "Enviando…" : "Quiero que me llamen"}</Boton>
            </form>
          )}
        </section>

        <section style={seccion} aria-labelledby="t-preguntas">
          <h2 id="t-preguntas" style={{ margin: "0 0 6px", fontSize: 20 }}>Preguntas frecuentes</h2>
          {PREGUNTAS.map(([p, r], i) => (
            <details key={p} style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
              <summary style={{ cursor: "pointer", padding: "14px 0", fontSize: 15, fontWeight: 600 }}>{p}</summary>
              <p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.55, color: "var(--sub)" }}>{r}</p>
            </details>
          ))}
        </section>

        <footer style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10, alignItems: "center", paddingTop: 8 }}>
          <BotonWA texto="Consultar por WhatsApp" />
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Respondemos {HORARIO}.</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>ATG Lex · {ABOGADO} · CABA y Provincia de Buenos Aires</div>
        </footer>
      </main>
    </div>
  );
}
