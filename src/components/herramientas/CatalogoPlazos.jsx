import { useEffect, useState } from "react";
import Boton from "../ui/Boton.jsx";
import { cargarTiposPlazo, guardarTipoPlazo, borrarTipoPlazo, JURISDICCIONES_PLAZO, AMBITOS_PLAZO } from "../../utils/tiposPlazo.js";
import { COMPUTOS, CLASES_PLAZO } from "../../utils/plazos.js";
import { FUEROS } from "../../utils/expedientes.js";

const campo = { padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", width: "100%" };
const etiqueta = { display: "block", fontSize: 12, color: "var(--sub)", marginBottom: 4 };
const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 16 };
const NUEVO = { nombre: "", disparador: "", dias: "", computo: "habiles", clase: "fatal", jurisdiccion: "todas", fuero: "", ambito: "expediente", norma: "", avisar_dias_antes: 2, siguiente_clave: "", verificado: true, activo: true, orden: 200 };
const FILTROS = [["todos", "Todos"], ["CABA", "CABA"], ["PBA", "PBA"], ["Federal", "Federal"], ["caso", "Casos PAS"], ["revisar", "A revisar"]];

// Herramientas → Calculadora de plazos → Catálogo: qué actuación dispara qué plazo (SQL 33)
export default function CatalogoPlazos() {
  const [tipos, setTipos] = useState(undefined); // undefined = cargando, null = falta el SQL 33
  const [filtro, setFiltro] = useState("todos");
  const [form, setForm] = useState(null);
  const [aviso, setAviso] = useState(null);

  const recargar = () => cargarTiposPlazo().then(setTipos);
  useEffect(() => { recargar(); }, []);

  if (tipos === undefined) return <div style={{ fontSize: 14, color: "var(--muted)" }}>Cargando…</div>;
  if (tipos === null) return <div style={{ ...tarjeta, fontSize: 14, color: "var(--sub)" }}>Falta correr el SQL 33 (plazos condicionados) en Supabase. Trae 23 actuaciones para empezar.</div>;

  const visibles = tipos.filter(t => filtro === "todos" ? true : filtro === "caso" ? t.ambito !== "expediente" : filtro === "revisar" ? !t.verificado : t.jurisdiccion === filtro || (t.jurisdiccion === "todas" && t.ambito !== "caso"));
  const cambiar = (k, v) => { setForm(f => ({ ...f, [k]: v })); setAviso(null); };

  const guardar = async () => {
    if (!form.nombre.trim() || !form.disparador.trim() || !(Number(form.dias) > 0)) { setAviso({ error: "Completá qué pasó, qué hay que hacer y los días." }); return; }
    const { error } = await guardarTipoPlazo({ ...form, nombre: form.nombre.trim(), disparador: form.disparador.trim() });
    if (error) { setAviso({ error: `No se pudo guardar: ${error}` }); return; }
    setForm(null); setAviso({ ok: "Guardado." }); recargar();
  };
  const verificar = async t => { const { error } = await guardarTipoPlazo({ id: t.id, verificado: !t.verificado }); if (!error) recargar(); };
  const borrar = async () => {
    if (!window.confirm(`¿Eliminar "${form.nombre}" del catálogo? Los plazos ya cargados no cambian.`)) return;
    const error = await borrarTipoPlazo(form.id);
    if (error) { setAviso({ error }); return; }
    setForm(null); recargar();
  };

  const revisar = tipos.filter(t => !t.verificado).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 13.5, color: "var(--sub)", lineHeight: 1.5 }}>
        Al cargar un plazo, elegís qué pasó y el plazo se arma con estos días. Los de fábrica dicen <b>"Revisar norma"</b> hasta que confirmes los días: tildá "Verificado" en cada uno.
        {revisar > 0 && <> Quedan <b>{revisar}</b> por revisar.</>}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div className="chips" style={{ flex: "1 1 260px" }}>
          {FILTROS.map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{l}</button>)}
        </div>
        {!form && <Boton tamaño="sm" variante="primario" icono="agregar" onClick={() => { setForm({ ...NUEVO }); setAviso(null); }}>Nueva actuación</Boton>}
      </div>
      {aviso && !form && <div role="status" style={{ fontSize: 13, color: aviso.error ? "var(--bad)" : "var(--ok)" }}>{aviso.error || aviso.ok}</div>}

      {form && (
        <div style={{ ...tarjeta, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
            <label><span style={etiqueta}>Qué pasó</span><input id="tp-disparador" value={form.disparador} onChange={e => cambiar("disparador", e.target.value)} placeholder="Notificación del traslado de la demanda" style={campo} /></label>
            <label><span style={etiqueta}>Qué hay que hacer</span><input id="tp-nombre" value={form.nombre} onChange={e => cambiar("nombre", e.target.value)} placeholder="Contestar la demanda" style={campo} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            <label><span style={etiqueta}>Días</span><input id="tp-dias" type="number" min="1" value={form.dias} onChange={e => cambiar("dias", e.target.value)} style={campo} /></label>
            <label><span style={etiqueta}>Cómputo</span><select value={form.computo} onChange={e => cambiar("computo", e.target.value)} style={campo}>{COMPUTOS.map(c => <option key={c.k} value={c.k}>{c.l}</option>)}</select></label>
            <label><span style={etiqueta}>Tipo</span><select value={form.clase} onChange={e => cambiar("clase", e.target.value)} style={campo}>{CLASES_PLAZO.map(c => <option key={c.k} value={c.k}>{c.l}</option>)}</select></label>
            <label><span style={etiqueta}>Avisarme (días antes)</span><input type="number" min="0" max="30" value={form.avisar_dias_antes} onChange={e => cambiar("avisar_dias_antes", e.target.value)} style={campo} /></label>
            <label><span style={etiqueta}>Jurisdicción</span><select value={form.jurisdiccion} onChange={e => cambiar("jurisdiccion", e.target.value)} style={campo}>{JURISDICCIONES_PLAZO.map(j => <option key={j} value={j}>{j === "todas" ? "Todas" : j}</option>)}</select></label>
            <label><span style={etiqueta}>Fuero</span><select value={form.fuero || ""} onChange={e => cambiar("fuero", e.target.value)} style={campo}><option value="">Cualquiera</option>{FUEROS.map(f => <option key={f} value={f}>{f}</option>)}</select></label>
            <label><span style={etiqueta}>Para</span><select value={form.ambito} onChange={e => cambiar("ambito", e.target.value)} style={campo}>{AMBITOS_PLAZO.map(a => <option key={a.k} value={a.k}>{a.l}</option>)}</select></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
            <label><span style={etiqueta}>Norma</span><input value={form.norma || ""} onChange={e => cambiar("norma", e.target.value)} placeholder="art. 338 CPCCN" style={campo} /></label>
            <label><span style={etiqueta}>Al cumplirlo, sugerir</span>
              <select value={form.siguiente_clave || ""} onChange={e => cambiar("siguiente_clave", e.target.value)} style={campo}>
                <option value="">Nada</option>
                {tipos.filter(t => t.clave && t.id !== form.id).map(t => <option key={t.clave} value={t.clave}>{t.nombre} ({t.jurisdiccion})</option>)}
              </select></label>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={!!form.verificado} onChange={e => cambiar("verificado", e.target.checked)} style={{ accentColor: "var(--accent)" }} /> Verificado (revisé los días)</label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={!!form.activo} onChange={e => cambiar("activo", e.target.checked)} style={{ accentColor: "var(--accent)" }} /> Activo (aparece al cargar plazos)</label>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Boton tamaño="sm" variante="primario" onClick={guardar}>Guardar</Boton>
            <Boton tamaño="sm" variante="fantasma" onClick={() => { setForm(null); setAviso(null); }}>Cancelar</Boton>
            {form.id && !form.clave && <Boton tamaño="sm" variante="peligro" onClick={borrar}>Eliminar</Boton>}
            {aviso && <span role="status" style={{ fontSize: 13, color: aviso.error ? "var(--bad)" : "var(--ok)" }}>{aviso.error || aviso.ok}</span>}
          </div>
        </div>
      )}

      <div style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
        {visibles.length === 0 && <div style={{ padding: 16, fontSize: 14, color: "var(--muted)" }}>Nada con este filtro.</div>}
        {visibles.map(t => (
          <div key={t.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "4px 12px", alignItems: "center", padding: "10px 14px", borderTop: "1px solid var(--border)", opacity: t.activo ? 1 : 0.55 }}>
            <button type="button" onClick={() => { setForm({ ...NUEVO, ...t, fuero: t.fuero || "", norma: t.norma || "", siguiente_clave: t.siguiente_clave || "" }); setAviso(null); }}
              style={{ textAlign: "left", font: "inherit", background: "none", border: "none", padding: 0, color: "var(--text)", cursor: "pointer", minWidth: 0 }}>
              <div style={{ fontSize: 14 }}><b style={{ fontWeight: 600 }}>{t.disparador}</b> → {t.nombre}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {t.dias} días {t.computo === "corridos" ? "corridos" : "hábiles"} · {t.clase} · {t.jurisdiccion === "todas" ? "todas" : t.jurisdiccion}{t.fuero ? ` · ${t.fuero}` : ""}{t.ambito === "caso" ? " · casos PAS" : ""}{t.norma ? ` · ${t.norma}` : ""}{t.activo ? "" : " · desactivado"}
              </div>
            </button>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, color: t.verificado ? "var(--ok)" : "var(--warn)", whiteSpace: "nowrap", cursor: "pointer" }}>
              <input type="checkbox" checked={!!t.verificado} onChange={() => verificar(t)} style={{ accentColor: "var(--ok)" }} aria-label={`Verificado: ${t.nombre}`} />
              {t.verificado ? "Verificado" : "Revisar norma"}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
