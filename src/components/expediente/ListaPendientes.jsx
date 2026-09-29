import { useEffect, useMemo, useState } from "react";
import { fmtDate, fechaLocalISO } from "../../utils/formatters.js";
import { calcularVencimiento, diasSalteados, plazoDeGracia, COMPUTOS, CLASES_PLAZO } from "../../utils/plazos.js";
import { guardarPlazo, eliminarPlazo, fechaClave } from "../../utils/expedientes.js";
import { cargarTiposPlazo, tiposPara, tipoPorClave } from "../../utils/tiposPlazo.js";
import { registrarAccion } from "../../utils/storage.js";
import Boton from "../ui/Boton.jsx";
import ChipPendiente from "./ChipPendiente.jsx";

const VACIO = { plazo: { titulo: "", fecha_notificacion: fechaLocalISO(), dias: "", computo: "habiles", clase: "fatal", notas: "" },
  escrito: { titulo: "", fecha_objetivo: "", notas: "" } };

const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sub)", marginBottom: 4 };
const campo = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 };
const pill = color => ({ fontSize: 11.5, fontWeight: 600, padding: "2px 9px", borderRadius: "var(--r-pill)", background: `color-mix(in srgb, ${color} 14%, transparent)`, color, whiteSpace: "nowrap" });

