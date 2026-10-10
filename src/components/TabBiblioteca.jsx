import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  TIPOS_BIBLIOTECA, TEMAS_BIBLIOTECA, JURISDICCIONES_BIBLIOTECA, RESULTADOS_BIBLIOTECA, colorResultado,
  cargarBiblioteca, guardarEnBiblioteca, borrarDeBiblioteca, filtrarBiblioteca, detalleBiblioteca, citaBiblioteca, contarPor,
} from "../utils/biblioteca.js";
import { itemsBiblioteca, copiar } from "../utils/menus.js";
import { propsMenu } from "./ui/MenuContextual.jsx";
import { useEsCelular } from "../hooks/useEsCelular.js";
import FormularioBiblioteca from "./biblioteca/FormularioBiblioteca.jsx";
import Boton from "./ui/Boton.jsx";
import Icono from "./ui/Icono.jsx";
import Ilustracion from "./ui/Ilustracion.jsx";

const CLAVE_FILTROS = "biblioteca_filtros";
const leerFiltros = () => { try { return JSON.parse(sessionStorage.getItem(CLAVE_FILTROS)) || {}; } catch { return {}; } };
const recortado = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

function Resultado({ r }) {
  if (!r) return null;
  return <span style={{ fontSize: 12, fontWeight: 600, color: colorResultado(r), whiteSpace: "nowrap" }}>{RESULTADOS_BIBLIOTECA.find(x => x.k === r)?.l}</span>;
}

