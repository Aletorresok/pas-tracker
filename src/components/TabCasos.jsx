import { Fragment, useState, useMemo, useCallback, useEffect } from "react";
import { fmtMoney, diasDesde } from "../utils/formatters.js";
import { ESTADOS_CASO } from "../constants.js";
import { aplanarCasos, esActivo } from "../utils/metricas.js";
import Papelera from "./casos/Papelera.jsx";
import { useEsCelular } from "../hooks/useEsCelular.js";
import EstadoPill from "./ui/EstadoPill.jsx";
import Icono from "./ui/Icono.jsx";
import CasoOverlay from "./caso/CasoOverlay.jsx";
import FilaExpandida from "./casos/FilaExpandida.jsx";
import TableroCasos from "./casos/TableroCasos.jsx";
import { QUIEN, quienTiene } from "../utils/pelota.js";
import { propsMenu, abrirMenu } from "./ui/MenuContextual.jsx";
import { itemsCaso } from "../utils/menus.js";
import { useMoverCaso } from "./casos/useMoverCaso.jsx";
import Ilustracion from "./ui/Ilustracion.jsx";

const VISTA_GUARDADA = "pas_casos_vista";
const leerVista = () => { try { return localStorage.getItem(VISTA_GUARDADA) === "tablero" ? "tablero" : "tabla"; } catch { return "tabla"; } };
// Los filtros se recuerdan mientras la pestaña del navegador esté abierta (ir a otra sección y volver no los borra)
const FILTROS_GUARDADOS = "pas_casos_filtros";
const ORDEN_INICIAL = { k: "mov", desc: true };
const FILTROS_INICIALES = { busqueda: "", alcance: "activos", etapa: "", quien: "", faltan: false, orden: ORDEN_INICIAL };
const leerFiltros = () => { try { return { ...FILTROS_INICIALES, ...JSON.parse(sessionStorage.getItem(FILTROS_GUARDADOS) || "{}") }; } catch { return FILTROS_INICIALES; } };

const DIAS_QUIETO = 30;

// Monto que se muestra en la lista: acordado, si no ofrecido, si no reclamado
const montoCaso = c => Number(c.monto_acordado) || Number(c.monto_ofrecimiento) || Number(c.monto_reclamado) || 0;
const ultimoMov = c => c.fecha_ultimo_movimiento || c.fecha_derivacion || "";
const ORDEN_ESTADO = Object.fromEntries(ESTADOS_CASO.map((e, i) => [e.key, i]));

const COLUMNAS = [
  { k: "asegurado", l: "Asegurado", ancho: "34%", valor: c => (c.asegurado || "").toLowerCase() },
  { k: "estado", l: "Estado", ancho: "19%", valor: c => ORDEN_ESTADO[c.estado] ?? 99 },
  { k: "compania", l: "Compañía", ancho: "21%", valor: c => (c.compania_aseguradora || "").toLowerCase() },
  { k: "mov", l: "Últ. mov.", ancho: "13%", valor: ultimoMov },
  { k: "monto", l: "Monto", ancho: "13%", valor: montoCaso, derecha: true, ayuda: "Acordado; si no hay, el ofrecido; si no, el reclamado", alFinal: c => !montoCaso(c) },
];

function Movimiento({ caso }) {
  const iso = ultimoMov(caso);
  if (!iso) return <span style={{ color: "var(--muted)" }}>—</span>;
  const d = diasDesde(iso);
  const quieto = esActivo(caso) && d > DIAS_QUIETO;
  return (
    <span className="num" title={quieto ? `Sin movimiento hace ${d} días` : undefined}
      style={{ color: quieto ? "var(--warn)" : "var(--sub)", fontWeight: quieto ? 600 : 400 }}>
      {d <= 0 ? "hoy" : `hace ${d} d`}
    </span>
  );
}

