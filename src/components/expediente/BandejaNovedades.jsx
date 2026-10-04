import { useEffect, useMemo, useState } from "react";
import { fmtDate, fechaLocalISO } from "../../utils/formatters.js";
import { calcularVencimiento } from "../../utils/plazos.js";
import { guardarPlazo } from "../../utils/expedientes.js";
import { cargarTiposPlazo, tiposPara } from "../../utils/tiposPlazo.js";
import { registrarAccion } from "../../utils/storage.js";
import {
  TIPOS_NOVEDAD, expedienteDelTexto, pegarNovedad, asignarNovedad, descartarNovedad, integrarNovedad, linkPortal, nombrePortal,
} from "../../utils/novedadesJudiciales.js";
import Boton from "../ui/Boton.jsx";

const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sub)", marginBottom: 4 };
const campo = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 };
const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)" };
const nombreExp = e => e ? `${e.caratula}${e.numero ? ` · Expte. ${e.numero}` : ""}` : "";

// Buscador de expediente (carátula, número, juzgado o cliente) en vez de una lista con todas las carátulas
const normal = t => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function ElegirExpediente({ id, valor, expedientes, onChange }) {
  const [q, setQ] = useState("");
  const elegido = expedientes.find(e => e.id === valor);
  const palabras = normal(q).split(/\s+/).filter(Boolean);
  const hits = palabras.length
    ? expedientes.filter(e => { const t = normal([e.caratula, e.numero, e.juzgado, e.cliente_nombre].join(" ")); return palabras.every(w => t.includes(w)); }).slice(0, 6)
    : [];
  if (elegido) return (
    <div style={{ ...campo, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombreExp(elegido)}</span>
      <button type="button" onClick={() => onChange(null)} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontSize: 13, fontWeight: 600, color: "var(--accent-ink)", cursor: "pointer" }}>Cambiar</button>
    </div>
  );
  return (
    <div>
      <input id={id} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por carátula, número, juzgado o cliente…" style={campo}
        onKeyDown={e => { if (e.key === "Enter" && hits.length) { e.preventDefault(); onChange(hits[0].id); } }} />
      {hits.length > 0 && (
        <div style={{ display: "grid", gap: 2, marginTop: 4 }}>
          {hits.map(e => (
            <button key={e.id} type="button" onClick={() => onChange(e.id)}
              style={{ textAlign: "left", font: "inherit", fontSize: 13.5, padding: "7px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {nombreExp(e)}
            </button>
          ))}
        </div>
      )}
      {palabras.length > 0 && !hits.length && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Ningún expediente coincide.</div>}
    </div>
  );
}

// Integrar: nota para la Bitácora (editable) y, si hace falta, un plazo del catálogo contado desde la fecha de la novedad
function Integrar({ nov, expediente, cal, onListo, onCancelar, setToast }) {
  const [nota, setNota] = useState(nov.texto.trim().slice(0, 400));
  const [tipos, setTipos] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState(null);
  const [desde, setDesde] = useState(nov.fecha);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => { cargarTiposPlazo().then(setTipos); }, []);
  const juris = expediente.jurisdiccion || null;
  const sugeridos = useMemo(() => (tipos && !tipo ? tiposPara(tipos, { ambito: "expediente", jurisdiccion: juris, fuero: expediente.fuero || null, texto: busqueda }).slice(0, 6) : []),
    [tipos, tipo, busqueda, juris, expediente.fuero]);
  const vence = tipo ? calcularVencimiento({ desde, dias: tipo.dias, computo: tipo.computo, jurisdiccion: juris }, cal) : null;

  const confirmar = async () => {
    if (!nota.trim()) { setToast({ msg: "Escribí qué dice la novedad", type: "error" }); return; }
    setGuardando(true);
    let plazo = null;
    if (tipo) {
      if (!vence) { setGuardando(false); setToast({ msg: "Poné la fecha de notificación", type: "error" }); return; }
      const { data, error } = await guardarPlazo({ tipo: "plazo", expediente_id: expediente.id, titulo: tipo.nombre, fecha_notificacion: desde, dias: tipo.dias, computo: tipo.computo,
        clase: tipo.clase, vence, tipo_plazo_id: tipo.id, avisar_dias_antes: tipo.avisar_dias_antes ?? 2, jurisdiccion: juris });
      if (error) { setGuardando(false); setToast({ msg: "No se creó el plazo: " + error.message, type: "error" }); return; }
      plazo = data;
      registrarAccion(expediente.id, `Plazo: ${tipo.nombre}, vence el ${fmtDate(vence)}`);
    }
    const err = await integrarNovedad(nov, { plazoId: plazo?.id || null, nota });
    setGuardando(false);
    if (err) { setToast({ msg: "No se integró: " + err, type: "error" }); return; }
    onListo(nov, plazo);
  };

  return (
    <div style={{ marginTop: 10, padding: 12, borderRadius: "var(--r-sm)", background: "var(--card2)", display: "flex", flexDirection: "column", gap: 10 }}>
      <label><span style={etiqueta}>Nota para la Bitácora</span>
        <textarea value={nota} onChange={e => setNota(e.target.value)} rows={3} style={{ ...campo, resize: "vertical" }} /></label>
      {tipos === null
        ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Para crear el plazo desde acá hace falta el catálogo de plazos (SQL 33). Podés cargarlo después en la ficha → Plazos.</div>
        : !tipo ? (
          <div>
            <label htmlFor={`que-paso-${nov.id}`}><span style={etiqueta}>¿Corre un plazo? (opcional)</span></label>
            <input id={`que-paso-${nov.id}`} value={busqueda} onChange={e => setBusqueda(e.target.value)} style={campo} placeholder="Ej.: traslado de demanda, sentencia, apelación…" />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 4, marginTop: 6 }}>
              {sugeridos.map(t => (
                <button key={t.id} type="button" onClick={() => setTipo(t)}
                  style={{ textAlign: "left", font: "inherit", fontSize: 13.5, padding: "7px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer" }}>
                  <b style={{ fontWeight: 600 }}>{t.disparador}</b> → {t.nombre} <span style={{ fontSize: 12, color: "var(--muted)" }}>· {t.dias} {t.computo === "corridos" ? "corridos" : "háb."}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, alignItems: "end" }}>
            <div style={{ fontSize: 13.5, gridColumn: "1 / -1" }}>
              Plazo: <b>{tipo.nombre}</b> · {tipo.dias} días {tipo.computo === "corridos" ? "corridos" : "hábiles"}
              {!tipo.verificado && <span style={{ color: "var(--warn)", fontWeight: 600 }}> · revisar norma</span>}{" "}
              <button type="button" onClick={() => setTipo(null)} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 600, color: "var(--accent-ink)", cursor: "pointer" }}>Cambiar</button>
            </div>
            <label><span style={etiqueta}>Notificado el</span><input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={campo} /></label>
            <div style={{ fontSize: 13, color: "var(--sub)", paddingBottom: 8 }}>{vence ? <>Vence el <b style={{ color: "var(--text)" }}>{fmtDate(vence)}</b></> : "Completá la fecha"}</div>
          </div>
        )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Boton tamaño="sm" variante="primario" onClick={confirmar} disabled={guardando}>{guardando ? "Guardando…" : tipo ? "Integrar y crear plazo" : "Integrar"}</Boton>
        <Boton tamaño="sm" variante="fantasma" onClick={onCancelar}>Cancelar</Boton>
      </div>
    </div>
  );
}

