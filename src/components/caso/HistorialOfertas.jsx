import { useEffect, useState } from "react";
import { fmtMoney, fmtDate, fechaLocalISO } from "../../utils/formatters.js";
import { RESPUESTAS, cargarOfertas, agregarOferta, actualizarOferta, borrarOferta, camposDesdeOfertas, textoOferta, textoRespuesta } from "../../utils/ofertas.js";
import { registrarAccion } from "../../utils/storage.js";
import CampoMonto from "../ui/CampoMonto.jsx";
import Boton from "../ui/Boton.jsx";

const COLOR = { pendiente: "var(--muted)", rechazada: "var(--bad)", contraoferta: "var(--warn)", aceptada: "var(--ok)" };

// Ficha → Montos: cada ofrecimiento de la compañía con lo que se respondió. Mantiene al día el "Monto ofrecimiento"
// del caso (el último, que es el que ve el PAS) y deja cada movimiento en la bitácora.
export default function HistorialOfertas({ casoId, formData, onChange, onBitacora, Th }) {
  const [ofertas, setOfertas] = useState(undefined); // undefined = cargando, null = falta el SQL 21
  const [nueva, setNueva] = useState({ fecha: fechaLocalISO(), monto: "", respuesta: "pendiente", contraoferta: "", nota: "" });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const reclamado = Number(formData.monto_reclamado) || 0;
  const cia = formData.compania_aseguradora;

  useEffect(() => { if (casoId) cargarOfertas(casoId).then(setOfertas); }, [casoId]);

  // Después de cada cambio: actualiza los campos del caso que siguen al historial
  const sincronizar = lista => {
    Object.entries(camposDesdeOfertas(lista, formData)).forEach(([k, v]) => {
      if (String(formData[k] ?? "") !== String(v ?? "")) onChange(k, v);
    });
  };
  const anotar = async texto => { if (texto && await registrarAccion(casoId, texto)) onBitacora?.(); };

  const agregar = async () => {
    const monto = Number(nueva.monto);
    if (!monto) return;
    setGuardando(true); setError("");
    const fila = { fecha: nueva.fecha || fechaLocalISO(), monto, respuesta: nueva.respuesta, contraoferta: nueva.respuesta === "contraoferta" ? Number(nueva.contraoferta) || null : null, nota: nueva.nota.trim() || null };
    const r = await agregarOferta(casoId, fila);
    setGuardando(false);
    if (r.error) { setError("No se pudo guardar: " + r.error); return; }
    const lista = [...ofertas, r.data];
    setOfertas(lista);
    sincronizar(lista);
    setNueva({ fecha: fechaLocalISO(), monto: "", respuesta: "pendiente", contraoferta: "", nota: "" });
    await anotar(textoOferta(r.data, cia));
    await anotar(textoRespuesta(r.data));
  };

  const cambiarRespuesta = async (o, respuesta, contraoferta = o.contraoferta) => {
    const cambios = { respuesta, contraoferta: respuesta === "contraoferta" ? Number(contraoferta) || null : null };
    const err = await actualizarOferta(o.id, cambios);
    if (err) { setError("No se pudo guardar: " + err); return; }
    const actualizada = { ...o, ...cambios };
    const lista = ofertas.map(x => (x.id === o.id ? actualizada : x));
    setOfertas(lista);
    sincronizar(lista);
    if (respuesta !== o.respuesta || cambios.contraoferta !== o.contraoferta) await anotar(textoRespuesta(actualizada));
  };

  const borrar = async o => {
    if (!window.confirm(`¿Borrar el ofrecimiento de ${fmtMoney(o.monto)} del ${fmtDate(o.fecha)}?`)) return;
    const err = await borrarOferta(o.id);
    if (err) { setError("No se pudo borrar: " + err); return; }
    const lista = ofertas.filter(x => x.id !== o.id);
    setOfertas(lista);
    sincronizar(lista);
  };

  const caja = { background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 };
  const campo = { ...Th.input, padding: "7px 10px", fontSize: 13 };

  if (ofertas === undefined) return null;
  if (ofertas === null) {
    return <div style={{ ...caja, fontSize: 13, color: "var(--warn)" }}>Ofertas de la compañía: falta correr el SQL 21 en Supabase.</div>;
  }

  return (
    <div style={caja}>
      <div style={{ fontSize: 16, fontWeight: 700, color: Th.text, marginBottom: 4 }}>Ofertas de la compañía</div>
      <div style={{ fontSize: 12, color: Th.sub, marginBottom: 10 }}>Cada ofrecimiento con lo que respondiste. El último queda como "Monto ofrecimiento" (es el que ve el PAS). Solo lo ves vos.</div>

      {ofertas.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {ofertas.map((o, i) => {
            const pct = reclamado ? Math.round((Number(o.monto) / reclamado) * 100) : null;
            const previa = i > 0 ? Number(ofertas[i - 1].monto) : null;
            const suba = previa ? Math.round((Number(o.monto) / previa - 1) * 100) : null;
            return (
              <div key={o.id} style={{ display: "grid", gridTemplateColumns: "70px minmax(0, 1fr) auto", gap: 10, alignItems: "center", padding: "8px 0", borderTop: i ? `1px solid ${Th.border}` : "none", fontSize: 13 }}>
                <span className="num" style={{ color: Th.muted }}>{fmtDate(o.fecha)}</span>
                <span style={{ minWidth: 0 }}>
                  <b className="num" style={{ fontSize: 14 }}>{fmtMoney(o.monto)}</b>
                  {pct !== null && <span className="num" style={{ color: Th.muted, marginLeft: 6 }}>{pct}% del reclamo</span>}
                  {suba !== null && suba !== 0 && <span className="num" style={{ color: suba > 0 ? "var(--ok)" : "var(--bad)", marginLeft: 6 }}>{suba > 0 ? "▲" : "▼"} {Math.abs(suba)}%</span>}
                  {o.nota && <span style={{ display: "block", fontSize: 12, color: Th.sub }}>{o.nota}</span>}
                </span>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <select value={o.respuesta} onChange={e => cambiarRespuesta(o, e.target.value)} aria-label="Respuesta"
                    style={{ ...campo, width: "auto", color: COLOR[o.respuesta], fontWeight: 600 }}>
                    {RESPUESTAS.map(r => <option key={r.k} value={r.k}>{r.l}</option>)}
                  </select>
                  {o.respuesta === "contraoferta" && (
                    <span style={{ width: 130 }}><CampoMonto value={o.contraoferta || ""} onChange={v => setOfertas(l => l.map(x => (x.id === o.id ? { ...x, contraoferta: v } : x)))}
                      onBlur={() => cambiarRespuesta(o, "contraoferta", ofertas.find(x => x.id === o.id)?.contraoferta)} /></span>
                  )}
                  <button type="button" onClick={() => borrar(o)} aria-label="Borrar ofrecimiento" style={{ background: "none", border: "none", color: Th.muted, cursor: "pointer", fontSize: 16, padding: "0 2px" }}>×</button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 150px", gap: 8, alignItems: "end" }}>
        <label style={{ fontSize: 12, color: Th.sub }}>Fecha
          <input type="date" value={nueva.fecha} onChange={e => setNueva(n => ({ ...n, fecha: e.target.value }))} style={{ ...campo, marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 12, color: Th.sub }}>Ofrecen ($)
          <div style={{ marginTop: 4 }}><CampoMonto value={nueva.monto} onChange={v => setNueva(n => ({ ...n, monto: v }))} /></div>
        </label>
        <label style={{ fontSize: 12, color: Th.sub }}>Respuesta
          <select value={nueva.respuesta} onChange={e => setNueva(n => ({ ...n, respuesta: e.target.value }))} style={{ ...campo, marginTop: 4 }}>
            {RESPUESTAS.map(r => <option key={r.k} value={r.k}>{r.l}</option>)}
          </select>
        </label>
      </div>
      {nueva.respuesta === "contraoferta" && (
        <label style={{ display: "block", fontSize: 12, color: Th.sub, marginTop: 8, maxWidth: 220 }}>Contraoferta ($)
          <div style={{ marginTop: 4 }}><CampoMonto value={nueva.contraoferta} onChange={v => setNueva(n => ({ ...n, contraoferta: v }))} /></div>
        </label>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <input value={nueva.nota} onChange={e => setNueva(n => ({ ...n, nota: e.target.value }))} placeholder="Nota (opcional): condiciones, plazo, quién ofreció…" style={{ ...campo, flex: 1 }} />
        <Boton tamaño="sm" variante="primario" icono="agregar" onClick={agregar} disabled={guardando || !Number(nueva.monto)}>{guardando ? "Guardando…" : "Agregar"}</Boton>
      </div>
      {error && <div role="alert" style={{ marginTop: 8, fontSize: 13, color: "var(--bad)" }}>{error}</div>}
    </div>
  );
}
