import { useMemo, useState } from "react";
import { fmtDate, fechaLocalISO } from "../../utils/formatters.js";
import { calcularVencimiento, diasSalteados, plazoDeGracia, COMPUTOS, CLASES_PLAZO } from "../../utils/plazos.js";
import { guardarPlazo, eliminarPlazo, fechaClave } from "../../utils/expedientes.js";
import { registrarAccion } from "../../utils/storage.js";
import Boton from "../ui/Boton.jsx";
import ChipPendiente from "./ChipPendiente.jsx";

const VACIO = { plazo: { titulo: "", fecha_notificacion: fechaLocalISO(), dias: "", computo: "habiles", clase: "fatal", notas: "" },
  escrito: { titulo: "", fecha_objetivo: "", notas: "" } };

const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sub)", marginBottom: 4 };
const campo = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", font: "inherit", fontSize: 14 };

// Plazos procesales (tipo "plazo") o escritos pendientes (tipo "escrito") de un expediente
export default function ListaPendientes({ tipo, expediente, plazos, cal, onCambio, setToast }) {
  const esPlazo = tipo === "plazo";
  const juris = expediente.jurisdiccion || null;
  const [form, setForm] = useState(null); // null = cerrado; objeto = nuevo o editando
  const [guardando, setGuardando] = useState(false);

  const lista = useMemo(() => {
    const propios = plazos.filter(p => p.tipo === tipo);
    const orden = (a, b) => (fechaClave(a) || "9999") < (fechaClave(b) || "9999") ? -1 : 1;
    return [...propios.filter(p => p.estado === "pendiente").sort(orden), ...propios.filter(p => p.estado !== "pendiente").sort(orden).reverse()];
  }, [plazos, tipo]);

  // Vencimiento en vivo mientras se carga el plazo
  const calculo = useMemo(() => {
    if (!form || !esPlazo) return null;
    const vence = calcularVencimiento({ desde: form.fecha_notificacion, dias: form.dias, computo: form.computo, jurisdiccion: juris }, cal);
    if (!vence) return null;
    return { vence, salteados: diasSalteados(form.fecha_notificacion, vence, cal, juris), gracia: plazoDeGracia(vence, cal, juris) };
  }, [form, esPlazo, cal, juris]);

  const cambiar = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async () => {
    if (!form.titulo.trim()) { setToast({ msg: "Poné qué hay que hacer", type: "error" }); return; }
    if (esPlazo && !calculo) { setToast({ msg: "Completá la fecha de notificación y los días", type: "error" }); return; }
    setGuardando(true);
    const fila = { ...form, titulo: form.titulo.trim(), tipo, expediente_id: expediente.id, ...(esPlazo ? { vence: calculo.vence } : {}) };
    const { data, error } = await guardarPlazo(fila);
    setGuardando(false);
    if (error) { setToast({ msg: "No se guardó: " + error.message, type: "error" }); return; }
    if (!form.id) registrarAccion(expediente.id, esPlazo ? `Plazo: ${fila.titulo}, vence el ${fmtDate(fila.vence)}` : `Escrito pendiente: ${fila.titulo}`);
    onCambio(data);
    setForm(null);
  };

  const marcar = async (p, cumplido) => {
    const { data, error } = await guardarPlazo({ id: p.id, estado: cumplido ? "cumplido" : "pendiente", cumplido_en: cumplido ? fechaLocalISO() : null });
    if (error) { setToast({ msg: "No se guardó: " + error.message, type: "error" }); return; }
    if (cumplido) registrarAccion(expediente.id, `${esPlazo ? "Cumplido" : "Presentado"}: ${p.titulo}`);
    onCambio(data);
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

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 10px" }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{esPlazo ? "Plazos procesales" : "Escritos pendientes"}</div>
        {!form && <Boton tamaño="sm" variante="primario" icono="agregar" onClick={() => setForm({ ...VACIO[tipo] })}>{esPlazo ? "Nuevo plazo" : "Nuevo escrito"}</Boton>}
      </div>

      {form && (
        <div style={{ padding: "4px 16px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <label style={{ gridColumn: "1 / -1" }}><span style={etiqueta}>{esPlazo ? "Qué hay que hacer" : "Escrito"}</span>
              <input autoFocus value={form.titulo} onChange={e => cambiar("titulo", e.target.value)} placeholder={esPlazo ? "Contestar traslado de demanda" : "Pide se dicte sentencia"} style={campo} /></label>
            {esPlazo ? <>
              <label><span style={etiqueta}>Notificado el</span><input type="date" value={form.fecha_notificacion} onChange={e => cambiar("fecha_notificacion", e.target.value)} style={campo} /></label>
              <label><span style={etiqueta}>Días</span><input type="number" min="1" inputMode="numeric" value={form.dias} onChange={e => cambiar("dias", e.target.value)} style={campo} /></label>
              <label><span style={etiqueta}>Cómputo</span>
                <select value={form.computo} onChange={e => cambiar("computo", e.target.value)} style={campo}>{COMPUTOS.map(c => <option key={c.k} value={c.k}>{c.l}</option>)}</select></label>
              <label><span style={etiqueta}>Tipo</span>
                <select value={form.clase} onChange={e => cambiar("clase", e.target.value)} style={campo}>{CLASES_PLAZO.map(c => <option key={c.k} value={c.k}>{c.l} · {c.desc}</option>)}</select></label>
            </> : (
              <label><span style={etiqueta}>Fecha objetivo (la elegís vos)</span><input type="date" value={form.fecha_objetivo} onChange={e => cambiar("fecha_objetivo", e.target.value)} style={campo} /></label>
            )}
          </div>
          {esPlazo && (
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--sub)", lineHeight: 1.6 }}>
              {calculo ? <>
                Vence el <b style={{ color: "var(--text)" }}>{new Date(calculo.vence + "T12:00").toLocaleDateString("es-AR", { weekday: "long" })} {fmtDate(calculo.vence)}</b>
                {calculo.salteados.length > 0 && <> · no se contaron {calculo.salteados.map(s => `${fmtDate(s.fecha)} (${s.motivo})`).join(", ")}</>}
                <br />Plazo de gracia: {fmtDate(calculo.gracia.fecha)}, primeras {calculo.gracia.horas} horas{!juris && " (cargá la jurisdicción en Datos para afinar)"}
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
          {esPlazo ? "Sin plazos cargados. Cargá el primero cuando llegue una notificación." : "Sin escritos pendientes."}
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
