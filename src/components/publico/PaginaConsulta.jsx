import { useEffect, useRef, useState } from "react";
import { enviarConsulta } from "../../utils/consultas.js";
import { linkWhatsApp, TELEFONO_ESTUDIO } from "../../utils/mensajes.js";
import { useTheme } from "../../context/ThemeContext.jsx";
import Logo from "../ui/Logo.jsx";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";

const HORARIO = "de lunes a viernes de 9 a 18";
const ZONAS = "CABA y Provincia de Buenos Aires";

// Datos personales de la página. Lo que quede vacío no se muestra.
const ABOGADO = {
  nombre: "Alexis Torres Gaveglio",
  matricula: "",    // ej.: "T° 100 F° 200 CPACF"
  foto: "",         // ej.: "/alexis.jpg" (archivo en public/)
  presentacion: "", // dos o tres líneas propias: desde cuándo ejerce y cómo trabaja con sus clientes
};

// Temas de consulta: el nombre corto va en el formulario y queda al principio del relato ("Tema: Alimentos.")
const TEMAS = [
  { k: "Choque", titulo: "Choques y seguros", texto: "Te chocaron y la compañía del otro no responde o no estás de acuerdo con lo que ofrece. Reclamo los daños del vehículo y las lesiones." },
  { k: "Alimentos", titulo: "Alimentos", texto: "Cuota alimentaria para tus hijos: pedirla por primera vez, actualizarla o reclamar lo que no se pagó." },
  { k: "Divorcio", titulo: "Divorcios", texto: "Divorcio de común acuerdo o pedido por uno solo, con el acuerdo sobre hijos y bienes." },
  { k: "Sucesión", titulo: "Sucesiones", texto: "Falleció un familiar y hay que poner a nombre de los herederos una casa, un auto o una cuenta." },
  { k: "Consumo", titulo: "Defensa del consumidor", texto: "Billeteras virtuales, bancos, servicios o compras que no cumplieron con lo acordado." },
  { k: "Otro tema", titulo: "Otro tema", texto: "Si no sabés dónde encaja tu problema, contámelo igual y te digo si te puedo ayudar." },
];

const PASOS = [
  ["Me contás qué pasó", `Por WhatsApp o con el formulario. Respondo ${HORARIO}.`],
  ["Te explico tus opciones", "Qué se puede reclamar, qué papeles hacen falta y cuáles son los pasos."],
  ["Seguís tu caso desde el celular", "Ves en qué etapa está, qué novedades hubo y si tenés que hacer algo."],
];

const PREGUNTAS = [
  ["¿Tengo que ir al estudio?", "No hace falta. La consulta y casi todos los trámites se hacen por WhatsApp y de manera virtual. Si preferís que nos veamos, lo coordinamos."],
  ["¿Qué necesito para la primera consulta?", "Nada especial: alcanza con que me cuentes qué pasó. Si tenés a mano papeles o fotos (una carta, un contrato, la denuncia del choque), sirven, pero se pueden mandar después."],
  ["¿Cómo me entero de cómo va mi caso?", "Desde el celular ves en qué etapa está, las novedades y si tenés que hacer algo. Y siempre me podés escribir por WhatsApp."],
  ["¿Dónde atendés?", `En ${ZONAS}, y en forma virtual.`],
];