// Búsqueda por asegurado, PAS, compañía, siniestro o patente (tabla y tablero)
function coincide(c, texto) {
  const q = texto.trim().toLowerCase();
  if (!q) return true;
  const qSinEspacios = q.replace(/\s/g, "");
  return (c.asegurado || "").toLowerCase().includes(q) ||
    (c._pasNombre || "").toLowerCase().includes(q) ||
    (c.compania_aseguradora || "").toLowerCase().includes(q) ||
    (c.nro_siniestro || "").toLowerCase().includes(q) ||
    (c.patente || "").toLowerCase().replace(/\s/g, "").includes(qSinEspacios);
}

// Datos que le faltan a un caso en curso: sin DNI el cliente no puede consultar su reclamo, sin teléfono no hay
// WhatsApp y sin monto reclamado no hay números (un monto de $1 es un relleno)
const digitos = v => String(v || "").replace(/\D/g, "");
const datosFaltantes = c => {
  if (!esActivo(c)) return [];
  const tel = digitos(c.telefono_asegurado).length >= 8 || digitos(c.tercero_contacto).length >= 8;
  return [!/\d{3}/.test(digitos(c.dni_asegurado)) && "DNI", !tel && "teléfono", !(Number(c.monto_reclamado) > 1) && "monto reclamado"].filter(Boolean);
};

