import { Fragment, useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabase.js";
import { useCompanias } from "./caso/CompaniaSelector.jsx";
import { fmtMoney, fmtDate, diasDesde, primerNombre } from "../utils/formatters.js";
import { estadisticasPas } from "../utils/estadisticasPas.js";
import { linkWhatsApp } from "../utils/mensajes.js";
import ResumenMensual from "./clientes/ResumenMensual.jsx";
import { esActivo, netoYo } from "../utils/metricas.js";
import { useEsCelular } from "../hooks/useEsCelular.js";
import { NuevoCasoModal, NuevoPASModal } from "./clientes/ModalesCliente.jsx";
import CasoOverlay from "./caso/CasoOverlay.jsx";
import EstadoPill from "./ui/EstadoPill.jsx";
import Boton from "./ui/Boton.jsx";
import Icono from "./ui/Icono.jsx";
import Ilustracion from "./ui/Ilustracion.jsx";

const montoCaso = c => Number(c.monto_acordado) || Number(c.monto_ofrecimiento) || Number(c.monto_reclamado) || 0;
const ultimoMov = c => c.fecha_ultimo_movimiento || c.fecha_derivacion || "";
const hace = iso => { if (!iso) return "—"; const d = diasDesde(iso); return d <= 0 ? "hoy" : `hace ${d} d`; };
const linkWa = (tel, nombre) => linkWhatsApp(tel, `Hola ${primerNombre(nombre)}, ¿cómo estás?`) || "#";

// Resumen de un PAS a partir de sus casos
function resumir(p, lista) {
  const cobrados = lista.filter(c => c.estado === "cobrado");
  return {
    ...p,
    _casos: lista,
    _enCurso: lista.filter(esActivo).length,
    _cobrados: cobrados.length,
    _honorarios: cobrados.reduce((s, c) => s + netoYo(c), 0),
    _ultimo: lista.reduce((m, c) => (c.fecha_derivacion && c.fecha_derivacion > m ? c.fecha_derivacion : m), ""),
    _est: estadisticasPas(lista),
  };
}

const COLUMNAS = [
  { k: "nombre", l: "PAS", ancho: "26%", valor: p => (p.nombre || "").toLowerCase() },
  { k: "enCurso", l: "En curso", ancho: "13%", valor: p => p._enCurso, derecha: true },
  { k: "cobrados", l: "Cobrados", ancho: "11%", valor: p => p._cobrados, derecha: true },
  { k: "desistidos", l: "Desistidos", ancho: "12%", valor: p => p._est.pctDesistidos ?? -1, derecha: true },
  { k: "honorarios", l: "Mis honorarios", ancho: "16%", valor: p => p._honorarios, derecha: true },
  { k: "ritmo", l: "Ritmo", ancho: "22%", valor: p => p._ultimo },
];

// "cada 30 d · último hace 5 d", o "Dormido" si pasó el doble de su ritmo sin derivar
function Ritmo({ est }) {
  if (!est.ultimo) return <span style={{ color: "var(--muted)" }}>sin casos</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      {est.dormido && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--warn)", background: "color-mix(in srgb, var(--warn) 13%, transparent)", borderRadius: 5, padding: "1px 6px" }}>Dormido</span>}
      <span className="num" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{est.ritmo !== null ? `cada ${est.ritmo} d · ` : ""}{hace(est.ultimo)}</span>
    </span>
  );
}

