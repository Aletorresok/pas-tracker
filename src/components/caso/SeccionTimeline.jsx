import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatoFecha, fechaLocalISO, diaDeAccion } from "../../utils/formatters.js";
import CambiosDatos from "./CambiosDatos.jsx";

// cambios (opcional): { tabla, filaId, version, puedeRestaurar, valorActual, onRestaurar } → suma la vista "Cambios de datos"
// cliente (opcional, SQL 35): { aviso(texto) → link de WhatsApp o null } → cada movimiento se puede marcar "Lo ve el cliente"
// editarId: abre la edición de ese movimiento (por ejemplo, desde "Últimos movimientos" de Resumen); onEditarAbierto lo limpia
export default function SeccionTimeline({ acciones, loading, onCrear, onActualizar, onEliminar, cambios, cliente, editarId, onEditarAbierto, avisoPas = false, Th }) {
  const [vista, setVista] = useState("movimientos"); // movimientos | cambios
  const [visible, setVisible] = useState(false);
  const [textoCliente, setTextoCliente] = useState("");
  const [avisar, setAvisar] = useState(null); // link de WhatsApp para contarle la novedad recién marcada
  const [modalOpen, setModalOpen] = useState(false);
  const [fecha, setFecha] = useState(fechaLocalISO());
  const [fechaOriginal, setFechaOriginal] = useState(""); // al editar: si no cambia, se conserva la hora guardada
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // Guardamos solo el ID, no todo el objeto
  const [rapida, setRapida] = useState("");
  const [guardandoRapida, setGuardandoRapida] = useState(false);

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;

  const abrirNueva = () => { 
    setEditandoId(null); 
    setFecha(fechaLocalISO()); 
    setDescripcion(""); 
    setVisible(false); setTextoCliente("");
    setModalOpen(true); 
  };
  
  const abrirEditar = (a, mostrar = false) => { 
    setEditandoId(a.id); // ID exacto de la base de datos
    setFecha(diaDeAccion(a.fecha)); setFechaOriginal(diaDeAccion(a.fecha));
    setDescripcion(a.descripcion || ""); 
    setVisible(mostrar || !!a.visible_cliente); setTextoCliente(a.texto_cliente || "");
    setModalOpen(true); 
  };
  
  useEffect(() => {
    if (!editarId) return;
    const a = acciones.find(x => x.id === editarId);
    if (a) abrirEditar(a);
    onEditarAbierto?.();
  }, [editarId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cerrar = () => {
    setModalOpen(false); 
    setDescripcion(""); 
    setEditandoId(null); 
  };

  const handleGuardar = async () => {
    if (!descripcion.trim()) return;
    setGuardando(true);

    const paraCliente = cliente ? { visible_cliente: visible, texto_cliente: visible && textoCliente.trim() ? textoCliente.trim() : null } : {};
    if (editandoId) {
      // Es una edición explícita
      await onActualizar({ id: editandoId, fecha: fecha === fechaOriginal ? undefined : fecha, descripcion: descripcion.trim(), ...paraCliente });
    } else {
      // Es una creación explícita
      await onCrear({ fecha, descripcion: descripcion.trim(), ...paraCliente });
    }
    // Recién marcada para el cliente: ofrecer avisarle
    setAvisar(cliente && visible ? cliente.aviso?.(textoCliente.trim() || descripcion.trim()) || null : null);

    setGuardando(false);
    cerrar();
  };

  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: Th.text }}>Bitácora</div>
          {cambios && (
            <span role="group" aria-label="Qué ver" className="segmentado">
              {[["movimientos", "Movimientos"], ["cambios", "Cambios de datos"]].map(([k, l]) => (
                <button key={k} type="button" aria-pressed={vista === k} onClick={() => setVista(k)}>{l}</button>
              ))}
            </span>
          )}
        </div>
        {vista === "movimientos" && (
          <button onClick={abrirNueva} style={{ background: "none", border: "none", color: "var(--accent-ink)", padding: 0, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            Con otra fecha…
          </button>
        )}
      </div>
      {vista === "cambios" && cambios ? <CambiosDatos {...cambios} Th={Th} /> : <>
      {avisar && (
        <div role="status" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12, padding: "10px 12px", borderRadius: "var(--r-sm)", background: "color-mix(in srgb, var(--ok) 10%, var(--card))", fontSize: 13 }}>
          <span style={{ flex: "1 1 200px" }}>El cliente ya lo ve en su vista. ¿Le avisás?</span>
          <a href={avisar} target="_blank" rel="noopener noreferrer" onClick={() => setAvisar(null)} style={{ fontWeight: 700, color: "var(--accent-ink)" }}>Avisarle por WhatsApp</a>
          <button type="button" onClick={() => setAvisar(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>No</button>
        </div>
      )}
      <form onSubmit={async e => { e.preventDefault(); if (!rapida.trim()) return; setGuardandoRapida(true); await onCrear({ fecha: fechaLocalISO(), descripcion: rapida.trim() }); setRapida(""); setGuardandoRapida(false); }}
        style={{ display: "flex", gap: 8 }}>
        <input value={rapida} onChange={e => setRapida(e.target.value)} placeholder="Agregar movimiento de hoy y Enter…" aria-label="Nuevo movimiento" style={{ ...inputStyle, padding: "8px 12px" }} />
        <button type="submit" disabled={guardandoRapida || !rapida.trim()} style={{ flex: "none", padding: "0 14px", borderRadius: "var(--r-sm)", border: "none", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 600, cursor: "pointer", opacity: guardandoRapida || !rapida.trim() ? 0.5 : 1 }}>
          {guardandoRapida ? "…" : "Agregar"}
        </button>
      </form>

      {loading && <div style={{ color: Th.muted, fontSize: 13 }}>Cargando...</div>}
      {!loading && acciones.length === 0 && (
        <div style={{ color: Th.muted, fontSize: 13, textAlign: "center", padding: "12px 0" }}>Sin acciones registradas aún</div>
      )}

      <div style={{ paddingLeft: 4, marginTop: 12 }}>
        {acciones.map((a, i) => (
          <div key={a.id || i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: i === 0 ? "var(--accent)" : Th.border, marginTop: 3, flexShrink: 0, border: i === 0 ? "2px solid color-mix(in srgb, var(--accent) 27%, transparent)" : "none" }} />
              {i < acciones.length - 1 && <div style={{ width: 1, flex: 1, background: Th.border, marginTop: 4, minHeight: 18 }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: 6 }}>
              <div style={{ fontSize: 11, color: i === 0 ? "var(--accent)" : Th.muted, fontWeight: i === 0 ? 700 : 500, marginBottom: 2 }}>
                {formatoFecha(diaDeAccion(a.fecha))}{i === 0 ? " · más reciente" : ""}
              </div>
              <div role="button" tabIndex={0} title="Tocá para editar el texto o la fecha" onClick={() => abrirEditar(a)} onKeyDown={e => { if (e.key === "Enter") abrirEditar(a); }}
                style={{ fontSize: 13, color: Th.sub, lineHeight: 1.5, marginBottom: 8, cursor: "text", overflowWrap: "anywhere" }}>{a.descripcion}</div>
              {cliente && a.visible_cliente && (
                <div style={{ fontSize: 12.5, lineHeight: 1.45, marginBottom: 8, padding: "6px 10px", borderRadius: "var(--r-xs)", background: "color-mix(in srgb, var(--ok) 8%, transparent)", color: Th.text }}>
                  <b style={{ color: "var(--ok)", fontWeight: 700 }}>Lo ve el cliente</b>{a.texto_cliente ? <>: “{a.texto_cliente}”</> : " (con este mismo texto)"}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => abrirEditar(a)} style={{ background: "none", border: "1px solid var(--border2)", borderRadius: "var(--r-xs)", color: "var(--sub)", padding: "3px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Editar</button>
                {cliente && !a.visible_cliente && <button onClick={() => abrirEditar(a, true)} style={{ background: "none", border: "1px solid color-mix(in srgb, var(--ok) 45%, transparent)", borderRadius: "var(--r-xs)", color: "var(--ok)", padding: "3px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Mostrar al cliente</button>}
                <button onClick={() => onEliminar(a.id)} style={{ background: "none", border: "none", borderRadius: "var(--r-xs)", color: "var(--bad)", padding: "3px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      </>}

      {modalOpen && createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 9998 }} onClick={cerrar} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999 }}>
            <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: "28px 24px", maxWidth: 440, width: "100%" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: Th.text, marginBottom: 18 }}>
                {editandoId ? "Editar acción" : "Registrar acción"}
              </div>
              <label style={{ display: "block", marginBottom: 14 }}>
                <span style={labelStyle}>Fecha</span>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: "block", marginBottom: 20 }}>
                <span style={labelStyle}>Descripción *</span>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej: Natalia aceptó el ofrecimiento..." rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} />
                {avisoPas && <span style={{ display: "block", fontSize: 11, color: Th.muted, marginTop: 4 }}>El PAS ve este movimiento, con esta fecha y este texto, en su portal.</span>}
              </label>
              {cliente && (
                <div style={{ marginTop: -8, marginBottom: 20, display: "grid", gap: 8 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: Th.text, cursor: "pointer" }}>
                    <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} style={{ accentColor: "var(--ok)" }} />
                    Lo ve el cliente (en su vista del reclamo)
                  </label>
                  {visible && (
                    <label style={{ display: "block" }}>
                      <span style={labelStyle}>Cómo lo lee el cliente (si lo dejás vacío, ve la descripción)</span>
                      <textarea value={textoCliente} onChange={e => setTextoCliente(e.target.value)} placeholder="Ej: Presentamos el reclamo ante la compañía." rows={2} style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} />
                    </label>
                  )}
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={cerrar} style={{ flex: 1, background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: "var(--r-sm)", color: Th.sub, padding: "10px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
                <button onClick={handleGuardar} disabled={guardando || !descripcion.trim()} style={{ flex: 2, background: guardando || !descripcion.trim() ? Th.card2 : "var(--accent)", border: "none", borderRadius: "var(--r-sm)", color: "var(--on-accent)", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700, opacity: guardando || !descripcion.trim() ? 0.5 : 1 }}>
                  {guardando ? "Guardando..." : editandoId ? "✓ Actualizar" : "✓ Guardar acción"}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}