// Ficha de un registro: datos, sumario, temas, notas y acciones
function Ficha({ x, onEditar, onFavorito, onEliminar, onCerrar }) {
  const [copiado, setCopiado] = useState("");
  const copiarCon = (texto, que) => { copiar(texto); setCopiado(que); setTimeout(() => setCopiado(""), 1500); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{TIPOS_BIBLIOTECA.find(t => t.k === x.tipo)?.uno}</span>
        <span style={{ display: "flex", gap: 4 }}>
          <button type="button" onClick={() => onFavorito(x)} aria-label={x.favorito ? "Quitar de favoritos" : "Marcar como favorito"} aria-pressed={!!x.favorito} title="Favorito"
            style={{ width: 36, height: 36, borderRadius: "var(--r-pill)", border: "none", background: "var(--card2)", color: x.favorito ? "var(--accent)" : "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icono nombre="estrella" size={16} /></button>
          {onCerrar && <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ width: 36, height: 36, borderRadius: "var(--r-pill)", border: "none", background: "var(--card2)", color: "var(--sub)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icono nombre="cerrar" size={16} /></button>}
        </span>
      </div>
      <h2 style={{ margin: 0, fontSize: 17, lineHeight: 1.35 }}>{x.titulo}</h2>
      <div style={{ fontSize: 13, color: "var(--sub)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span>{detalleBiblioteca(x)}</span><Resultado r={x.resultado} />
      </div>
      {x.sumario && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-line" }}>{x.sumario}</p>}
      {x.temas?.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{x.temas.map(t => <span key={t} style={{ fontSize: 12, background: "var(--card2)", borderRadius: "var(--r-pill)", padding: "3px 10px" }}>{t}</span>)}</div>
      )}
      {x.notas && <div style={{ fontSize: 13, background: "color-mix(in srgb, var(--accent) 8%, var(--card))", borderRadius: "var(--r-sm)", padding: "10px 12px", whiteSpace: "pre-line" }}><b>Notas:</b> {x.notas}</div>}
      <div style={{ background: "var(--card2)", borderRadius: "var(--r-sm)", padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.5, color: "var(--sub)", wordBreak: "break-word" }}>{citaBiblioteca(x)}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Boton variante="primario" tamaño="sm" icono={copiado === "cita" ? "check" : "copiar"} onClick={() => copiarCon(citaBiblioteca(x), "cita")}>{copiado === "cita" ? "Copiada" : "Copiar cita"}</Boton>
        {x.sumario && <Boton tamaño="sm" icono={copiado === "sumario" ? "check" : "copiar"} onClick={() => copiarCon(x.sumario, "sumario")}>{copiado === "sumario" ? "Copiado" : x.tipo === "fallo" ? "Copiar sumario" : "Copiar resumen"}</Boton>}
        {x.url && <Boton tamaño="sm" icono="externo" onClick={() => window.open(x.url, "_blank", "noopener")}>Abrir la fuente</Boton>}
        <Boton tamaño="sm" variante="fantasma" onClick={() => onEditar(x)}>Editar</Boton>
        <Boton tamaño="sm" variante="fantasma" onClick={() => onEliminar(x)} style={{ color: "var(--bad)" }}>Eliminar</Boton>
      </div>
      {x.origen === "relevamiento" && <div style={{ fontSize: 12, color: "var(--muted)" }}>Verificado en la fuente oficial{x.verificado_el ? ` el ${x.verificado_el.split("-").reverse().join("/")}` : ""}. {x.tipo === "fallo" ? "El sumario es una síntesis propia: antes de citarlo, abrí la fuente." : x.tipo === "doctrina" ? "El resumen es propio: antes de citarlo, abrí la fuente." : "El texto es un resumen propio: antes de citarlo, abrí la norma."}</div>}
    </div>
  );
}

// Biblioteca: jurisprudencia, doctrina y normas para los escritos. Buscar, filtrar por tema y copiar la cita.
export default function TabBiblioteca({ cargarNuevo = 0 }) {
  const esCelular = useEsCelular();
  const [lista, setLista] = useState(undefined); // undefined = cargando, null = falta el SQL 46
  const inicio = leerFiltros();
  const [tipo, setTipo] = useState(inicio.tipo || "fallo");
  const [busqueda, setBusqueda] = useState("");
  const [tema, setTema] = useState(inicio.tema || "");
  const [jurisdiccion, setJurisdiccion] = useState(inicio.jurisdiccion || "");
  const [resultado, setResultado] = useState(inicio.resultado || "");
  const [favoritos, setFavoritos] = useState(!!inicio.favoritos);
  const [elegidoId, setElegidoId] = useState(null);
  const [form, setForm] = useState(null); // null | { inicial } | { nuevo: true }

  useEffect(() => { cargarBiblioteca().then(setLista); }, []);
  useEffect(() => { if (cargarNuevo) setForm({ nuevo: true }); }, [cargarNuevo]);
  useEffect(() => {
    try { sessionStorage.setItem(CLAVE_FILTROS, JSON.stringify({ tipo, tema, jurisdiccion, resultado, favoritos })); } catch { /* sin sessionStorage */ }
  }, [tipo, tema, jurisdiccion, resultado, favoritos]);

  const filtros = { tipo, busqueda, tema, jurisdiccion: tipo === "fallo" ? jurisdiccion : "", resultado: tipo === "fallo" ? resultado : "", favoritos };
  const visibles = useMemo(() => (lista ? filtrarBiblioteca(lista, filtros) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lista, tipo, busqueda, tema, jurisdiccion, resultado, favoritos]);
  const elegido = lista?.find(x => x.id === elegidoId) || (!esCelular ? visibles[0] : null);
  const hayFiltros = tema || busqueda || favoritos || (tipo === "fallo" && (jurisdiccion || resultado));
  const limpiar = () => { setTema(""); setBusqueda(""); setFavoritos(false); setJurisdiccion(""); setResultado(""); };

  const reemplazar = r => setLista(l => (l.some(x => x.id === r.id) ? l.map(x => (x.id === r.id ? r : x)) : [...l, r]));
  const favorito = async x => { const r = await guardarEnBiblioteca({ id: x.id, favorito: !x.favorito, temas: x.temas }); if (r.data) reemplazar(r.data); };
  const eliminar = async x => {
    if (!window.confirm(`¿Eliminar "${x.titulo}" de la Biblioteca?`)) return;
    const error = await borrarDeBiblioteca(x.id);
    if (error) { window.alert("No se pudo eliminar: " + error); return; }
    setLista(l => l.filter(y => y.id !== x.id)); if (elegidoId === x.id) setElegidoId(null);
  };
  const acciones = { abrir: x => setElegidoId(x.id), editar: x => setForm({ inicial: x }), favorito, eliminar, cita: citaBiblioteca };
  const temasDelTipo = [...new Set([...TEMAS_BIBLIOTECA, ...(lista || []).filter(x => x.tipo === tipo).flatMap(x => x.temas || [])])];
  const ficha = elegido && <Ficha key={elegido.id} x={elegido} onEditar={acciones.editar} onFavorito={favorito} onEliminar={eliminar} onCerrar={esCelular ? () => setElegidoId(null) : null} />;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Biblioteca</h1>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Jurisprudencia, doctrina y normas para los escritos. Buscá, filtrá por tema y copiá la cita.</div>
        </div>
        <Boton variante="primario" icono="agregar" onClick={() => setForm({ nuevo: true })}>Cargar</Boton>
      </header>

      {lista === null && (
        <div role="alert" style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--warn) 10%, transparent)", color: "var(--warn)", fontSize: 13 }}>
          Falta correr el SQL 46 (<code>sql/2026-10-07_46_biblioteca.sql</code>) en Supabase y después los tres <code>datos_2026-10-07_biblioteca_*.sql</code>.
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div className="segmentado" role="group" aria-label="Tipo">
          {TIPOS_BIBLIOTECA.map(t => (
            <button key={t.k} type="button" aria-pressed={tipo === t.k} onClick={() => { setTipo(t.k); setElegidoId(null); }}>
              {t.l} <span className="num" style={{ color: "var(--muted)" }}>{(lista || []).filter(x => x.tipo === t.k).length}</span>
            </button>
          ))}
        </div>
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex" }}><Icono nombre="buscar" size={16} /></span>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={e => { if (e.key === "Escape") setBusqueda(""); }}
            aria-label="Buscar en la Biblioteca" placeholder="Buscar: carátula, tribunal, autor o palabras del sumario…"
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 }} />
        </div>
      </div>

      <div className="chips" role="group" aria-label="Tema">
        <button type="button" className="chip" aria-pressed={!tema} onClick={() => setTema("")}>Todos los temas</button>
        {temasDelTipo.map(t => { const n = contarPor(lista || [], filtros, "tema", t); return (
          <button key={t} type="button" className="chip" aria-pressed={tema === t} disabled={!n && tema !== t} onClick={() => setTema(tema === t ? "" : t)}>{t} <b className="num">{n}</b></button>
        ); })}
      </div>
      <div className="chips" role="group" aria-label="Más filtros">
        {tipo === "fallo" && JURISDICCIONES_BIBLIOTECA.map(j => { const n = contarPor(lista || [], filtros, "jurisdiccion", j.k); return (n > 0 || jurisdiccion === j.k) && (
          <button key={j.k} type="button" className="chip" aria-pressed={jurisdiccion === j.k} onClick={() => setJurisdiccion(jurisdiccion === j.k ? "" : j.k)}>{j.l} <b className="num">{n}</b></button>
        ); })}
        {tipo === "fallo" && RESULTADOS_BIBLIOTECA.map(r => (
          <button key={r.k} type="button" className="chip" aria-pressed={resultado === r.k} onClick={() => setResultado(resultado === r.k ? "" : r.k)}>{r.l} <b className="num">{contarPor(lista || [], filtros, "resultado", r.k)}</b></button>
        ))}
        <button type="button" className="chip" aria-pressed={favoritos} onClick={() => setFavoritos(f => !f)}><Icono nombre="estrella" size={13} /> Favoritos</button>
        {hayFiltros && <button type="button" className="chip" onClick={limpiar}>Limpiar</button>}
      </div>

      {lista === undefined && <div style={{ padding: 24, color: "var(--muted)", fontSize: 14 }}>Cargando la Biblioteca…</div>}
      {lista && !visibles.length && <div style={{ textAlign: "center", padding: 32, color: "var(--sub)", fontSize: 14 }}><Ilustracion nombre={lista.length ? "lupa" : "libros"} size={72} style={{ margin: "0 auto 8px" }} />{lista.length ? "Nada coincide con la búsqueda." : "Todavía no hay nada cargado."}</div>}

      {visibles.length > 0 && (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div className="tarjeta" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <div style={{ padding: "8px 16px", fontSize: 12, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>{visibles.length} {visibles.length === 1 ? "resultado" : "resultados"}</div>
            {visibles.map((x, i) => {
              const activo = !esCelular && elegido?.id === x.id;
              return (
                <button key={x.id} type="button" className="fila-caso" onClick={() => setElegidoId(x.id)} {...propsMenu(() => itemsBiblioteca(x, acciones))}
                  aria-current={activo || undefined}
                  style={{ width: "100%", display: "flex", flexDirection: "column", gap: 3, padding: "12px 16px", border: "none", borderTop: i ? "1px solid var(--border)" : "none", textAlign: "left", cursor: "pointer", font: "inherit", color: "var(--text)",
                    background: activo ? "color-mix(in srgb, var(--accent) 10%, var(--card))" : "none", boxShadow: activo ? "inset 3px 0 0 var(--accent)" : "none" }}>
                  <span style={{ display: "flex", gap: 8, alignItems: "baseline", minWidth: 0 }}>
                    {x.favorito && <span style={{ color: "var(--accent)", display: "flex", flex: "none" }}><Icono nombre="estrella" size={13} /></span>}
                    <b style={{ fontSize: 14, ...recortado, flex: 1, minWidth: 0 }}>{x.titulo}</b>
                    <Resultado r={x.resultado} />
                  </span>
                  <span style={{ fontSize: 12, color: "var(--sub)", ...recortado }}>{detalleBiblioteca(x)}</span>
                  {x.sumario && <span style={{ fontSize: 13, color: "var(--sub)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{x.sumario}</span>}
                </button>
              );
            })}
          </div>
          {!esCelular && elegido && <aside className="tarjeta" style={{ width: 420, flex: "none", padding: 20, position: "sticky", top: 16, maxHeight: "calc(100vh - 40px)", overflowY: "auto", boxSizing: "border-box" }}>{ficha}</aside>}
        </div>
      )}
      <div style={{ fontSize: 12, color: "var(--muted)" }}>Tocá un registro para ver la ficha y copiar la cita. Click derecho: más opciones.</div>

      {esCelular && elegido && createPortal(
        <div onClick={() => setElegidoId(null)} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-end" }}>
          <div role="dialog" aria-modal="true" aria-label={elegido.titulo} onClick={e => e.stopPropagation()}
            style={{ background: "var(--card)", width: "100%", maxHeight: "88vh", overflowY: "auto", borderRadius: "var(--r-lg) var(--r-lg) 0 0", padding: 20, boxSizing: "border-box", boxShadow: "var(--sh-3)" }}>{ficha}</div>
        </div>, document.body)}

      {form && <FormularioBiblioteca inicial={form.inicial} tipoInicial={tipo} onCerrar={() => setForm(null)}
        onGuardado={r => { reemplazar(r); setForm(null); setTipo(r.tipo); setElegidoId(r.id); }} />}
    </div>
  );
}