// Números del PAS dentro de la fila desplegada
function EstadisticasDelPas({ est }) {
  if (!est.total) return null;
  const tend = est.ult6 - est.prev6;
  const datos = [
    ["Casos", `${est.total}`, `${est.enCurso} en curso`],
    ["Éxito", est.pctExito !== null ? `${est.pctExito}%` : "—", "de los cerrados, cobrados"],
    ["Desistidos", est.pctDesistidos !== null ? `${est.pctDesistidos}%` : "—", `${est.desistidos} de ${est.total}`],
    ["Ritmo", est.ritmo !== null ? `cada ${est.ritmo} d` : "—", est.ritmo !== null ? "entre derivaciones" : "se calcula desde 3 casos"],
    ["Hasta cobrar", est.diasACobro !== null ? `${est.diasACobro} d` : "—", "promedio desde que deriva"],
    ["Cobro promedio", est.cobroPromedioCliente ? fmtMoney(est.cobroPromedioCliente) : "—", "lo que cobra el asegurado"],
    ["Mis honorarios", est.honorarios ? fmtMoney(est.honorarios) : "—", est.comisionPagada ? `comisión pagada ${fmtMoney(est.comisionPagada)}` : "neto de comisión"],
    ["Tendencia", `${est.ult6} vs ${est.prev6}`, tend > 0 ? "▲ últimos 6 meses vs anteriores" : tend < 0 ? "▼ últimos 6 meses vs anteriores" : "últimos 6 meses vs anteriores"],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="stats-pas" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        {datos.map(([l, v, s]) => (
          <div key={l} style={{ background: "var(--card)", padding: "8px 10px", minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
            <div style={{ fontSize: 11, color: "var(--sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "var(--sub)" }}>
        {est.primero && <>Cliente desde el {fmtDate(est.primero)}</>}
        {est.companias.length > 0 && <> · Compañías: {est.companias.map(c => `${c.nombre} (${c.n})`).join(", ")}</>}
        {est.dormido && <span style={{ color: "var(--warn)", fontWeight: 600 }}> · Hace {est.diasDesdeUltimo} días que no te deriva (su ritmo es cada {est.ritmo})</span>}
      </div>
    </div>
  );
}

// Contacto y casos de un PAS, dentro de la fila desplegada
function CasosDelPas({ pas, onAbrir, onNuevo, onEditar, esCelular }) {
  const casos = [...pas._casos].sort((a, b) => (esActivo(b) - esActivo(a)) || ultimoMov(b).localeCompare(ultimoMov(a)));
  const [resumen, setResumen] = useState(false);
  return (
    <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 13, color: "var(--sub)" }}>
        {pas.mail && <a href={`mailto:${pas.mail}`} style={{ color: "var(--sub)" }}>{pas.mail}</a>}
        {(pas.telefonos || []).map(t => (
          <a key={t} href={linkWa(t, pas.nombre)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--sub)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", textDecoration: "none", background: "var(--card)" }}>
            <Icono nombre="mensaje" size={13} /> {t}
          </a>
        ))}
        <span style={{ flex: 1 }} />
        {pas.manual && <Boton tamaño="sm" variante="fantasma" onClick={onEditar}>Editar PAS</Boton>}
        {casos.length > 0 && <Boton tamaño="sm" icono="mensaje" onClick={() => setResumen(r => !r)}>Resumen del mes</Boton>}
        <Boton tamaño="sm" variante="primario" icono="agregar" onClick={onNuevo}>Nuevo caso</Boton>
      </div>

      {resumen && <ResumenMensual pas={pas} casos={pas._casos} onCerrar={() => setResumen(false)} />}
      <EstadisticasDelPas est={pas._est} />

      {casos.length === 0
        ? <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>Todavía no derivó casos.</div>
        : (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            {casos.map((c, i) => (
              <button key={c.id} type="button" onClick={() => onAbrir(c)} className="fila-caso"
                style={{ width: "100%", display: "grid", gridTemplateColumns: esCelular ? "minmax(0, 1fr) auto" : "minmax(0, 2fr) 150px minmax(0, 1.2fr) 90px 110px", gap: esCelular ? "4px 10px" : 12, alignItems: "center", padding: "9px 12px", background: "none", border: "none", borderTop: i ? "1px solid var(--border)" : "none", textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit", fontSize: 14 }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>
                  {c.asegurado || "Sin nombre"}
                  {c.patente && <span style={{ marginLeft: 8, fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>{c.patente}</span>}
                </span>
                {esCelular
                  ? <>
                      <span className="num" style={{ fontWeight: 600 }}>{montoCaso(c) ? fmtMoney(montoCaso(c)) : ""}</span>
                      <span style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}><EstadoPill estado={c.estado} size="sm" /><span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.compania_aseguradora || ""}</span></span>
                      <span className="num" style={{ fontSize: 12, color: "var(--sub)" }}>{hace(ultimoMov(c))}</span>
                    </>
                  : <>
                      <span><EstadoPill estado={c.estado} size="sm" /></span>
                      <span style={{ color: "var(--sub)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.compania_aseguradora || "—"}</span>
                      <span className="num" style={{ color: "var(--sub)", fontSize: 13 }}>{hace(ultimoMov(c))}</span>
                      <span className="num" style={{ textAlign: "right" }}>{montoCaso(c) ? fmtMoney(montoCaso(c)) : <span style={{ color: "var(--muted)" }}>—</span>}</span>
                    </>}
              </button>
            ))}
          </div>
        )}
    </div>
  );
}

// Clientes = los PAS que derivan casos (marcados como derivadores o cargados a mano).
// Cada caso se guarda solo (la ficha lo guarda en Supabase); acá no hay guardado masivo.
export default function TabClientes({ foco, pas, casos, derivadores, onCasoLocal, darkMode, pasManuales, onAddPasManual }) {
  const esCelular = useEsCelular();
  const { companias, agregarCompania } = useCompanias(casos);
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState({ k: "enCurso", desc: true });
  const [abiertoId, setAbiertoId] = useState(null);
  const [nuevoCasoPara, setNuevoCasoPara] = useState(null);
  const [pasEditando, setPasEditando] = useState(undefined); // undefined = cerrado, null = nuevo PAS
  const [ficha, setFicha] = useState(null); // { caso, pasId }
  const [error, setError] = useState("");

  const todosLosPas = useMemo(() => [...pas, ...pasManuales], [pas, pasManuales]);

  // Llegar desde el buscador: muestra ese PAS abierto
  useEffect(() => {
    if (!foco) return;
    setBusqueda(foco.nombre || "");
    setAbiertoId(foco.id);
  }, [foco]);

  const clientes = useMemo(() => {
    const manualesIds = new Set(pasManuales.map(p => String(p.id)));
    const derivs = pas.filter(p => derivadores[String(p.id)] && !manualesIds.has(String(p.id)));
    return [...derivs, ...pasManuales].map(p => resumir(p, casos[String(p.id)] || []));
  }, [pas, derivadores, pasManuales, casos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = q ? clientes.filter(p => (p.nombre || "").toLowerCase().includes(q) || (p.mail || "").toLowerCase().includes(q)) : clientes;
    const col = COLUMNAS.find(c => c.k === orden.k);
    return [...lista].sort((a, b) => {
      const va = col.valor(a), vb = col.valor(b);
      const r = va < vb ? -1 : va > vb ? 1 : 0;
      return orden.desc ? -r : r;
    });
  }, [clientes, busqueda, orden]);

  const ordenarPor = k => setOrden(o => (o.k === k ? { k, desc: !o.desc } : { k, desc: k !== "nombre" }));
  const alternar = id => setAbiertoId(a => (a === id ? null : id));

  // Alta de un caso: se guarda solo ese caso y se abre su ficha para completarlo
  const crearCaso = async (p, datos) => {
    setError("");
    const fila = { ...datos, pas_id: parseInt(p.id, 10), origen: "estudio", revisado_en: new Date().toISOString() };
    const { error: err } = await supabase.from("pas_casos").insert([fila]);
    if (err) {
      console.error("[TabClientes] alta de caso:", err);
      setError(/row-level security/i.test(err.message || "") ? "No se pudo crear el caso: la sesión no es de administrador. Cerrá sesión y entrá de nuevo con tu cuenta." : "No se pudo crear el caso: " + (err.message || "error desconocido"));
      return;
    }
    onCasoLocal(String(p.id), fila);
    setNuevoCasoPara(null);
    setFicha({ caso: fila, pasId: String(p.id) });
  };

  const exportarExcel = () => {
    const rows = [];
    clientes.forEach(p => {
      if (p._casos.length === 0) rows.push({ PAS: p.nombre, Mail: p.mail, Asegurado: "", Estado: "", Compañía: "", "Fecha derivación": "", "Monto acordado": "", "Cobré yo": "", "Comisión PAS": "", Nota: "" });
      p._casos.forEach(c => rows.push({ PAS: p.nombre, Mail: p.mail, Asegurado: c.asegurado, Estado: c.estado, Compañía: c.compania_aseguradora || "", "Fecha derivación": c.fecha_derivacion || "", "Monto acordado": c.monto_acordado || c.monto_ofrecimiento || "", "Cobré yo": c.monto_cobro_yo || "", "Comisión PAS": c.monto_comision_pas || "", Nota: c.nota || "" }));
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Casos");
    XLSX.writeFile(wb, `pastracker_casos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const desplegado = p => (
    <CasosDelPas pas={p} esCelular={esCelular}
      onAbrir={c => setFicha({ caso: c, pasId: String(p.id) })}
      onNuevo={() => setNuevoCasoPara(p)}
      onEditar={() => setPasEditando(p)} />
  );

  const totalEnCurso = clientes.reduce((s, p) => s + p._enCurso, 0);
  const conCasos = clientes.filter(p => p._casos.length > 0).length;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Clientes</h1>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{clientes.length} PAS · {conCasos} con casos · {totalEnCurso} casos en curso</span>
      </header>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex" }}><Icono nombre="buscar" size={16} /></span>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar PAS por nombre o mail…" aria-label="Buscar PAS"
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
        </div>
        <Boton icono="agregar" onClick={() => setPasEditando(null)}>PAS manual</Boton>
        <Boton icono="guardar" onClick={exportarExcel}>Excel</Boton>
      </div>

      {error && <div role="alert" style={{ color: "var(--bad)", fontSize: 13 }}>{error}</div>}

      {clientes.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--sub)", fontSize: 14, lineHeight: 1.6 }}>
          <Ilustracion nombre="carpeta" size={88} style={{ margin: "0 auto 8px" }} />
          Todavía no tenés PAS clientes. Marcá uno como "Deriva casos" en Contactos o agregalo con "PAS manual".
        </div>
      )}
      {clientes.length > 0 && filtrados.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--sub)", fontSize: 14 }}>Ningún PAS coincide con la búsqueda.</div>}

      {/* Celular: filas de dos líneas */}
      {esCelular && filtrados.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {filtrados.map((p, i) => (
            <Fragment key={p.id}>
              <button type="button" onClick={() => alternar(p.id)} aria-expanded={abiertoId === p.id}
                style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "4px 10px", padding: "11px 14px", background: abiertoId === p.id ? "var(--card2)" : "none", border: "none", borderTop: i ? "1px solid var(--border)" : "none", textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit" }}>
                <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nombre}</span>
                <span className="num" style={{ fontSize: 14, fontWeight: 600 }}>{p._honorarios ? fmtMoney(p._honorarios) : ""}</span>
                <span style={{ fontSize: 12, color: "var(--sub)" }}><span className="num">{p._enCurso}</span> en curso · <span className="num">{p._cobrados}</span> cobrados</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{p._ultimo ? <Ritmo est={p._est} /> : ""}</span>
              </button>
              {abiertoId === p.id && <div style={{ background: "var(--card2)", borderTop: "1px solid var(--border)" }}>{desplegado(p)}</div>}
            </Fragment>
          ))}
        </div>
      )}

      {/* Compu: tabla */}
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
              {filtrados.map(p => {
                const abierto = abiertoId === p.id;
                const celda = { padding: "10px 14px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: abierto ? "var(--card2)" : undefined };
                return (
                  <Fragment key={p.id}>
                    <tr onClick={() => alternar(p.id)} style={{ cursor: "pointer" }} className="fila-caso">
                      <td style={celda}>
                        <button type="button" aria-expanded={abierto} onClick={e => { e.stopPropagation(); alternar(p.id); }}
                          style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--text)", fontWeight: 600, cursor: "pointer", textAlign: "left", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.nombre}
                        </button>
                        {p.manual && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 4, padding: "0 5px" }}>manual</span>}
                      </td>
                      <td className="num" style={{ ...celda, textAlign: "right", fontWeight: p._enCurso ? 600 : 400, color: p._enCurso ? "var(--text)" : "var(--muted)" }}>{p._enCurso}</td>
                      <td className="num" style={{ ...celda, textAlign: "right", color: p._cobrados ? "var(--text)" : "var(--muted)" }}>{p._cobrados}</td>
                      <td className="num" style={{ ...celda, textAlign: "right", color: p._est.pctDesistidos ? "var(--text)" : "var(--muted)" }}>{p._est.pctDesistidos !== null ? `${p._est.pctDesistidos}%` : "—"}</td>
                      <td className="num" style={{ ...celda, textAlign: "right" }}>{p._honorarios ? fmtMoney(p._honorarios) : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                      <td style={{ ...celda, color: "var(--sub)", fontSize: 13 }}><Ritmo est={p._est} /></td>
                    </tr>
                    {abierto && (
                      <tr><td colSpan={COLUMNAS.length} style={{ padding: 0, background: "var(--card2)", borderBottom: "1px solid var(--border)" }}>{desplegado(p)}</td></tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {nuevoCasoPara && (
        <NuevoCasoModal pasNombre={nuevoCasoPara.nombre} darkMode={darkMode}
          onClose={() => setNuevoCasoPara(null)}
          onSave={datos => crearCaso(nuevoCasoPara, datos)}
          companias={companias} onAgregarCompania={agregarCompania} />
      )}

      {pasEditando !== undefined && (
        <NuevoPASModal pasEdit={pasEditando} darkMode={darkMode}
          onClose={() => setPasEditando(undefined)}
          onSave={datos => { onAddPasManual(datos); setPasEditando(undefined); }} />
      )}

      {ficha && (
        <CasoOverlay caso={ficha.caso} pasId={ficha.pasId} casos={casos} todosLosPas={todosLosPas}
          onCasoLocal={onCasoLocal} darkMode={darkMode}
          onCambio={updated => setFicha(f => ({ ...f, caso: updated }))}
          onClose={() => setFicha(null)} />
      )}
    </div>
  );
}