const campo = { width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: "var(--r-sm)", border: "1px solid var(--border2)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 16 };
const etiqueta = { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 };
const mensajeWA = tema => (tema && tema !== "Otro tema" ? `Hola Alexis, quiero hacerte una consulta (${tema.toLowerCase()}).` : "Hola Alexis, quiero hacerte una consulta.");

function BotonWA({ tema, texto = "Escribir por WhatsApp", style }) {
  return (
    <a href={linkWhatsApp(TELEFONO_ESTUDIO, mensajeWA(tema))} target="_blank" rel="noreferrer" className="btn-wa-grande" style={{ minHeight: 52, boxSizing: "border-box", fontSize: 16, ...style }}>
      <Icono nombre="mensaje" size={18} /> {texto}
    </a>
  );
}

// Vista previa (decorativa) de lo que ve el cliente cuando sigue su caso
function VistaPrevia() {
  return (
    <div aria-hidden="true" className="pc-previa">
      <div className="display" style={{ fontSize: 18, fontWeight: 700 }}>Hola, Florencia</div>
      <div className="bloque-paso" style={{ padding: 14, gap: 8, borderRadius: "var(--r-md)" }}>
        <div className="bloque-paso-sub">Paso 3 de 5</div>
        <div className="display" style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>Estamos negociando con la compañía</div>
        <div className="bloque-paso-barra">{[1, 1, 1, 0, 0].map((l, i) => <span key={i} className={l ? "lleno" : undefined} />)}</div>
      </div>
      <div style={{ background: "color-mix(in srgb, var(--ok) 12%, var(--card))", color: "var(--ok)", borderRadius: "var(--r-sm)", padding: "10px 12px", fontSize: 13, fontWeight: 700 }}>Vos no tenés que hacer nada por ahora</div>
      <div style={{ fontSize: 13 }}><div style={{ color: "var(--muted)" }}>5 de noviembre</div>La compañía hizo un ofrecimiento.</div>
    </div>
  );
}

// Página pública para quien busca asesoramiento y todavía no es cliente: atglex.com.ar/consulta (acepta ?ref=origen y ?tema=).
// Lo que se deja acá llega a Hoy → "Consultas de la web", igual que /reclamo.
export default function PaginaConsulta() {
  const { darkMode, toggleDarkMode } = useTheme();
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref") || "consulta";
  const [tema, setTema] = useState(() => TEMAS.find(t => t.k.toLowerCase() === (params.get("tema") || "").toLowerCase())?.k || "");
  const [f, setF] = useState({ nombre: "", telefono: "", relato: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const formRef = useRef(null);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  useEffect(() => { document.title = "Consultas legales · ATG Lex"; }, []);

  const irAlFormulario = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const elegir = k => { setTema(k); irAlFormulario(); };
  const enviar = async e => {
    e.preventDefault();
    setEnviando(true); setError("");
    const r = await enviarConsulta({ nombre: f.nombre, telefono: f.telefono, relato: `Tema: ${tema || "Otro tema"}. ${f.relato.trim()}`.trim(), ref });
    setEnviando(false);
    if (r.error) setError(r.error); else { setListo(true); irAlFormulario(); }
  };
  const nombre = f.nombre.trim().split(/\s+/)[0];
  const enlace = { color: "var(--accent-ink)", fontWeight: 600, textDecoration: "none" };

  return (
    <div className="pc" style={{ minHeight: "100vh", background: "var(--card)", color: "var(--text)", fontSize: 16 }}>
      <header style={{ borderBottom: "1px solid var(--border)", padding: "10px 16px" }}>
        <div className="pc-ancho" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Logo alto={28} />
            <span className="display" style={{ fontWeight: 700, fontSize: 17, whiteSpace: "nowrap" }}>ATG Lex</span>
          </div>
          <nav aria-label="Secciones" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <a className="pc-nav hide-mobile" href="#areas">En qué te ayudo</a>
            <a className="pc-nav hide-mobile" href="#como">Cómo trabajo</a>
            <a className="pc-nav hide-mobile" href="#preguntas">Preguntas</a>
            <a href="/?vista=cliente" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, boxSizing: "border-box", padding: "0 14px", border: "1px solid var(--border2)", borderRadius: "var(--r-sm)", color: "var(--text)", fontSize: 14, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>Ya soy cliente</a>
            <Boton variante="fantasma" tamaño="sm" icono={darkMode ? "sol" : "luna"} onClick={toggleDarkMode} aria-label={darkMode ? "Modo claro" : "Modo oscuro"} style={{ minHeight: 44 }} />
          </nav>
        </div>
      </header>

      <main>
        <section className="pc-franja" style={{ background: "var(--bg)" }}>
          <div className="pc-ancho pc-hero">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-ink)" }}>Abogado · {ZONAS}</div>
              <h1 className="pc-h1">Contame qué te pasó. Te digo qué podés hacer.</h1>
              <p style={{ margin: 0, fontSize: 18, lineHeight: 1.5, color: "var(--sub)", maxWidth: 520 }}>Choques, alimentos, divorcios, sucesiones y problemas de consumo. Te explico tus opciones en palabras simples y seguís tu caso desde el celular.</p>
              <div className="pc-botones">
                <BotonWA tema={tema} />
                <a href="#consulta" onClick={e => { e.preventDefault(); irAlFormulario(); }} className="pc-secundario">Prefiero que me escriban</a>
              </div>
              <div style={{ fontSize: 14, color: "var(--sub)" }}>{ABOGADO.matricula ? `Matrícula ${ABOGADO.matricula} · ` : ""}Respondo {HORARIO}</div>
            </div>

            <section id="consulta" ref={formRef} aria-labelledby="t-form" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: 20, scrollMarginTop: 16 }}>
              {listo ? (
                <div role="status" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h2 id="t-form" style={{ margin: 0, fontSize: 24 }}>Listo{nombre ? `, ${nombre}` : ""}. Recibí tu consulta.</h2>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>Te escribo por WhatsApp {HORARIO}.</p>
                  <p style={{ margin: 0, lineHeight: 1.5, color: "var(--sub)" }}>Si tenés fotos o papeles a mano, mandalos ahora y ganamos tiempo.</p>
                  <BotonWA tema={tema} texto="Mandar por WhatsApp" />
                </div>
              ) : (
                <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <h2 id="t-form" style={{ margin: 0, fontSize: 24 }}>Dejá tu consulta</h2>
                  <fieldset style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>
                    <legend style={{ padding: 0, marginBottom: 8, fontSize: 14, fontWeight: 600 }}>¿Sobre qué es?</legend>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {TEMAS.map(t => <button key={t.k} type="button" className="chip" aria-pressed={tema === t.k} onClick={() => setTema(t.k)} style={{ minHeight: 40, fontSize: 14 }}>{t.k}</button>)}
                    </div>
                  </fieldset>
                  <label style={etiqueta}>Tu nombre<input required autoComplete="name" value={f.nombre} onChange={e => set("nombre", e.target.value)} style={campo} /></label>
                  <label style={etiqueta}>Tu WhatsApp<input required type="tel" inputMode="tel" autoComplete="tel" placeholder="11 2345-6789" value={f.telefono} onChange={e => set("telefono", e.target.value)} style={campo} /></label>
                  <label style={etiqueta}>Contame en pocas palabras<textarea rows={3} maxLength={900} value={f.relato} onChange={e => set("relato", e.target.value)} placeholder="Por ejemplo: me chocaron de atrás y la compañía del otro no me responde" style={{ ...campo, resize: "vertical" }} /></label>
                  {error && <div role="alert" style={{ color: "var(--bad)", fontSize: 14 }}>{error}</div>}
                  <Boton type="submit" variante="primario" disabled={enviando} style={{ width: "100%", minHeight: 52, fontSize: 16 }}>{enviando ? "Enviando…" : "Enviar consulta"}</Boton>
                  <div style={{ fontSize: 13, color: "var(--sub)" }}>Te escribo por WhatsApp. Dejar la consulta no te compromete a nada.</div>
                </form>
              )}
            </section>
          </div>
        </section>

        <section id="areas" className="pc-franja">
          <div className="pc-ancho">
            <h2 className="pc-h2">En qué te puedo ayudar</h2>
            <p style={{ margin: "4px 0 20px", color: "var(--sub)" }}>Elegí lo que más se parece a tu situación.</p>
            <div className="pc-areas">
              {TEMAS.map(t => (
                <a key={t.k} href="#consulta" onClick={e => { e.preventDefault(); elegir(t.k); }} className="pc-area lift">
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="display" style={{ display: "block", fontSize: 19, fontWeight: 700 }}>{t.titulo}</span>
                    <span style={{ display: "block", fontSize: 15, lineHeight: 1.5, color: "var(--sub)", marginTop: 4 }}>{t.texto}</span>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600, color: "var(--accent-ink)", flex: "none" }}><span className="hide-mobile">Consultar</span> <span style={{ display: "inline-flex", transform: "rotate(-90deg)" }}><Icono nombre="chevron" size={16} /></span></span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="como" className="pc-franja" style={{ background: "var(--tinta)", color: "var(--tinta-texto)" }}>
          <div className="pc-ancho pc-como">
            <div>
              <h2 className="pc-h2">Cómo trabajo</h2>
              <ol style={{ listStyle: "none", margin: "20px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 18 }}>
                {PASOS.map(([t, d], i) => (
                  <li key={t} style={{ display: "flex", gap: 14 }}>
                    <span aria-hidden="true" style={{ flex: "none", width: 34, height: 34, borderRadius: "50%", background: "var(--tinta-acento)", color: "var(--tinta)", fontWeight: 700, display: "grid", placeItems: "center" }}>{i + 1}</span>
                    <span><span style={{ display: "block", fontSize: 18, fontWeight: 600 }}>{t}</span><span style={{ display: "block", fontSize: 15, lineHeight: 1.5, color: "var(--tinta-sub)" }}>{d}</span></span>
                  </li>
                ))}
              </ol>
            </div>
            <VistaPrevia />
          </div>
        </section>

        <section id="quien" className="pc-franja">
          <div className="pc-ancho" style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            {ABOGADO.foto && <img src={ABOGADO.foto} alt={ABOGADO.nombre} width={160} height={160} style={{ width: 160, height: 160, objectFit: "cover", borderRadius: "var(--r-lg)" }} />}
            <div style={{ flex: "1 1 320px", minWidth: 0, maxWidth: 680 }}>
              <h2 className="pc-h2">Quién soy</h2>
              <p style={{ margin: "8px 0 0", fontSize: 17, lineHeight: 1.6 }}>Soy {ABOGADO.nombre}, abogado. {ABOGADO.presentacion || "Atiendo personalmente cada consulta y te cuento en qué está tu caso sin que tengas que preguntar."}</p>
              <div style={{ marginTop: 10, fontSize: 14, color: "var(--sub)" }}>{ABOGADO.matricula ? `Matrícula ${ABOGADO.matricula} · ` : ""}Atención en {ZONAS} y en forma virtual</div>
            </div>
          </div>
        </section>

        <section id="preguntas" className="pc-franja" style={{ background: "var(--bg)" }}>
          <div className="pc-ancho" style={{ maxWidth: 760 }}>
            <h2 className="pc-h2" style={{ marginBottom: 8 }}>Preguntas frecuentes</h2>
            {PREGUNTAS.map(([p, r], i) => (
              <details key={p} open={i === 0} style={{ borderTop: i ? "1px solid var(--border2)" : "none" }}>
                <summary style={{ cursor: "pointer", padding: "16px 0", fontSize: 17, fontWeight: 600 }}>{p}</summary>
                <p style={{ margin: "0 0 16px", lineHeight: 1.6, color: "var(--sub)" }}>{r}</p>
              </details>
            ))}
            <details style={{ borderTop: "1px solid var(--border2)" }}>
              <summary style={{ cursor: "pointer", padding: "16px 0", fontSize: 17, fontWeight: 600 }}>Ya tengo un caso con el estudio, ¿dónde lo veo?</summary>
              <p style={{ margin: "0 0 16px", lineHeight: 1.6, color: "var(--sub)" }}>Entrá a <a href="/?vista=cliente" style={enlace}>Ver mi reclamo</a> con tu patente y los últimos 3 números de tu DNI.</p>
            </details>
          </div>
        </section>

        <section className="pc-franja" style={{ textAlign: "center" }}>
          <div className="pc-ancho" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <h2 className="pc-h2">¿Tenés una duda? Escribime y lo vemos.</h2>
            <BotonWA tema={tema} style={{ width: "100%", maxWidth: 360 }} />
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "20px 16px calc(20px + env(safe-area-inset-bottom, 0px))", fontSize: 14, color: "var(--sub)" }}>
        <div className="pc-ancho" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span>ATG Lex · Dr. {ABOGADO.nombre} · {ZONAS}</span>
          <span style={{ display: "inline-flex", gap: 20, flexWrap: "wrap" }}>
            <a href="/?vista=cliente" style={enlace}>Ver mi reclamo</a>
            <a href="/portal" style={enlace}>Soy productor de seguros</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
