import { Fragment, useState, useMemo, useCallback } from "react";
import { fmtMoney, diasDesde } from "../utils/formatters.js";
import { ESTADOS_CASO } from "../constants.js";
import { aplanarCasos, esActivo } from "../utils/metricas.js";
import { deleteCaso } from "../utils/storage.js";
import { useEsCelular } from "../hooks/useEsCelular.js";
import EstadoPill from "./ui/EstadoPill.jsx";
import Icono from "./ui/Icono.jsx";
import CasoOverlay from "./caso/CasoOverlay.jsx";
import FilaExpandida from "./casos/FilaExpandida.jsx";

const DIAS_QUIETO = 30;

// Monto que se muestra en la lista: acordado, si no ofrecido, si no reclamado
const montoCaso = c => Number(c.monto_acordado) || Number(c.monto_ofrecimiento) || Number(c.monto_reclamado) || 0;
const ultimoMov = c => c.fecha_ultimo_movimiento || c.fecha_derivacion || "";
const ORDEN_ESTADO = Object.fromEntries(ESTADOS_CASO.map((e, i) => [e.key, i]));

const COLUMNAS = [
  { k: "asegurado", l: "Asegurado", ancho: "27%", valor: c => (c.asegurado || "").toLowerCase() },
  { k: "estado", l: "Estado", ancho: "17%", valor: c => ORDEN_ESTADO[c.estado] ?? 99 },
  { k: "pas", l: "PAS", ancho: "18%", valor: c => (c._pasNombre || "").toLowerCase() },
  { k: "compania", l: "Compañía", ancho: "16%", valor: c => (c.compania_aseguradora || "").toLowerCase() },
  { k: "mov", l: "Últ. mov.", ancho: "11%", valor: ultimoMov },
  { k: "monto", l: "Monto", ancho: "11%", valor: montoCaso, derecha: true },
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

export default function TabCasos({ pas, casos, onSaveCasos, onCasoLocal, darkMode, pasManuales = [] }) {
  const esCelular = useEsCelular();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("activos"); // activos | todos | <estado>
  const [orden, setOrden] = useState({ k: "mov", desc: true });
  const [abiertoId, setAbiertoId] = useState(null);
  const [ficha, setFicha] = useState(null); // { caso, pasId }

  const todosLosPas = useMemo(() => [...pas, ...pasManuales], [pas, pasManuales]);
  const allCasos = useMemo(() => aplanarCasos(casos, todosLosPas), [casos, todosLosPas]);

  const conteos = useMemo(() => {
    const c = { todos: allCasos.length, activos: allCasos.filter(esActivo).length };
    ESTADOS_CASO.forEach(e => { c[e.key] = allCasos.filter(x => x.estado === e.key).length; });
    return c;
  }, [allCasos]);

  const filtrados = useMemo(() => {
    let lista = allCasos.filter(c =>
      c.id === abiertoId || // la fila abierta no desaparece aunque le cambies el estado
      (filtro === "todos" ? true : filtro === "activos" ? esActivo(c) : c.estado === filtro)
    );
    const q = busqueda.trim().toLowerCase();
    if (q) {
      const qSinEspacios = q.replace(/\s/g, "");
      lista = lista.filter(c =>
        (c.asegurado || "").toLowerCase().includes(q) ||
        (c._pasNombre || "").toLowerCase().includes(q) ||
        (c.compania_aseguradora || "").toLowerCase().includes(q) ||
        (c.nro_siniestro || "").toLowerCase().includes(q) ||
        (c.patente || "").toLowerCase().replace(/\s/g, "").includes(qSinEspacios)
      );
    }
    const col = COLUMNAS.find(x => x.k === orden.k);
    return [...lista].sort((a, b) => {
      const va = col.valor(a), vb = col.valor(b);
      const r = va < vb ? -1 : va > vb ? 1 : 0;
      return orden.desc ? -r : r;
    });
  }, [allCasos, filtro, busqueda, orden, abiertoId]);

  const ordenarPor = k => setOrden(o => (o.k === k ? { k, desc: !o.desc } : { k, desc: k === "mov" || k === "monto" }));

  const handleDelete = (caso) => {
    if (!window.confirm(`¿Eliminar definitivamente el caso de ${caso.asegurado || "este asegurado"}? Esta acción no se puede deshacer.`)) return;
    deleteCaso(caso.id);
    setAbiertoId(null);
    onSaveCasos(caso._pasId, (casos[String(caso._pasId)] || []).filter(c => c.id !== caso.id), caso._pasNombre);
  };

  // Guarda en memoria el caso editado desde la fila (ya se guardó en Supabase)
  const casoEditado = useCallback((pasId) => (actualizado) => {
    const { _pasId, _pasNombre, ...limpio } = actualizado;
    onCasoLocal(pasId, limpio);
  }, [onCasoLocal]);

  const alternar = id => setAbiertoId(a => (a === id ? null : id));

  const chip = (key, label, n) => {
    const activo = filtro === key;
    const e = ESTADOS_CASO.find(x => x.key === key);
    return (
      <button key={key} type="button" onClick={() => setFiltro(key)} aria-pressed={activo}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, flex: "none", whiteSpace: "nowrap",
          padding: "5px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
          border: `1px solid ${activo ? "var(--text)" : "var(--border)"}`, background: "var(--card)",
          color: activo ? "var(--text)" : "var(--sub)", fontWeight: activo ? 600 : 500,
        }}>
        {e && <span style={{ width: 7, height: 7, borderRadius: "50%", background: e.color }} />}
        {label} <b className="num" style={{ color: "var(--text)" }}>{n}</b>
      </button>
    );
  };

  const expandida = c => (
    <FilaExpandida
      key={`exp-${c.id}`}
      caso={c}
      onCasoLocal={casoEditado(c._pasId)}
      onAbrirFicha={() => setFicha({ caso: c, pasId: c._pasId })}
      onEliminar={() => handleDelete(c)}
    />
  );

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Casos</h1>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{filtrados.length} de {allCasos.length}</span>
      </header>

      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex" }}><Icono nombre="buscar" size={16} /></span>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label="Buscar casos"
          placeholder="Buscar por asegurado, patente, PAS, compañía o siniestro…"
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {chip("activos", "Activos", conteos.activos)}
        {chip("todos", "Todos", conteos.todos)}
        {ESTADOS_CASO.filter(e => conteos[e.key] > 0).map(e => chip(e.key, e.label, conteos[e.key]))}
      </div>

      {filtrados.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--sub)", fontSize: 14 }}>
          Ningún caso coincide.{" "}
          <button type="button" onClick={() => { setFiltro("todos"); setBusqueda(""); }} style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Ver todos</button>
        </div>
      )}

      {/* ── Celular: filas de dos líneas ── */}
      {esCelular && filtrados.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {filtrados.map((c, i) => (
            <Fragment key={c.id}>
              <button type="button" onClick={() => alternar(c.id)} aria-expanded={abiertoId === c.id}
                style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "4px 10px", padding: "11px 14px", background: abiertoId === c.id ? "var(--card2)" : "none", border: "none", borderTop: i ? "1px solid var(--border)" : "none", textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit" }}>
                <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.asegurado || "Sin nombre"}</span>
                <span className="num" style={{ fontSize: 14, fontWeight: 600 }}>{montoCaso(c) ? fmtMoney(montoCaso(c)) : ""}</span>
                <span style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                  <EstadoPill estado={c.estado} size="sm" />
                  <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.compania_aseguradora || ""}</span>
                </span>
                <span style={{ fontSize: 12 }}><Movimiento caso={c} /></span>
              </button>
              {abiertoId === c.id && <div style={{ background: "var(--card2)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>{expandida(c)}</div>}
            </Fragment>
          ))}
        </div>
      )}

      {/* ── Compu: tabla ── */}
      {!esCelular && filtrados.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 14 }}>
            <colgroup>{COLUMNAS.map(c => <col key={c.k} style={{ width: c.ancho }} />)}</colgroup>
            <thead>
              <tr>
                {COLUMNAS.map(col => {
                  const activa = orden.k === col.k;
                  return (
                    <th key={col.k} scope="col" aria-sort={activa ? (orden.desc ? "descending" : "ascending") : "none"}
                      style={{ padding: 0, background: "var(--card2)", borderBottom: "1px solid var(--border)", textAlign: col.derecha ? "right" : "left" }}>
                      <button type="button" onClick={() => ordenarPor(col.k)}
                        style={{ width: "100%", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, color: activa ? "var(--text)" : "var(--muted)", textAlign: col.derecha ? "right" : "left" }}>
                        {col.l}{activa ? (orden.desc ? " ↓" : " ↑") : ""}
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
                    <tr onClick={() => alternar(c.id)} style={{ cursor: "pointer" }} className="fila-caso">
                      <td style={celda}>
                        <button type="button" aria-expanded={abierto} onClick={e => { e.stopPropagation(); alternar(c.id); }}
                          style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--text)", fontWeight: 600, cursor: "pointer", textAlign: "left", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.asegurado || "Sin nombre"}
                        </button>
                        {c.patente && <span style={{ marginLeft: 8, fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)" }}>{c.patente}</span>}
                      </td>
                      <td style={celda}><EstadoPill estado={c.estado} size="sm" /></td>
                      <td style={{ ...celda, color: "var(--sub)" }}>{c._pasNombre}</td>
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

      {ficha && (
        <CasoOverlay
          caso={ficha.caso} pasId={ficha.pasId} casos={casos} todosLosPas={todosLosPas}
          onSaveCasos={onSaveCasos} darkMode={darkMode}
          onCambio={updated => setFicha(f => ({ ...f, caso: { ...updated, _pasId: f.pasId } }))}
          onClose={() => { setFicha(null); setAbiertoId(null); }}
        />
      )}
    </div>
  );
}
