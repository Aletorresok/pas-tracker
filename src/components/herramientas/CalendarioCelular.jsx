import { useEffect, useState } from "react";
import Boton from "../ui/Boton.jsx";
import { cargarCalendario, nuevoLink, guardarIncluir, urlCalendario, linkGoogle, probarLink, INCLUIR, INCLUIR_BASE } from "../../utils/calendario.js";

const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 16, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 };
const titulo = { margin: 0, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--muted)" };
const campo = { width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 12.5 };

const hace = iso => {
  if (!iso) return null;
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
};

// Herramientas → Calendario en el celular: link secreto para suscribir Google Calendar a la agenda de ATG Lex
export default function CalendarioCelular() {
  const [cal, setCal] = useState(undefined); // undefined = cargando/falta SQL, null = sin link
  const [cargado, setCargado] = useState(false);
  const [incluir, setIncluir] = useState(INCLUIR_BASE);
  const [aviso, setAviso] = useState(null);
  const [prueba, setPrueba] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const recargar = () => cargarCalendario().then(c => { setCal(c); setCargado(true); if (c?.incluir) setIncluir({ ...INCLUIR_BASE, ...c.incluir }); });
  useEffect(() => { recargar(); }, []);

  if (!cargado) return <div style={{ fontSize: 14, color: "var(--muted)" }}>Cargando…</div>;
  if (cal === undefined) return <div style={{ ...tarjeta, fontSize: 14, color: "var(--sub)" }}>Falta correr el SQL 34 (calendario) en Supabase.</div>;

  const crear = async () => {
    if (cal && !window.confirm("El link actual va a dejar de andar: tenés que volver a agregar el calendario en Google. ¿Crear uno nuevo?")) return;
    setTrabajando(true); setPrueba(null);
    const { error } = await nuevoLink(incluir);
    setTrabajando(false);
    if (error) { setAviso({ error: `No se pudo crear: ${error}` }); return; }
    setAviso({ ok: cal ? "Link nuevo creado. Agregalo otra vez en Google Calendar." : "Link creado." });
    recargar();
  };
  const cambiarIncluir = async (k, v) => {
    const nuevo = { ...incluir, [k]: v };
    setIncluir(nuevo);
    if (cal) { const error = await guardarIncluir(cal.token, nuevo); setAviso(error ? { error } : { ok: "Guardado. Google lo va a ver en su próxima lectura." }); }
  };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(urlCalendario(cal.token)); setAviso({ ok: "Link copiado." }); }
    catch { document.getElementById("link-calendario")?.select(); setAviso({ error: "Copialo a mano (ya quedó seleccionado)." }); }
  };
  const probar = async () => { setPrueba({ cargando: true }); setPrueba(await probarLink(cal.token)); };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 14, alignItems: "start" }}>
      <section style={tarjeta}>
        <h2 style={titulo}>Qué ver en el calendario</h2>
        {INCLUIR.map(o => (
          <label key={o.k} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={!!incluir[o.k]} onChange={e => cambiarIncluir(o.k, e.target.checked)} style={{ accentColor: "var(--accent)", marginTop: 3 }} />
            <span><span style={{ fontSize: 14, fontWeight: 600 }}>{o.l}</span><br /><span style={{ fontSize: 12.5, color: "var(--sub)" }}>{o.desc}</span></span>
          </label>
        ))}

        {!cal ? (
          <Boton variante="primario" icono="calendario" onClick={crear} disabled={trabajando}>{trabajando ? "Creando…" : "Crear mi link"}</Boton>
        ) : <>
          <h2 style={{ ...titulo, marginTop: 6 }}>Tu link (es privado: no lo compartas)</h2>
          <input id="link-calendario" readOnly value={urlCalendario(cal.token)} onFocus={e => e.target.select()} style={campo} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Boton variante="primario" icono="calendario" onClick={() => window.open(linkGoogle(cal.token), "_blank", "noopener")}>Agregar a Google Calendar</Boton>
            <Boton icono="copiar" onClick={copiar}>Copiar link</Boton>
            <Boton variante="fantasma" onClick={probar}>Probar</Boton>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {cal.ultimo_uso ? `Google (u otro calendario) lo leyó por última vez ${hace(cal.ultimo_uso)}.` : "Todavía nadie lo leyó."}
          </div>
          {prueba && (prueba.cargando
            ? <div style={{ fontSize: 13, color: "var(--muted)" }}>Probando…</div>
            : <div role="status" style={{ fontSize: 13, color: prueba.ok ? "var(--ok)" : "var(--bad)" }}>{prueba.ok ? `Anda: hoy trae ${prueba.eventos} ${prueba.eventos === 1 ? "evento" : "eventos"}.` : prueba.motivo}</div>)}
          <div><Boton tamaño="sm" variante="fantasma" onClick={crear} disabled={trabajando}>Regenerar link</Boton></div>
        </>}
        {aviso && <div role="status" style={{ fontSize: 13, color: aviso.error ? "var(--bad)" : "var(--ok)" }}>{aviso.error || aviso.ok}</div>}
      </section>

      <section style={tarjeta}>
        <h2 style={titulo}>Cómo se agrega</h2>
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, fontSize: 14, lineHeight: 1.5, color: "var(--text)" }}>
          <li>Desde la <b>compu</b>, tocá <b>"Agregar a Google Calendar"</b> y confirmá. (A mano: Google Calendar → Otros calendarios → <b>+</b> → <b>Desde URL</b> → pegar el link.)</li>
          <li>En el celular aparece solo, como un calendario más ("ATG Lex"). Si no lo ves: app de Google Calendar → Configuración → tocá el calendario → <b>Sincronizar</b>.</li>
          <li>Tocar un evento muestra el link que abre la ficha en ATG Lex.</li>
        </ol>
        <div style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.5 }}>
          Google relee el link cada <b>8 a 24 horas</b>: lo que cargues hoy puede tardar en aparecer. Lo urgente del día te llega igual por la notificación de las 9. Es de una sola vía: lo que cambies en Google no vuelve a ATG Lex.
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
          Si lo regenerás, el link viejo deja de andar y hay que agregarlo de nuevo (sirve si lo compartiste sin querer).
        </div>
      </section>
    </div>
  );
}
