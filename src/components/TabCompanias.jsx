import { useMemo, useState } from "react";
import { useDirectorio, faltantes, textoParaEscrito } from "../utils/companias.js";
import { abrirCompania } from "../utils/companiaAbierta.js";
import { esActivo } from "../utils/metricas.js";
import { itemsCompania, copiar } from "../utils/menus.js";
import { propsMenu } from "./ui/MenuContextual.jsx";
import { useEsCelular } from "../hooks/useEsCelular.js";
import Boton from "./ui/Boton.jsx";
import Icono from "./ui/Icono.jsx";

// Botón de copiar que confirma con un tilde un momento
function Copiar({ texto, etiqueta, children, className = "solo-hover", estilo }) {
  const [ok, setOk] = useState(false);
  const click = e => { e.stopPropagation(); copiar(texto); setOk(true); setTimeout(() => setOk(false), 1500); };
  return (
    <button type="button" onClick={click} aria-label={etiqueta} title={etiqueta} className={className}
      style={{ background: "none", border: "none", padding: 3, cursor: "pointer", color: ok ? "var(--ok)" : "var(--accent-ink)", display: "inline-flex", alignItems: "center", gap: 4, flex: "none", borderRadius: "var(--r-xs)", font: "inherit", fontSize: 12, fontWeight: 600, ...estilo }}>
      <Icono nombre={ok ? "check" : "copiar"} size={14} />{children && (ok ? "Copiado" : children)}
    </button>
  );
}

