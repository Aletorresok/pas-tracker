import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useEsCelular } from "../hooks/useEsCelular.js";
import { useCalendarioJudicial } from "../hooks/useCalendarioJudicial.js";
import { fechaLocalISO } from "../utils/formatters.js";
import { habilesHasta } from "../utils/plazos.js";
import { alpha } from "../utils/theme.js";
import {
  cargarExpedientes, cargarPlazosExpedientes, estadoExpediente, expedienteAbierto, fechaClave, proximoPorExpediente,
  ESTADOS_EXPEDIENTE, actualizarExpediente,
} from "../utils/expedientes.js";
import { registrarAccion } from "../utils/storage.js";
import { itemsExpediente } from "../utils/menus.js";
import { propsMenu } from "./ui/MenuContextual.jsx";
import TableroEtapas from "./ui/TableroEtapas.jsx";
import Boton from "./ui/Boton.jsx";
import Icono from "./ui/Icono.jsx";
import ChipPendiente from "./expediente/ChipPendiente.jsx";
import FichaExpediente from "./expediente/FichaExpediente.jsx";
import BandejaNovedades from "./expediente/BandejaNovedades.jsx";
import { Toast } from "./casoDetalleComponents.jsx";
import { hayNovedadesJudiciales, cargarNovedades } from "../utils/novedadesJudiciales.js";

function PillEstado({ estado }) {
  const e = estadoExpediente(estado);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontSize: 11, fontWeight: 600, lineHeight: 1.6, padding: "1px 8px 1px 6px", borderRadius: "var(--r-xl)", color: e.color, background: alpha(e.color, 14) }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: e.color }} />{e.l}
    </span>
  );
}

const COLUMNAS = ESTADOS_EXPEDIENTE.map(e => ({ key: e.k, label: e.l, cabecera: <PillEstado estado={e.k} /> }));
const VISTA_GUARDADA = "expedientes_vista";
const leerVista = () => { try { return localStorage.getItem(VISTA_GUARDADA) === "tablero" ? "tablero" : "tabla"; } catch { return "tabla"; } };

const juzgadoDe = e => [e.fuero, e.juzgado && `Juzg. ${e.juzgado}`, e.numero && `Expte. ${e.numero}`].filter(Boolean).join(" · ");

