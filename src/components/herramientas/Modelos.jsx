import { useEffect, useMemo, useRef, useState } from "react";
import Boton from "../ui/Boton.jsx";
import { useEsCelular } from "../../hooks/useEsCelular.js";
import { Hoja } from "../escritos/ModalEscritos.jsx";
import { cargarModelos, guardarModelo, borrarModelo, CATEGORIAS_MODELO, categoriaModelo, AMBITOS, FIRMAS, DOCUMENTAL_FIJA } from "../../utils/modelos.js";
import { CATALOGO_VARIABLES, variablesDe, completar } from "../../utils/plantillas.js";
import { cargarEstudio } from "../../utils/estudio.js";

const etiqueta = { display: "block", fontSize: 12, color: "var(--sub)", marginBottom: 4 };
const campo = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", font: "inherit", fontSize: 14 };
const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 16, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 };
const NUEVO = { titulo: "", categoria: "otro", ambito: "caso", firma: "estudio", membrete: true, activo: true, orden: 100, cuerpo: "Buenos Aires, {{hoy_largo}}\n\nSeñores\n**{{compania.razon_social}}**\n\nRef.: {{asegurado}} · Dominio {{patente}}\n\n" };

// Atajos para insertar en el texto
const ATAJOS = [
  { l: "Pregunta de monto", t: "{{? monto_x | Monto | monto}}" },
  { l: "Pregunta de texto", t: "{{? dato_x | Qué hay que completar | texto}}" },
  { l: "Pregunta de fecha", t: "{{? fecha_x | Fecha | fecha}}" },
  { l: "Solo si hay dato", t: "{{#si nro_siniestro}}N° {{nro_siniestro}}{{/si}}" },
  { l: "Título", t: "\n# TÍTULO\n" },
  { l: "Negrita", t: "**texto**" },
];