// Directorio de compañías: una ficha por aseguradora con datos fiscales, domicilios, contactos y condiciones.
// Lista las que ya tienen ficha y las que aparecen en algún caso aunque todavía no la tengan.
export default function TabCompanias({ allCasos = [] }) {
  const dir = useDirectorio();
  const esCelular = useEsCelular();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("activas"); // abre en las que tienen casos en curso
  const recortado = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

  const lista = useMemo(() => {
    if (!dir) return [];
    const porNombre = new Map();
    const clave = n => n.trim().toLowerCase();
    Object.values(dir.fichas).forEach(f => porNombre.set(clave(f.compania), { nombre: f.compania, ficha: f, casos: 0, activos: 0 }));
    allCasos.forEach(c => {
      const n = (c.compania_aseguradora || "").trim();
      if (!n) return;
      const x = porNombre.get(clave(n)) || { nombre: n, ficha: null, casos: 0, activos: 0 };
      x.casos++; if (esActivo(c)) x.activos++;
      porNombre.set(clave(n), x);
    });
    return [...porNombre.values()].map(x => ({
      ...x,
      contactos: dir.contactos.filter(c => c.compania === x.ficha?.compania),
      falta: faltantes(x.ficha),
    }));
  }, [dir, allCasos]);

  // "Ficha incompleta" cuenta solo las que tienen casos en curso: son las que se usan en escritos y cartas
  // (del directorio de la SSN casi ninguna tiene domicilio y marcarlas todas no ayuda a priorizar)
  const FILTROS = [
    { k: "activas", l: "Con casos en curso", f: x => x.activos > 0 },
    { k: "incompletas", l: "Ficha incompleta", f: x => x.activos > 0 && x.falta.length > 0 },
    { k: "todas", l: "Todas", f: () => true },
  ];

  const visibles = useMemo(() => {
    const f = FILTROS.find(x => x.k === filtro).f;
    const q = busqueda.trim().toLowerCase();
    // Buscando, aparecen todas
    return lista.filter(q ? () => true : f)
      .filter(x => !q || [x.nombre, x.ficha?.razon_social, x.ficha?.cuit].some(v => (v || "").toLowerCase().includes(q)))
      .sort((a, b) => b.activos - a.activos || b.casos - a.casos || a.nombre.localeCompare(b.nombre, "es"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, filtro, busqueda]);

  const incompletasActivas = lista.filter(x => x.activos > 0 && x.falta.length).length;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Compañías</h1>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Datos fiscales, domicilios y contactos. Los usan los escritos, las cartas documento y la ficha de cada caso.</div>
        </div>
        <Boton variante="primario" icono="agregar" onClick={() => abrirCompania(null)}>Nueva compañía</Boton>
      </header>

      {dir?.faltaSql && (
        <div role="alert" style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--warn) 10%, transparent)", color: "var(--warn)", fontSize: 13 }}>
          Falta correr el SQL 30 (<code>sql/2026-09-28_30_companias.sql</code>) en Supabase para guardar razón social, CUIT y contactos.
        </div>
      )}
      {!dir?.faltaSql && incompletasActivas > 0 && (
        <div style={{ fontSize: 13, color: "var(--sub)" }}>
          <b style={{ color: "var(--warn)" }}>{incompletasActivas}</b> {incompletasActivas === 1 ? "compañía con casos en curso tiene" : "compañías con casos en curso tienen"} la ficha incompleta.
        </div>
      )}

      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex" }}><Icono nombre="buscar" size={16} /></span>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label="Buscar compañías" placeholder="Buscar por nombre, razón social o CUIT…"
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 }} />
      </div>

      <div className="chips">
        {FILTROS.filter(f => f.k !== "incompletas" || incompletasActivas > 0 || filtro === f.k).map(f => (
          <button key={f.k} type="button" className="chip" aria-pressed={filtro === f.k} onClick={() => setFiltro(f.k)}>
            {f.l} <b className="num">{lista.filter(f.f).length}</b>
          </button>
        ))}
      </div>

      {!dir && <div style={{ padding: 24, color: "var(--muted)", fontSize: 14 }}>Cargando compañías…</div>}
      {dir && !visibles.length && <div style={{ textAlign: "center", padding: 32, color: "var(--sub)", fontSize: 14 }}>Ninguna compañía coincide.</div>}

      {visibles.length > 0 && (
        <div className="tarjeta" style={{ overflow: "hidden" }}>
          {!esCelular && (
            <div className="fila-cia" style={{ display: "grid", gap: 12, padding: "9px 16px", background: "var(--card2)", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em", color: "var(--muted)" }}>
              <span>Compañía</span><span>Razón social</span><span>CUIT</span><span style={{ textAlign: "right" }}>En curso</span><span style={{ textAlign: "right" }}>Total</span><span>Ficha</span><span className="col-acciones" />
            </div>
          )}
          {visibles.map((x, i) => esCelular ? (
            <button key={x.nombre} type="button" className="fila-caso" onClick={() => abrirCompania(x.nombre)}
              {...propsMenu(() => itemsCompania(x.nombre, x.ficha || {}, x.contactos))}
              style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "3px 10px", alignItems: "center",
                padding: "12px 16px", background: "none", border: "none", borderTop: i ? "1px solid var(--border)" : "none", textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit", fontSize: 14 }}>
              <span style={{ fontWeight: 600, ...recortado }}>{x.nombre}</span>
              <span>{x.falta.length ? <span className="cia-falta">Falta {x.falta[0]}</span> : null}</span>
              <span className="num" style={{ fontSize: 13, color: "var(--sub)" }}>
                {x.activos ? <b style={{ color: "var(--text)" }}>{x.activos}</b> : "0"} en curso de {x.casos}{x.contactos.length ? ` · ${x.contactos.length} contactos` : ""}
              </span>
            </button>
          ) : (
            // Tocar la fila abre la ficha (el nombre es el botón para el teclado); copiar no la abre
            <div key={x.nombre} className="fila-cia fila-hover" onClick={() => abrirCompania(x.nombre)}
              {...propsMenu(() => itemsCompania(x.nombre, x.ficha || {}, x.contactos))}
              style={{ display: "grid", gap: 12, alignItems: "center", padding: "10px 16px", borderTop: i ? "1px solid var(--border)" : "none", cursor: "pointer", fontSize: 14 }}>
              <button type="button" onClick={e => { e.stopPropagation(); abrirCompania(x.nombre); }}
                style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 600, color: "var(--text)", cursor: "pointer", textAlign: "left", minWidth: 0, ...recortado }}>{x.nombre}</button>
              <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, fontSize: 13, color: "var(--sub)" }}>
                <span title={x.ficha?.razon_social || undefined} style={recortado}>{x.ficha?.razon_social || ""}</span>
                {x.ficha?.razon_social && <Copiar texto={x.ficha.razon_social} etiqueta="Copiar razón social" />}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                {x.ficha?.cuit && <><span style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{x.ficha.cuit}</span><Copiar texto={x.ficha.cuit} etiqueta="Copiar CUIT" /></>}
              </span>
              <span className="num" style={{ textAlign: "right", fontWeight: x.activos ? 600 : 400, color: x.activos ? "var(--text)" : "var(--muted)" }}>{x.activos || ""}</span>
              <span className="num" style={{ textAlign: "right", color: "var(--sub)" }}>{x.casos || ""}</span>
              <span>{x.falta.length > 0 && <span className="cia-falta" title={`Falta: ${x.falta.join(", ")}`}>Falta {x.falta.length === 1 ? x.falta[0] : `${x.falta.length} datos`}</span>}</span>
              <span className="col-acciones" style={{ textAlign: "right" }}>
                {x.ficha?.razon_social && <Copiar texto={textoParaEscrito(x.ficha, x.nombre)} etiqueta="Copiar razón social, CUIT y domicilio para un escrito">Para escrito</Copiar>}
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 12, color: "var(--muted)" }}>Tocá una compañía para ver su ficha. Al pasar el mouse: copiar razón social, CUIT o el bloque para un escrito. Click derecho: más opciones.</div>
    </div>
  );
}