// pegarNovedad: número que cambia cuando se pide "Pegar novedad" desde el buscador
export default function TabExpedientes({ abrirId, onAbierto, pegarNovedad = 0 }) {
  const esCelular = useEsCelular();
  const cal = useCalendarioJudicial();
  const [expedientes, setExpedientes] = useState(null); // null = cargando
  const [plazos, setPlazos] = useState([]);
  const [error, setError] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("abiertos");
  const [ficha, setFicha] = useState(null); // { id } o { nuevo: true }
  const [vista, setVista] = useState(leerVista); // tabla | tablero
  const [errorMover, setErrorMover] = useState("");
  const [novedades, setNovedades] = useState(null); // null = falta el SQL 37 (el chip no aparece)
  const [pegarAhora, setPegarAhora] = useState(0); // "Pegar novedad" de arriba: abre la bandeja ya con lo copiado
  useEffect(() => { if (pegarNovedad) { setFiltro("novedades"); setPegarAhora(n => n + 1); } }, [pegarNovedad]);
  const [toast, setToast] = useState(null);
  const cerrarToast = useCallback(() => setToast(null), []);
  const elegirVista = v => { setVista(v); try { localStorage.setItem(VISTA_GUARDADA, v); } catch { /* sin storage */ } };

  useEffect(() => {
    Promise.all([cargarExpedientes(), cargarPlazosExpedientes()]).then(([exps, pls]) => {
      if (exps === null) { setError(true); setExpedientes([]); return; }
      setExpedientes(exps);
      setPlazos(pls);
    });
    hayNovedadesJudiciales().then(ok => ok && cargarNovedades().then(setNovedades));
  }, []);

  // Desde Hoy: abre la ficha del expediente pedido
  useEffect(() => {
    if (!abrirId) return;
    setFicha({ id: abrirId });
    onAbierto?.();
  }, [abrirId, onAbierto]);

  const hoy = fechaLocalISO();
  const proximo = useMemo(() => proximoPorExpediente(plazos), [plazos]);
  const pendientesDe = id => plazos.filter(p => p.expediente_id === id && p.estado === "pendiente");
  // Plazo esta semana: vence en 5 días hábiles o menos (o ya venció)
  const plazoSemana = e => pendientesDe(e.id).some(p => p.tipo === "plazo" && p.vence && habilesHasta(p.vence, hoy, cal, e.jurisdiccion) <= 5);
  const escritoPendiente = e => pendientesDe(e.id).some(p => p.tipo === "escrito");

  const FILTROS = [
    { k: "abiertos", l: "Activos", f: expedienteAbierto },
    { k: "semana", l: "Plazo esta semana", f: e => expedienteAbierto(e) && plazoSemana(e) },
    { k: "escritos", l: "Escritos pendientes", f: e => expedienteAbierto(e) && escritoPendiente(e) },
    { k: "paralizado", l: "Paralizados", f: e => e.estado === "paralizado" },
    { k: "visibles", l: "Visibles al cliente", f: e => e.visible_cliente },
    { k: "todos", l: "Todos", f: () => true },
  ];

  const lista = useMemo(() => {
    if (!expedientes) return [];
    const f = FILTROS.find(x => x.k === filtro)?.f || (() => true);
    const q = busqueda.trim().toLowerCase();
    return expedientes
      .filter(f)
      .filter(e => !q || [e.caratula, e.cliente_nombre, e.contraparte, e.numero, e.juzgado].some(v => (v || "").toLowerCase().includes(q)))
      // Primero lo que vence antes; los que no tienen nada pendiente, al final
      .sort((a, b) => (fechaClave(proximo.get(a.id) || {}) || "9999") < (fechaClave(proximo.get(b.id) || {}) || "9999") ? -1 : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expedientes, plazos, filtro, busqueda, cal]);

  const alGuardar = useCallback((exp, { nuevo } = {}) => {
    setExpedientes(xs => (nuevo ? [exp, ...xs] : xs.map(x => (x.id === exp.id ? exp : x))));
    if (nuevo) setFicha({ id: exp.id });
  }, []);
  const alCambiarPlazo = useCallback(p => {
    setPlazos(ps => (p._borrado ? ps.filter(x => x.id !== p.id) : ps.some(x => x.id === p.id) ? ps.map(x => (x.id === p.id ? p : x)) : [...ps, p]));
  }, []);

  // Cambio de estado desde el tablero o el menú: mismo registro en la bitácora que la ficha
  const mover = async (e, estado) => {
    setErrorMover("");
    const anterior = e;
    setExpedientes(xs => xs.map(x => (x.id === e.id ? { ...x, estado } : x)));
    const { data, error: err } = await actualizarExpediente(e.id, { estado });
    if (err) { setExpedientes(xs => xs.map(x => (x.id === e.id ? anterior : x))); setErrorMover("No se pudo cambiar el estado: " + err.message); return; }
    setExpedientes(xs => xs.map(x => (x.id === e.id ? data : x)));
    registrarAccion(e.id, `Pasó a ${estadoExpediente(estado).l}`);
  };
  const menuExp = e => itemsExpediente(e, { abrir: x => setFicha({ id: x.id }), mover: { estados: COLUMNAS, onMover: mover } });

  const expFicha = ficha?.id ? expedientes?.find(e => e.id === ficha.id) : null;

  const chip = ({ k, l, f }) => {
    const activo = filtro === k;
    const n = (expedientes || []).filter(f).length;
    if (!n && !activo && k !== "abiertos" && k !== "todos") return null;
    return (
      <button key={k} type="button" onClick={() => setFiltro(k)} aria-pressed={activo}
        className="chip">
        {l} <b className="num" style={{ color: "var(--text)" }}>{n}</b>
      </button>
    );
  };

  const proximoTexto = e => {
    const p = proximo.get(e.id);
    if (!p) return <span style={{ fontSize: 12, color: "var(--muted)" }}>{e.proxima_accion || "Sin plazos"}</span>;
    return (
      <span style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start", minWidth: 0 }}>
        <ChipPendiente pendiente={p} cal={cal} jurisdiccion={e.jurisdiccion} />
        <span style={{ fontSize: 12, color: "var(--muted)", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.tipo === "escrito" ? `Escrito: ${p.titulo}` : p.titulo}</span>
      </span>
    );
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Expedientes</h1>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Casos judiciales y generales, fuera de seguros</div>
        </div>
        <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span role="group" aria-label="Vista" className="segmentado">
            {[["tabla", "Tabla"], ["tablero", "Tablero"]].map(([k, l]) => (
              <button key={k} type="button" aria-pressed={vista === k} onClick={() => elegirVista(k)}>{l}</button>
            ))}
          </span>
          <Boton variante="primario" icono="agregar" onClick={() => setFicha({ nuevo: true })}>Nuevo expediente</Boton>
        </span>
      </header>

      {errorMover && <div role="alert" style={{ color: "var(--bad)", fontSize: 13 }}>{errorMover}</div>}

      {error && <div role="alert" style={{ padding: "10px 14px", borderRadius: "var(--r-sm)", background: alpha("var(--bad)", 10), color: "var(--bad)", fontSize: 14 }}>No se pudieron cargar los expedientes. ¿Está corrido el SQL 25?</div>}

      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex" }}><Icono nombre="buscar" size={16} /></span>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label="Buscar expedientes" placeholder="Buscar por carátula, cliente, contraparte, número o juzgado…"
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
      </div>

      <div className="chips">
        {novedades && (novedades.length > 0 || filtro === "novedades") && (
          <button type="button" onClick={() => setFiltro(filtro === "novedades" ? "abiertos" : "novedades")} aria-pressed={filtro === "novedades"} className="chip"
            style={novedades.length ? { borderColor: "var(--warn)" } : undefined}>
            Novedades <b className="num" style={{ color: novedades.length ? "var(--warn)" : "var(--text)" }}>{novedades.length}</b>
          </button>
        )}
        {FILTROS.map(chip)}
        {novedades && !novedades.length && filtro !== "novedades" && (
          <button type="button" onClick={() => { setFiltro("novedades"); setPegarAhora(n => n + 1); }} className="chip">Pegar novedad</button>
        )}
      </div>

      {filtro === "novedades" && novedades && (
        <BandejaNovedades novedades={novedades} setNovedades={setNovedades} expedientes={expedientes || []} cal={cal}
          onAbrirExpediente={id => setFicha({ id })} onPlazo={alCambiarPlazo} setToast={setToast} pegarAhora={pegarAhora} />
      )}

      {expedientes === null && <div style={{ padding: 24, color: "var(--muted)", fontSize: 14 }}>Cargando expedientes…</div>}

      {expedientes && expedientes.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "40px 16px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)" }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Cargá tu primer expediente</div>
          <div style={{ color: "var(--sub)", fontSize: 14, margin: "6px 0 14px" }}>Los casos que no son de seguros, con sus plazos procesales y escritos.</div>
          <Boton variante="primario" icono="agregar" onClick={() => setFicha({ nuevo: true })}>Nuevo expediente</Boton>
        </div>
      )}

      {filtro !== "novedades" && expedientes && expedientes.length > 0 && lista.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--sub)", fontSize: 14 }}>
          Ningún expediente coincide.{" "}
          <button type="button" onClick={() => { setFiltro("todos"); setBusqueda(""); }} style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Ver todos</button>
        </div>
      )}

      {filtro !== "novedades" && lista.length > 0 && vista === "tablero" && (
        <TableroEtapas columnas={COLUMNAS} items={lista} etapaDe={e => e.estado} onMover={mover} onAbrir={e => setFicha({ id: e.id })} menu={menuExp} anchoColumna={220}
          render={e => (
            <>
              <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.caratula}</span>
              <span style={{ fontSize: 12, color: "var(--sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.cliente_nombre || juzgadoDe(e) || "—"}</span>
              {proximo.get(e.id) ? <ChipPendiente pendiente={proximo.get(e.id)} cal={cal} jurisdiccion={e.jurisdiccion} /> : <span style={{ fontSize: 12, color: "var(--muted)" }}>Sin plazos</span>}
            </>
          )} />
      )}

      {filtro !== "novedades" && lista.length > 0 && vista === "tabla" && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", overflow: "hidden" }}>
          {!esCelular && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 200px 170px 120px", gap: 12, padding: "9px 14px", background: "var(--card2)", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--muted)" }}>
              <span>Carátula</span><span>Próximo</span><span>Cliente</span><span>Estado</span>
            </div>
          )}
          {lista.map((e, i) => (
            <Fragment key={e.id}>
              <button type="button" className="fila-caso" onClick={() => setFicha({ id: e.id })} {...propsMenu(() => menuExp(e))}
                style={{ width: "100%", display: "grid", gridTemplateColumns: esCelular ? "minmax(0, 1fr) auto" : "minmax(0, 1fr) 200px 170px 120px", gap: esCelular ? "4px 10px" : 12, alignItems: "center",
                  padding: "11px 14px", background: "none", border: "none", borderTop: i ? "1px solid var(--border)" : "none", textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit" }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 600, fontSize: esCelular ? 15 : 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.caratula}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {juzgadoDe(e) || "—"}{esCelular && e.cliente_nombre ? ` · ${e.cliente_nombre}` : ""}
                  </span>
                </span>
                {esCelular
                  ? <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      {proximo.get(e.id) ? <ChipPendiente pendiente={proximo.get(e.id)} cal={cal} jurisdiccion={e.jurisdiccion} /> : <PillEstado estado={e.estado} />}
                    </span>
                  : <>
                      {proximoTexto(e)}
                      <span style={{ fontSize: 14, color: "var(--sub)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
                        {e.cliente_nombre || "—"}
                        {e.visible_cliente && <span title="Visible para el cliente" style={{ color: "var(--ok)", fontSize: 11, fontWeight: 700 }}>· visible</span>}
                      </span>
                      <PillEstado estado={e.estado} />
                    </>}
              </button>
            </Fragment>
          ))}
        </div>
      )}

      {ficha && (ficha.nuevo || expFicha) && (
        <FichaExpediente
          key={ficha.id || "nuevo"}
          expediente={ficha.nuevo ? null : expFicha}
          plazos={ficha.id ? plazos.filter(p => p.expediente_id === ficha.id) : []}
          cal={cal}
          onGuardado={alGuardar}
          onPlazo={alCambiarPlazo}
          onEliminado={id => { setExpedientes(xs => xs.filter(x => x.id !== id)); setPlazos(ps => ps.filter(p => p.expediente_id !== id)); setFicha(null); }}
          onClose={() => setFicha(null)}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={cerrarToast} />}
    </div>
  );
}