// Herramientas → Modelos: los modelos de escritos (SQL 32) que usa "Generar escrito"
export default function Modelos({ allCasos = [] }) {
  const [modelos, setModelos] = useState(undefined); // undefined = cargando, null = falta el SQL 32
  const [cat, setCat] = useState("todas");
  const [actual, setActual] = useState(null); // modelo en edición (copia)
  const [cambios, setCambios] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [estudio, setEstudio] = useState({});
  const [casoEjemplo, setCasoEjemplo] = useState("");
  const texto = useRef(null);
  const esCelular = useEsCelular();

  const recargar = () => cargarModelos().then(setModelos);
  useEffect(() => { recargar(); cargarEstudio().then(setEstudio); }, []);

  const ejemplo = allCasos.find(c => c.id === casoEjemplo) || null;
  const previa = useMemo(() => {
    if (!actual) return "";
    const v = variablesDe({ caso: ejemplo, compania: ejemplo?.compania_aseguradora ? { nombre: ejemplo.compania_aseguradora } : null, estudio, documental: DOCUMENTAL_FIJA });
    return completar(actual.cuerpo, v, {}).texto;
  }, [actual, ejemplo, estudio]);

  if (modelos === undefined) return <div style={{ fontSize: 14, color: "var(--muted)" }}>Cargando…</div>;
  if (modelos === null) return <div style={{ ...tarjeta, fontSize: 14, color: "var(--sub)" }}>Falta correr el SQL 32 (modelos de escritos) en Supabase. Trae 9 modelos para empezar.</div>;

  const abrir = m => {
    if (cambios && !window.confirm("Hay cambios sin guardar en el modelo abierto. ¿Descartarlos?")) return;
    setActual(m ? { ...m } : { ...NUEVO }); setCambios(false); setAviso(null);
  };
  const cambiar = (k, v) => { setActual(a => ({ ...a, [k]: v })); setCambios(true); setAviso(null); };
  const insertar = t => {
    const el = texto.current;
    const ini = el ? el.selectionStart : actual.cuerpo.length, fin = el ? el.selectionEnd : ini;
    cambiar("cuerpo", actual.cuerpo.slice(0, ini) + t + actual.cuerpo.slice(fin));
    requestAnimationFrame(() => { if (el) { el.focus(); el.selectionStart = el.selectionEnd = ini + t.length; } });
  };

  const guardar = async () => {
    if (!actual.titulo.trim()) { setAviso({ error: "Poné un título." }); return; }
    const { data, error } = await guardarModelo({ ...actual, titulo: actual.titulo.trim() });
    if (error) { setAviso({ error: `No se pudo guardar: ${error}` }); return; }
    setActual({ ...data }); setCambios(false); setAviso({ ok: "Guardado." }); recargar();
  };
  const duplicar = () => { setActual({ ...actual, id: undefined, clave: undefined, titulo: `${actual.titulo} (copia)` }); setCambios(true); setAviso({ ok: "Copia lista: guardala para crearla." }); };
  const activar = async () => {
    const { data, error } = await guardarModelo({ id: actual.id, activo: !actual.activo });
    if (error) { setAviso({ error }); return; }
    setActual(a => ({ ...a, activo: data.activo })); recargar();
  };
  const borrar = async () => {
    if (!window.confirm(`¿Eliminar el modelo "${actual.titulo}"? No se puede deshacer.`)) return;
    const error = await borrarModelo(actual.id);
    if (error) { setAviso({ error: `No se pudo eliminar: ${error}` }); return; }
    setActual(null); setCambios(false); recargar();
  };

  const cats = ["todas", ...new Set(modelos.map(m => m.categoria))];
  const lista = modelos.filter(m => cat === "todas" || m.categoria === cat);

  return (
    <div style={{ display: "grid", gridTemplateColumns: esCelular ? "minmax(0, 1fr)" : "minmax(0, 280px) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
      {/* Lista */}
      <section style={tarjeta}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <b style={{ fontSize: 15 }}>Modelos</b>
          <Boton tamaño="sm" icono="agregar" onClick={() => abrir(null)}>Nuevo</Boton>
        </div>
        <div className="chips">
          {cats.map(c => (
            <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c === "todas" ? "Todos" : categoriaModelo(c).l} <span className="cuenta">{c === "todas" ? modelos.length : modelos.filter(m => m.categoria === c).length}</span>
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 4 }}>
          {lista.map(m => (
            <button key={m.id} type="button" onClick={() => abrir(m)} aria-pressed={actual?.id === m.id}
              style={{ textAlign: "left", font: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: "var(--r-sm)", cursor: "pointer", color: "var(--text)", opacity: m.activo ? 1 : 0.55,
                border: `1px solid ${actual?.id === m.id ? "var(--accent)" : "transparent"}`, background: actual?.id === m.id ? "color-mix(in srgb, var(--accent) 10%, var(--card))" : "transparent", display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>{m.titulo}</span>
              <span style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap" }}>{m.activo ? categoriaModelo(m.categoria).l : "Desactivado"}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Edición */}
      {!actual && (
        <section style={{ ...tarjeta, color: "var(--sub)", fontSize: 14 }}>
          Elegí un modelo para editarlo o creá uno nuevo. Los cambios se usan la próxima vez que generes un escrito.
        </section>
      )}
      {actual && (
        <section style={tarjeta}>
          <label htmlFor="modelo-titulo"><span style={etiqueta}>Título</span>
            <input id="modelo-titulo" value={actual.titulo} onChange={e => cambiar("titulo", e.target.value)} style={campo} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <label htmlFor="modelo-cat"><span style={etiqueta}>Categoría</span>
              <select id="modelo-cat" value={actual.categoria} onChange={e => cambiar("categoria", e.target.value)} style={campo}>{CATEGORIAS_MODELO.map(c => <option key={c.k} value={c.k}>{c.l}</option>)}</select>
            </label>
            <label htmlFor="modelo-ambito"><span style={etiqueta}>Para</span>
              <select id="modelo-ambito" value={actual.ambito} onChange={e => cambiar("ambito", e.target.value)} style={campo}>{AMBITOS.map(c => <option key={c.k} value={c.k}>{c.l}</option>)}</select>
            </label>
            <label htmlFor="modelo-firma"><span style={etiqueta}>Firma</span>
              <select id="modelo-firma" value={actual.firma} onChange={e => cambiar("firma", e.target.value)} style={campo}>{FIRMAS.map(c => <option key={c.k} value={c.k}>{c.l}</option>)}</select>
            </label>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <input type="checkbox" checked={!!actual.membrete} onChange={e => cambiar("membrete", e.target.checked)} style={{ accentColor: "var(--accent)" }} />
            Pie con el logo de ATG Lex
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 14, alignItems: "start" }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8, minWidth: 0 }}>
              <label htmlFor="modelo-cuerpo"><span style={etiqueta}>Texto (cada Enter es un renglón; una línea en blanco separa párrafos)</span>
                <textarea id="modelo-cuerpo" ref={texto} value={actual.cuerpo} onChange={e => cambiar("cuerpo", e.target.value)} rows={18}
                  style={{ ...campo, fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.55, resize: "vertical" }} />
              </label>
              <div>
                <span style={etiqueta}>Insertar donde está el cursor</span>
                <div className="chips">{ATAJOS.map(a => <button key={a.l} type="button" className="chip" onClick={() => insertar(a.t)}>{a.l}</button>)}</div>
              </div>
              {CATALOGO_VARIABLES.map(g => (
                <details key={g.grupo}>
                  <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--sub)", fontWeight: 600 }}>{g.grupo}</summary>
                  <div className="chips" style={{ marginTop: 6 }}>
                    {g.vars.map(v => <button key={v} type="button" className="chip" onClick={() => insertar(`{{${v}}}`)} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{v}</button>)}
                  </div>
                </details>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8, minWidth: 0 }}>
              <label htmlFor="modelo-ejemplo"><span style={etiqueta}>Ver con un caso</span>
                <select id="modelo-ejemplo" value={casoEjemplo} onChange={e => setCasoEjemplo(e.target.value)} style={campo}>
                  <option value="">Sin caso (se ven las variables)</option>
                  {allCasos.slice().sort((a, b) => String(a.asegurado || "").localeCompare(String(b.asegurado || ""))).map(c => <option key={c.id} value={c.id}>{c.asegurado || "Sin nombre"}{c.patente ? ` · ${c.patente}` : ""}</option>)}
                </select>
              </label>
              <Hoja texto={previa} />
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Las preguntas se ven como [dato]: se contestan al generar.</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Boton variante="primario" icono="guardar" onClick={guardar} disabled={!cambios}>Guardar</Boton>
            {actual.id && <Boton onClick={duplicar}>Duplicar</Boton>}
            {actual.id && <Boton variante="fantasma" onClick={activar}>{actual.activo ? "Desactivar" : "Activar"}</Boton>}
            {actual.id && !actual.clave && <Boton variante="peligro" onClick={borrar}>Eliminar</Boton>}
            {aviso && <span role="status" style={{ fontSize: 13, color: aviso.error ? "var(--bad)" : "var(--ok)" }}>{aviso.error || aviso.ok}</span>}
          </div>
          {actual.clave && <div style={{ fontSize: 12, color: "var(--muted)" }}>Modelo base: se puede editar y desactivar, no eliminar.</div>}
        </section>
      )}
    </div>
  );
}