export default function TabCasos({ pas, casos, onEliminarCaso, onRestaurarCaso, onCasoLocal, darkMode, pasManuales = [] }) {
  const [papelera, setPapelera] = useState(false);
  const esCelular = useEsCelular();
  const [inicial] = useState(leerFiltros);
  const [busqueda, setBusqueda] = useState(inicial.busqueda);
  // Filtros que se combinan: alcance (o una etapa puntual), a quién le toca y datos faltantes
  const [alcance, setAlcance] = useState(inicial.alcance); // activos | todos
  const [etapa, setEtapa] = useState(inicial.etapa); // "" | clave de ESTADOS_CASO
  const [quien, setQuien] = useState(inicial.quien); // "" | clave de QUIEN
  const [faltan, setFaltan] = useState(inicial.faltan);
  const [orden, setOrden] = useState(inicial.orden);
  const limpiarFiltros = () => { setAlcance("todos"); setEtapa(""); setQuien(""); setFaltan(false); };
  // Todo a cero: Activos, sin búsqueda ni filtros, orden por último movimiento
  const restablecer = () => { setBusqueda(""); setAlcance("activos"); setEtapa(""); setQuien(""); setFaltan(false); setOrden(ORDEN_INICIAL); };
  const cuantosFiltros = [busqueda.trim(), alcance !== "activos" && !etapa, etapa, quien, faltan, orden.k !== ORDEN_INICIAL.k || orden.desc !== ORDEN_INICIAL.desc].filter(Boolean).length;
  useEffect(() => {
    try { sessionStorage.setItem(FILTROS_GUARDADOS, JSON.stringify({ busqueda, alcance, etapa, quien, faltan, orden })); } catch { /* sin almacenamiento */ }
  }, [busqueda, alcance, etapa, quien, faltan, orden]);
  const [abiertoId, setAbiertoId] = useState(null);
  const [ficha, setFicha] = useState(null); // { caso, pasId }
  const [vista, setVista] = useState(leerVista); // tabla | tablero
  const elegirVista = v => { setVista(v); try { localStorage.setItem(VISTA_GUARDADA, v); } catch { /* sin almacenamiento */ } };

  const todosLosPas = useMemo(() => [...pas, ...pasManuales], [pas, pasManuales]);
  const allCasos = useMemo(() => aplanarCasos(casos, todosLosPas), [casos, todosLosPas]);

  // Cada filtro por separado; el número de un chip cuenta con todos los demás filtros puestos
  const pasaAlcance = useCallback(c => (etapa ? c.estado === etapa : alcance === "todos" || esActivo(c)), [etapa, alcance]);
  const pasaQuien = useCallback(c => !quien || quienTiene(c) === quien, [quien]);
  const pasaFaltan = useCallback(c => !faltan || datosFaltantes(c).length > 0, [faltan]);
  const pasaBusqueda = useCallback(c => coincide(c, busqueda), [busqueda]);

  const conteos = useMemo(() => {
    const sinAlcance = allCasos.filter(c => pasaQuien(c) && pasaFaltan(c) && pasaBusqueda(c));
    const sinQuien = allCasos.filter(c => pasaAlcance(c) && pasaFaltan(c) && pasaBusqueda(c));
    const c = {
      todos: sinAlcance.length, activos: sinAlcance.filter(esActivo).length,
      faltan: allCasos.filter(x => pasaAlcance(x) && pasaQuien(x) && pasaBusqueda(x) && datosFaltantes(x).length).length,
      hayFaltan: allCasos.some(x => datosFaltantes(x).length),
    };
    QUIEN.forEach(q => { c[`p_${q.k}`] = sinQuien.filter(x => quienTiene(x) === q.k).length; c[`hay_${q.k}`] = allCasos.some(x => quienTiene(x) === q.k); });
    ESTADOS_CASO.forEach(e => { c[e.key] = sinAlcance.filter(x => x.estado === e.key).length; c[`hay_${e.key}`] = allCasos.some(x => x.estado === e.key); });
    return c;
  }, [allCasos, pasaAlcance, pasaQuien, pasaFaltan, pasaBusqueda]);

  // Contra qué se cuenta el encabezado: "21 de 38 activos"
  const base = etapa
    ? { n: allCasos.filter(c => c.estado === etapa).length, l: `en ${ESTADOS_CASO.find(e => e.key === etapa)?.label || etapa}` }
    : alcance === "todos" ? { n: allCasos.length, l: "en total" } : { n: allCasos.filter(esActivo).length, l: "activos" };

  const filtrados = useMemo(() => {
    const lista = allCasos.filter(c =>
      c.id === abiertoId || // la fila abierta no desaparece aunque le cambies el estado
      (pasaAlcance(c) && pasaQuien(c) && pasaFaltan(c) && pasaBusqueda(c)));
    const col = COLUMNAS.find(x => x.k === orden.k);
    return [...lista].sort((a, b) => {
      // Los que no tienen el dato van siempre al final, en cualquier sentido
      const fa = !!col.alFinal?.(a), fb = !!col.alFinal?.(b);
      if (fa !== fb) return fa ? 1 : -1;
      const va = col.valor(a), vb = col.valor(b);
      const r = va < vb ? -1 : va > vb ? 1 : 0;
      return orden.desc ? -r : r;
    });
  }, [allCasos, pasaAlcance, pasaQuien, pasaFaltan, pasaBusqueda, orden, abiertoId]);

  const ordenarPor = k => setOrden(o => (o.k === k ? { k, desc: !o.desc } : { k, desc: k === "mov" || k === "monto" }));

  const handleDelete = async (caso) => {
    if (await onEliminarCaso(caso, caso._pasId)) setAbiertoId(null);
  };

  // Mover de etapa sin abrir nada (menú "Mover a" y la etiqueta de estado); cierra el resumen de ese caso si estaba abierto
  const { mover, ui: uiMover } = useMoverCaso({ todosLosPas, onCasoLocal: ({ _pasId, _pasNombre, ...limpio }) => onCasoLocal(_pasId, limpio) });
  const moverDesdeTabla = (c, estado) => { if (abiertoId === c.id) setAbiertoId(null); mover(c, estado); };
  const menuEtapas = (e, c) => abrirMenu(e, [{ titulo: "Mover a" }, ...ESTADOS_CASO.filter(x => x.key !== c.estado).map(x => ({ label: x.label, onClick: () => moverDesdeTabla(c, x.key) }))]);

  // Mismas acciones que en el resto de la app (utils/menus.js)
  const accionesCaso = { abrir: c => setFicha({ caso: c, pasId: c._pasId }), eliminar: handleDelete };
  const menuCaso = c => propsMenu(() => itemsCaso(c, {
    ...accionesCaso,
    resumen: vista === "tabla" && { label: abiertoId === c.id ? "Cerrar resumen" : "Ver resumen", onClick: () => alternar(c.id) },
    mover: { estados: ESTADOS_CASO, onMover: moverDesdeTabla },
  }));

  // Guarda en memoria el caso editado desde la fila (ya se guardó en Supabase)
  const casoEditado = useCallback((pasId) => (actualizado) => {
    const { _pasId, _pasNombre, ...limpio } = actualizado;
    onCasoLocal(pasId, limpio);
  }, [onCasoLocal]);

  // Con "Datos faltantes", tocar el caso abre la ficha directo en Datos (o en Montos, si solo falta el monto)
  const alternar = id => {
    const c = faltan && allCasos.find(x => x.id === id);
    if (c) { setFicha({ caso: c, pasId: c._pasId, pestana: datosFaltantes(c).some(f => f !== "monto reclamado") ? "datos" : "montos" }); return; }
    setAbiertoId(a => (a === id ? null : id));
  };

  // Un chip que daría 0 resultados se atenúa (salvo que ya esté puesto: así se puede sacar)
  const chip = (key, label, n, activo, onClick) => (
    <button key={key} type="button" onClick={onClick} aria-pressed={activo} className="chip" disabled={!n && !activo}>
      {label} <b className="num" style={{ color: "var(--text)" }}>{n}</b>
    </button>
  );
  const etapaInfo = ESTADOS_CASO.find(e => e.key === etapa);
  const faltantesDe = c => {
    const f = faltan ? datosFaltantes(c) : [];
    return f.length ? <span style={{ display: "block", fontSize: 12, color: "var(--warn)", fontWeight: 500, marginTop: 2 }}>Falta {f.join(" · ")}</span> : null;
  };

  const expandida = c => (
    <FilaExpandida
      key={`exp-${c.id}`}
      caso={c}
      pas={todosLosPas.find(p => String(p.id) === String(c._pasId))}
      onCasoLocal={casoEditado(c._pasId)}
      onAbrirFicha={() => setFicha({ caso: c, pasId: c._pasId })}
      onEliminar={() => handleDelete(c)}
    />
  );

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Casos PAS</h1>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {vista === "tabla" && <span style={{ fontSize: 13, color: "var(--muted)" }}>{filtrados.length} de {base.n} {base.l}</span>}
          <button type="button" onClick={() => setPapelera(true)} title="Casos eliminados en los últimos 30 días"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "inherit", fontSize: 13, padding: "5px 10px", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", background: "var(--card)", color: "var(--sub)", cursor: "pointer" }}>
            <Icono nombre="papelera" size={15} />Papelera
          </button>
          <span role="group" aria-label="Vista" className="segmentado">
            {[["tabla", "Tabla"], ["tablero", "Tablero"]].map(([k, l]) => (
              <button key={k} type="button" aria-pressed={vista === k} onClick={() => elegirVista(k)}
>{l}</button>
            ))}
          </span>
        </span>
      </header>

      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex" }}><Icono nombre="buscar" size={16} /></span>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label="Buscar casos"
          onKeyDown={e => { if (e.key === "Escape" && busqueda) { e.preventDefault(); setBusqueda(""); } }}
          placeholder="Buscar por asegurado, patente, PAS, compañía o siniestro…"
          style={{ width: "100%", boxSizing: "border-box", padding: `10px ${busqueda ? 36 : 12}px 10px 36px`, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
        {busqueda && (
          <button type="button" onClick={() => setBusqueda("")} aria-label="Borrar búsqueda" title="Borrar búsqueda (Esc)"
            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 6, cursor: "pointer", color: "var(--muted)", display: "flex", borderRadius: "var(--r-xs)" }}>
            <Icono nombre="cerrar" size={15} />
          </button>
        )}
      </div>

      {vista === "tablero" && (
        <TableroCasos
          casos={allCasos.filter(c => esActivo(c) && coincide(c, busqueda))}
          todosLosPas={todosLosPas}
          onAbrir={c => setFicha({ caso: c, pasId: c._pasId })}
          acciones={accionesCaso}
          onCasoLocal={c => casoEditado(c._pasId)(c)} />
      )}

      {vista === "tabla" && <>
      <div className="chips" style={{ alignItems: "center" }}>
        {chip("activos", "Activos", conteos.activos, !etapa && alcance === "activos", () => { setAlcance("activos"); setEtapa(""); })}
        {chip("todos", "Todos", conteos.todos, !etapa && alcance === "todos", () => { setAlcance("todos"); setEtapa(""); })}
        <span className="chip" aria-pressed={!!etapa} style={{ padding: 0, position: "relative" }}>
          {etapaInfo && <span aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 7, height: 7, borderRadius: "50%", background: etapaInfo.color }} />}
          <select value={etapa} onChange={e => setEtapa(e.target.value)} aria-label="Etapa"
            style={{ border: "none", background: "transparent", color: "inherit", font: "inherit", padding: `6px 8px 6px ${etapaInfo ? 24 : 14}px`, borderRadius: "var(--r-pill)", cursor: "pointer", boxShadow: "none", fieldSizing: "content" }}>
            <option value="">Etapa: todas</option>
            {ESTADOS_CASO.filter(e => conteos[`hay_${e.key}`]).map(e => <option key={e.key} value={e.key} disabled={!conteos[e.key] && etapa !== e.key}>{e.label} ({conteos[e.key]})</option>)}
          </select>
        </span>
        {conteos.hayFaltan && chip("faltan", "Datos faltantes", conteos.faltan, faltan, () => setFaltan(v => !v))}
        {cuantosFiltros > 0 && (
          <button type="button" onClick={restablecer} title="Volver a Activos, sin búsqueda ni filtros"
            style={{ marginLeft: "auto", background: "none", border: "none", padding: "6px 4px", font: "inherit", fontSize: 13, fontWeight: 600, color: "var(--accent-ink)", cursor: "pointer" }}>
            Limpiar ({cuantosFiltros})
          </button>
        )}
      </div>
      <div className="chips" role="group" aria-label="A quién le toca" style={{ alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--muted)", flex: "none", marginRight: 2 }}>A quién le toca</span>
        {QUIEN.filter(q => conteos[`hay_${q.k}`]).map(q => chip(`p_${q.k}`, q.corto, conteos[`p_${q.k}`], quien === q.k, () => setQuien(v => (v === q.k ? "" : q.k))))}
      </div>
      {faltan && <div style={{ fontSize: 12, color: "var(--sub)" }}>Tocá un caso para completar lo que falta en su ficha.</div>}

      {filtrados.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--sub)", fontSize: 14 }}>
          <Ilustracion nombre="lupa" size={72} style={{ margin: "0 auto 8px" }} />
          Ningún caso coincide.{" "}
          <button type="button" onClick={() => { limpiarFiltros(); setBusqueda(""); }} style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Ver todos</button>
        </div>
      )}

      {/* ── Celular: filas de dos líneas ── */}
      {esCelular && filtrados.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", overflow: "hidden" }}>
          {filtrados.map((c, i) => (
            <Fragment key={c.id}>
              <button type="button" onClick={() => alternar(c.id)} {...menuCaso(c)} aria-expanded={abiertoId === c.id}
                style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "4px 10px", padding: "11px 14px", background: abiertoId === c.id ? "var(--card2)" : "none", border: "none", borderTop: i ? "1px solid var(--border)" : "none", textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit" }}>
                <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.asegurado || "Sin nombre"}</span>
                <span className="num" style={{ fontSize: 14, fontWeight: 600 }}>{montoCaso(c) ? fmtMoney(montoCaso(c)) : ""}</span>
                <span style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                  <EstadoPill estado={c.estado} size="sm" />
                  <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.compania_aseguradora || ""}</span>
                </span>
                <span style={{ fontSize: 12 }}><Movimiento caso={c} /></span>
                {faltan && <span style={{ gridColumn: "1 / -1" }}>{faltantesDe(c)}</span>}
              </button>
              {abiertoId === c.id && <div style={{ background: "var(--card2)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>{expandida(c)}</div>}
            </Fragment>
          ))}
        </div>
      )}

      {/* ── Compu: tabla ── */}
      {!esCelular && filtrados.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 14 }}>
            <colgroup>{COLUMNAS.map(c => <col key={c.k} style={{ width: c.ancho }} />)}</colgroup>
            <thead>
              <tr>
                {COLUMNAS.map(col => {
                  const activa = orden.k === col.k;
                  return (
                    <th key={col.k} scope="col" aria-sort={activa ? (orden.desc ? "descending" : "ascending") : "none"}
                      style={{ padding: 0, background: "var(--card2)", borderBottom: "1px solid var(--border)", textAlign: col.derecha ? "right" : "left" }}>
                      <button type="button" onClick={() => ordenarPor(col.k)} title={col.ayuda} className="th-orden"
                        style={{ width: "100%", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, color: activa ? "var(--text)" : "var(--muted)", textAlign: col.derecha ? "right" : "left" }}>
                        {col.l}<span aria-hidden="true" className={activa ? undefined : "th-flecha"} style={{ marginLeft: 4 }}>{activa ? (orden.desc ? "↓" : "↑") : "↕"}</span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => {
                const abierto = abiertoId === c.id;
                const celda = { padding: "10px 14px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: abierto ? "var(--card2)" : undefined };
                return (
                  <Fragment key={c.id}>
                    <tr onClick={() => alternar(c.id)} {...menuCaso(c)} style={{ cursor: "pointer" }} className="fila-caso">
                      <td style={celda}>
                        <button type="button" aria-expanded={abierto} onClick={e => { e.stopPropagation(); alternar(c.id); }}
                          style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--text)", fontWeight: 600, cursor: "pointer", textAlign: "left", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.asegurado || "Sin nombre"}
                        </button>
                        {c.patente && <span style={{ marginLeft: 8, fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)" }}>{c.patente}</span>}
                        {faltantesDe(c)}
                      </td>
                      <td style={celda}>
                        <button type="button" onClick={e => menuEtapas(e, c)} aria-haspopup="menu" title="Mover a otra etapa"
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", display: "inline-flex", alignItems: "center", gap: 4, color: "var(--muted)" }}>
                          <EstadoPill estado={c.estado} size="sm" /><span aria-hidden="true" style={{ fontSize: 10 }}>▾</span>
                        </button>
                      </td>
                      <td style={{ ...celda, color: "var(--sub)" }}>{c.compania_aseguradora || "—"}</td>
                      <td style={{ ...celda, fontSize: 13 }}><Movimiento caso={c} /></td>
                      <td className="num" style={{ ...celda, textAlign: "right", fontWeight: 500 }}>{montoCaso(c) ? fmtMoney(montoCaso(c)) : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                    </tr>
                    {abierto && (
                      <tr>
                        <td colSpan={COLUMNAS.length} style={{ padding: 0, background: "var(--card2)", borderBottom: "1px solid var(--border)" }}>
                          {expandida(c)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      </>}

      {ficha && (
        <CasoOverlay
          caso={ficha.caso} pasId={ficha.pasId} pestanaInicial={ficha.pestana} casos={casos} todosLosPas={todosLosPas}
          onCasoLocal={onCasoLocal} darkMode={darkMode}
          onCambio={updated => setFicha(f => ({ ...f, caso: { ...updated, _pasId: f.pasId } }))}
          onEliminarCaso={onEliminarCaso}
          onClose={() => { setFicha(null); setAbiertoId(null); }}
        />
      )}
      {uiMover}
      {papelera && <Papelera todosLosPas={todosLosPas} onRestaurar={onRestaurarCaso} onClose={() => setPapelera(false)} />}
    </div>
  );
}