// Bandeja de novedades judiciales (SQL 37): pegás el despacho o la cédula que copiaste del PJN / MEV,
// se engancha solo con el expediente si trae el número, y cada una se integra (Bitácora + plazo) o se descarta.
// pegarAhora: número que cambia cada vez que se toca "Pegar novedad" afuera (abre el formulario con lo copiado)
export default function BandejaNovedades({ novedades, setNovedades, expedientes, cal, onAbrirExpediente, onPlazo, setToast, pegarAhora = 0 }) {
  const [form, setForm] = useState(null);
  // Abre el formulario con lo que hay en el portapapeles (el navegador puede pedir permiso la primera vez;
  // si no lo da, queda el campo vacío para pegar con Ctrl+V)
  const abrirPegado = async () => {
    const vacio = { texto: "", expediente_id: null, fecha: fechaLocalISO(), tipo: "despacho", url: "" };
    setForm(vacio);
    try {
      const texto = (await navigator.clipboard?.readText?.())?.trim();
      if (texto && texto.length > 15) setForm(f => (f && !f.texto ? { ...f, texto } : f));
    } catch { /* sin permiso: se pega a mano */ }
  };
  useEffect(() => { if (pegarAhora) abrirPegado(); }, [pegarAhora]); // eslint-disable-line react-hooks/exhaustive-deps
  const [integrando, setIntegrando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const porId = useMemo(() => new Map(expedientes.map(e => [e.id, e])), [expedientes]);
  const detectado = form ? expedienteDelTexto(form.texto, expedientes) : null;
  const expForm = form?.expediente_id || (form?.sinDetectar ? null : detectado?.id) || null;

  const guardar = async () => {
    if (!form.texto.trim()) { setToast({ msg: "Pegá el texto de la novedad", type: "error" }); return; }
    setGuardando(true);
    const { sinDetectar, ...datos } = form;
    const r = await pegarNovedad({ ...datos, expediente_id: expForm });
    setGuardando(false);
    if (r.duplicada) { setToast({ msg: "Esa novedad ya estaba cargada", type: "error" }); return; }
    if (r.error) { setToast({ msg: "No se guardó: " + r.error, type: "error" }); return; }
    setNovedades(ns => [r.data, ...ns]);
    setForm(null);
    // Con el expediente ya identificado, sigue directo a integrarla
    if (r.data.expediente_id) setIntegrando(r.data.id);
    else setToast({ msg: "Cargada sin expediente: asignala abajo", type: "success" });
  };

  const asignar = async (n, expedienteId) => {
    const err = await asignarNovedad(n.id, expedienteId);
    if (err) { setToast({ msg: "No se asignó: " + err, type: "error" }); return; }
    setNovedades(ns => ns.map(x => (x.id === n.id ? { ...x, expediente_id: expedienteId } : x)));
  };
  const descartar = async n => {
    const err = await descartarNovedad(n.id);
    if (err) { setToast({ msg: "No se descartó: " + err, type: "error" }); return; }
    setNovedades(ns => ns.filter(x => x.id !== n.id));
  };
  const integrada = (n, plazo) => {
    setNovedades(ns => ns.filter(x => x.id !== n.id));
    setIntegrando(null);
    if (plazo) onPlazo(plazo);
    setToast({ msg: plazo ? `Integrada. Plazo: vence el ${fmtDate(plazo.vence)}` : "Integrada en la Bitácora", type: "success" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ ...tarjeta, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: "1 1 260px" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Novedades judiciales</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Copiá el despacho o la cédula del PJN o la MEV y pegalo acá. Nada se toca hasta que lo integres.</div>
          </div>
          {!form && <Boton tamaño="sm" variante="primario" icono="agregar" onClick={abrirPegado}>Pegar novedad</Boton>}
        </div>
        {form && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <label><span style={etiqueta}>Texto</span>
              <textarea autoFocus value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} rows={5} style={{ ...campo, resize: "vertical" }}
                placeholder="Ej.: Expte. 12345/2024 — Buenos Aires, 15 de septiembre de 2026. Téngase por contestada la demanda. Córrase traslado…" /></label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              <div style={{ gridColumn: "1 / -1" }}><span style={etiqueta}>Expediente{detectado && !form.expediente_id ? " (lo encontré por el número)" : ""}</span>
                <ElegirExpediente valor={expForm} expedientes={expedientes} onChange={v => setForm(f => ({ ...f, expediente_id: v, sinDetectar: !v }))} /></div>
              <label><span style={etiqueta}>Fecha</span><input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={campo} /></label>
              <label><span style={etiqueta}>Tipo</span>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={campo}>{TIPOS_NOVEDAD.map(t => <option key={t.k} value={t.k}>{t.l}</option>)}</select></label>
              <label><span style={etiqueta}>Link (opcional)</span><input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} style={campo} /></label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Boton tamaño="sm" variante="primario" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : expForm ? "Guardar e integrar" : "Guardar"}</Boton>
              <Boton tamaño="sm" variante="fantasma" onClick={() => setForm(null)}>Cancelar</Boton>
            </div>
          </div>
        )}
      </div>

      {novedades.length === 0 && !form && <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--sub)", fontSize: 14 }}>No hay novedades para revisar.</div>}

      {novedades.map(n => {
        const exp = n.expediente_id ? porId.get(n.expediente_id) : null;
        const tipo = TIPOS_NOVEDAD.find(t => t.k === n.tipo)?.l || "Novedad";
        return (
          <article key={n.id} style={{ ...tarjeta, padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
              <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                {exp
                  ? <button type="button" onClick={() => onAbrirExpediente(exp.id)} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, fontSize: 14, color: "var(--text)", cursor: "pointer", textAlign: "left", overflowWrap: "anywhere" }}>{nombreExp(exp)}</button>
                  : <span style={{ fontWeight: 700, fontSize: 14, color: "var(--warn)" }}>Sin expediente</span>}
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{tipo} · {fmtDate(n.fecha)}{n.fuente !== "manual" ? ` · ${n.fuente.toUpperCase()}` : ""}</div>
              </div>
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(n.url || linkPortal(exp)) && <a href={n.url || linkPortal(exp)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-ink)", alignSelf: "center" }}>{n.url ? "Ver original" : `Abrir en ${nombrePortal(exp)}`}</a>}
                {integrando !== n.id && <>
                  <Boton tamaño="sm" variante="primario" icono="check" disabled={!exp} title={exp ? undefined : "Asignale un expediente primero"} onClick={() => setIntegrando(n.id)}>Integrar</Boton>
                  <Boton tamaño="sm" variante="fantasma" onClick={() => descartar(n)}>Descartar</Boton>
                </>}
              </span>
            </div>
            <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 160, overflow: "auto" }}>{n.texto}</div>
            {!exp && (
              <div style={{ marginTop: 10 }}><span style={etiqueta}>Asignar a</span>
                <ElegirExpediente valor={null} expedientes={expedientes} onChange={v => v && asignar(n, v)} /></div>
            )}
            {integrando === n.id && exp && <Integrar nov={n} expediente={exp} cal={cal} onListo={integrada} onCancelar={() => setIntegrando(null)} setToast={setToast} />}
          </article>
        );
      })}
    </div>
  );
}