// Plazos procesales (tipo "plazo") o escritos pendientes (tipo "escrito") de un expediente o de un caso PAS.
// Con el SQL 33, el plazo se puede armar desde el catálogo ("¿Qué pasó?") y se elige cuántos días antes avisar.
export default function ListaPendientes({ tipo, expediente = null, caso = null, plazos, cal, onCambio, setToast }) {
  const esPlazo = tipo === "plazo";
  const duenio = expediente
    ? { campo: "expediente_id", id: expediente.id, juris: expediente.jurisdiccion || null, fuero: expediente.fuero || null, ambito: "expediente" }
    : { campo: "caso_id", id: caso?.id, juris: null, fuero: null, ambito: "caso" };
  const juris = duenio.juris;
  const [form, setForm] = useState(null); // null = cerrado; objeto = nuevo o editando
  const [guardando, setGuardando] = useState(false);
  const [tipos, setTipos] = useState(null); // null = sin catálogo (falta el SQL 33)
  const [busqueda, setBusqueda] = useState("");
  const [siguiente, setSiguiente] = useState(null); // tipo sugerido después de cumplir un plazo

  useEffect(() => { if (esPlazo) cargarTiposPlazo().then(setTipos); }, [esPlazo]);
  const conCatalogo = esPlazo && tipos !== null;

  const lista = useMemo(() => {
    const propios = plazos.filter(p => p.tipo === tipo);
    const orden = (a, b) => (fechaClave(a) || "9999") < (fechaClave(b) || "9999") ? -1 : 1;
    return [...propios.filter(p => p.estado === "pendiente").sort(orden), ...propios.filter(p => p.estado !== "pendiente").sort(orden).reverse()];
  }, [plazos, tipo]);

  const sugeridos = useMemo(() => (conCatalogo && form && !form.id ? tiposPara(tipos, { ambito: duenio.ambito, jurisdiccion: juris, fuero: duenio.fuero, texto: busqueda }).slice(0, 8) : []),
    [conCatalogo, tipos, form, busqueda, duenio.ambito, duenio.fuero, juris]);
  const elegido = conCatalogo && form?.tipo_plazo_id ? tipos.find(t => t.id === form.tipo_plazo_id) : null;

  // Vencimiento en vivo mientras se carga el plazo
  const calculo = useMemo(() => {
    if (!form || !esPlazo) return null;
    const vence = calcularVencimiento({ desde: form.fecha_notificacion, dias: form.dias, computo: form.computo, jurisdiccion: juris }, cal);
    if (!vence) return null;
    return { vence, salteados: diasSalteados(form.fecha_notificacion, vence, cal, juris), gracia: plazoDeGracia(vence, cal, juris) };
  }, [form, esPlazo, cal, juris]);

  const cambiar = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const nuevo = (desdeTipo = null) => {
    const base = { ...VACIO[tipo], fecha_notificacion: fechaLocalISO() };
    if (conCatalogo) base.avisar_dias_antes = 2;
    setBusqueda(""); setSiguiente(null);
    setForm(desdeTipo ? usarTipo(base, desdeTipo) : base);
  };
  const usarTipo = (f, t) => ({ ...f, titulo: t.nombre, dias: String(t.dias), computo: t.computo, clase: t.clase, tipo_plazo_id: t.id, avisar_dias_antes: t.avisar_dias_antes ?? 2 });

  const guardar = async () => {
    if (!form.titulo.trim()) { setToast({ msg: "Poné qué hay que hacer", type: "error" }); return; }
    if (esPlazo && !calculo) { setToast({ msg: "Completá la fecha de notificación y los días", type: "error" }); return; }
    setGuardando(true);
    const fila = { ...form, titulo: form.titulo.trim(), tipo, [duenio.campo]: duenio.id, ...(esPlazo ? { vence: calculo.vence } : {}), ...(conCatalogo && !form.id ? { jurisdiccion: juris } : {}) };
    const { data, error } = await guardarPlazo(fila);
    setGuardando(false);
    if (error) { setToast({ msg: "No se guardó: " + error.message, type: "error" }); return; }
    if (!form.id) registrarAccion(duenio.id, esPlazo ? `Plazo: ${fila.titulo}, vence el ${fmtDate(fila.vence)}` : `Escrito pendiente: ${fila.titulo}`);
    onCambio(data);
    setForm(null);
  };

  const marcar = async (p, cumplido) => {
    const { data, error } = await guardarPlazo({ id: p.id, estado: cumplido ? "cumplido" : "pendiente", cumplido_en: cumplido ? fechaLocalISO() : null });
    if (error) { setToast({ msg: "No se guardó: " + error.message, type: "error" }); return; }
    if (cumplido) registrarAccion(duenio.id, `${esPlazo ? "Cumplido" : "Presentado"}: ${p.titulo}`);
    onCambio(data);
    // Cadena: apelación cumplida → sugerir expresar agravios cuando llegue la notificación
    const t = cumplido && conCatalogo && p.tipo_plazo_id ? tipos.find(x => x.id === p.tipo_plazo_id) : null;
    const sig = t?.siguiente_clave ? tipoPorClave(tipos, t.siguiente_clave) : null;
    setSiguiente(sig && sig.activo ? sig : null);
  };

  const borrar = async p => {
    if (!window.confirm(`¿Borrar "${p.titulo}"?`)) return;
    if (await eliminarPlazo(p.id)) onCambio({ ...p, _borrado: true });
  };

  const detalle = p => {
    if (!esPlazo) return p.fecha_objetivo ? `Fecha objetivo ${fmtDate(p.fecha_objetivo)}` : "Sin fecha objetivo";
    const partes = [];
    if (p.fecha_notificacion) partes.push(`Notificado ${fmtDate(p.fecha_notificacion)}`);
    if (p.dias) partes.push(`${p.dias} días ${p.computo === "corridos" ? "corridos" : "hábiles"}`);
    partes.push(CLASES_PLAZO.find(c => c.k === p.clase)?.l.toLowerCase() || "fatal");
    if (p.vence) partes.push(`vence ${fmtDate(p.vence)}`);
    return partes.join(" · ");
  };

  const tituloLista = esPlazo ? (duenio.ambito === "caso" ? "Plazos" : "Plazos procesales") : "Escritos pendientes";

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 10px" }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{tituloLista}</div>
        {!form && <Boton tamaño="sm" variante="primario" icono="agregar" onClick={() => nuevo()}>{esPlazo ? "Nuevo plazo" : "Nuevo escrito"}</Boton>}
      </div>

      {siguiente && !form && (
        <div role="status" style={{ margin: "0 16px 12px", padding: "10px 12px", borderRadius: "var(--r-sm)", background: "color-mix(in srgb, var(--info) 10%, var(--card))", fontSize: 13, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ flex: "1 1 220px" }}>Lo que suele venir después: <b>{siguiente.nombre}</b> ({siguiente.disparador.toLowerCase()}).</span>
          <Boton tamaño="sm" onClick={() => nuevo(siguiente)}>Cargarlo</Boton>
          <Boton tamaño="sm" variante="fantasma" onClick={() => setSiguiente(null)}>Ahora no</Boton>
        </div>
      )}

      {form && (
        <div style={{ padding: "4px 16px 16px", borderBottom: "1px solid var(--border)" }}>
          {conCatalogo && !form.id && (
            <div style={{ marginBottom: 12 }}>
              {!elegido ? <>
                <label htmlFor="que-paso"><span style={etiqueta}>¿Qué pasó? (o cargalo a mano abajo)</span>
                  <input id="que-paso" autoFocus value={busqueda} onChange={e => setBusqueda(e.target.value)} style={campo}
                    placeholder={duenio.ambito === "caso" ? "Ej.: convenio firmado, carta documento recibida…" : "Ej.: traslado de demanda, sentencia, apelación…"} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 4, marginTop: 6 }}>
                  {sugeridos.map(t => (
                    <button key={t.id} type="button" onClick={() => setForm(f => usarTipo(f, t))}
                      style={{ textAlign: "left", font: "inherit", fontSize: 13.5, padding: "7px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer", display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
                      <span><b style={{ fontWeight: 600 }}>{t.disparador}</b> → {t.nombre}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{t.dias} {t.computo === "corridos" ? "corridos" : "háb."}{t.jurisdiccion !== "todas" ? ` · ${t.jurisdiccion}` : ""}</span>
                    </button>
                  ))}
                  {sugeridos.length === 0 && <div style={{ fontSize: 13, color: "var(--muted)" }}>Nada en el catálogo con eso. Cargalo a mano abajo (o sumalo al catálogo en Herramientas → Calculadora de plazos).</div>}
                </div>
              </> : (
                <div style={{ padding: "10px 12px", borderRadius: "var(--r-sm)", background: "var(--card2)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 240px", fontSize: 13.5 }}>
                    <b>{elegido.disparador}</b> → {elegido.nombre}
                    <div style={{ fontSize: 12, color: "var(--sub)" }}>{elegido.dias} días {elegido.computo === "corridos" ? "corridos" : "hábiles judiciales"} · {elegido.clase}{elegido.norma ? ` · ${elegido.norma}` : ""}</div>
                  </div>
                  {!elegido.verificado && <span style={pill("var(--warn)")} title="Días cargados de fábrica: confirmalos en Herramientas → Calculadora de plazos → Catálogo">Revisar norma</span>}
                  <Boton tamaño="sm" variante="fantasma" onClick={() => setForm(f => ({ ...f, tipo_plazo_id: null }))}>Cambiar</Boton>
                </div>
              )}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <label style={{ gridColumn: "1 / -1" }}><span style={etiqueta}>{esPlazo ? "Qué hay que hacer" : "Escrito"}</span>
              <input autoFocus={!conCatalogo} value={form.titulo} onChange={e => cambiar("titulo", e.target.value)} placeholder={esPlazo ? "Contestar traslado de demanda" : "Pide se dicte sentencia"} style={campo} /></label>
            {esPlazo ? <>
              <label><span style={etiqueta}>Notificado el</span><input type="date" value={form.fecha_notificacion} onChange={e => cambiar("fecha_notificacion", e.target.value)} style={campo} /></label>
              <label><span style={etiqueta}>Días</span><input type="number" min="1" inputMode="numeric" value={form.dias} onChange={e => cambiar("dias", e.target.value)} style={campo} /></label>
              <label><span style={etiqueta}>Cómputo</span>
                <select value={form.computo} onChange={e => cambiar("computo", e.target.value)} style={campo}>{COMPUTOS.map(c => <option key={c.k} value={c.k}>{c.l}</option>)}</select></label>
              <label><span style={etiqueta}>Tipo</span>
                <select value={form.clase} onChange={e => cambiar("clase", e.target.value)} style={campo}>{CLASES_PLAZO.map(c => <option key={c.k} value={c.k}>{c.l} · {c.desc}</option>)}</select></label>
              {conCatalogo && "avisar_dias_antes" in form && (
                <label><span style={etiqueta}>Avisarme (días antes)</span><input type="number" min="0" max="30" inputMode="numeric" value={form.avisar_dias_antes ?? ""} onChange={e => cambiar("avisar_dias_antes", e.target.value)} style={campo} /></label>
              )}
            </> : (
              <label><span style={etiqueta}>Fecha objetivo (la elegís vos)</span><input type="date" value={form.fecha_objetivo} onChange={e => cambiar("fecha_objetivo", e.target.value)} style={campo} /></label>
            )}
          </div>
          {esPlazo && (
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--sub)", lineHeight: 1.6 }}>
              {calculo ? <>
                Vence el <b style={{ color: "var(--text)" }}>{new Date(calculo.vence + "T12:00").toLocaleDateString("es-AR", { weekday: "long" })} {fmtDate(calculo.vence)}</b>
                {calculo.salteados.length > 0 && <> · no se contaron {calculo.salteados.map(s => `${fmtDate(s.fecha)} (${s.motivo})`).join(", ")}</>}
                <br />Plazo de gracia: {fmtDate(calculo.gracia.fecha)}, primeras {calculo.gracia.horas} horas{expediente && !juris && " (cargá la jurisdicción en Datos para afinar)"}
                {cal.aproximado && <><br /><span style={{ color: "var(--warn)" }}>Sin conexión con el calendario de feriados: se usaron solo los fijos.</span></>}
              </> : "Completá la fecha de notificación y los días para ver el vencimiento."}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Boton tamaño="sm" variante="primario" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Boton>
            <Boton tamaño="sm" variante="fantasma" onClick={() => setForm(null)}>Cancelar</Boton>
          </div>
        </div>
      )}

      {lista.length === 0 && !form && (
        <div style={{ padding: "8px 16px 18px", fontSize: 14, color: "var(--muted)" }}>
          {esPlazo ? (duenio.ambito === "caso" ? "Sin plazos. Sirve para controlar los de la compañía (pronunciarse, pagar, contestar una intimación)." : "Sin plazos cargados. Cargá el primero cuando llegue una notificación.") : "Sin escritos pendientes."}
        </div>
      )}
      {lista.map(p => {
        const hecho = p.estado !== "pendiente";
        return (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "6px 12px", alignItems: "center", padding: "11px 16px", borderTop: "1px solid var(--border)", opacity: hecho ? 0.6 : 1 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, textDecoration: hecho ? "line-through" : "none", overflowWrap: "anywhere" }}>{p.titulo}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{hecho ? `${esPlazo ? "Cumplido" : "Presentado"} ${fmtDate(p.cumplido_en)}` : detalle(p)}</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <ChipPendiente pendiente={p} cal={cal} jurisdiccion={juris} />
              {hecho
                ? <Boton tamaño="sm" variante="fantasma" onClick={() => marcar(p, false)}>Reabrir</Boton>
                : <Boton tamaño="sm" icono="check" onClick={() => marcar(p, true)}>{esPlazo ? "Cumplido" : "Presentado"}</Boton>}
              {!hecho && !esPlazo && <Boton tamaño="sm" variante="fantasma" onClick={() => setForm({ ...p })}>Editar</Boton>}
              <Boton tamaño="sm" variante="fantasma" icono="cerrar" aria-label={`Borrar ${p.titulo}`} onClick={() => borrar(p)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
