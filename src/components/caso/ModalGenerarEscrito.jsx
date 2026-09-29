import { useState, useEffect } from "react";
import { cargarCompania } from "../../utils/ofertas.js";
import { faltantes } from "../../utils/companias.js";
import { abrirCompania } from "../../utils/companiaAbierta.js";

export default function ModalGenerarEscrito({ dniInicial = "", onDniNuevo, isOpen, onClose, caso, pasId, dirHandle, onSuccess, onError, Th }) {
  const [dniEscrito, setDniEscrito] = useState("");
  const [opcionesDoc, setOpcionesDoc] = useState({
    licencia: true,
    presupuesto: true,
    estudiosMedicos: false,
    cartaFranquicia: false,
  });
  const [generandoEscrito, setGenerandoEscrito] = useState(false);
  const [ficha, setFicha] = useState(null); // datos de la compañía para el encabezado
  useEffect(() => { if (isOpen && caso?.compania_aseguradora) cargarCompania(caso.compania_aseguradora).then(setFicha); }, [isOpen, caso?.compania_aseguradora]);

  // Si el caso ya tiene DNI cargado, se completa solo
  useEffect(() => { if (isOpen) setDniEscrito(dniInicial || ""); }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const handleGenerar = async () => {
    setGenerandoEscrito(true);
    const { generarEscrito } = await import("../../utils/generarEscrito.js");
    await generarEscrito({
      caso,
      pasId,
      dni: dniEscrito,
      dirHandle,
      opcionesDoc,
      compania: ficha,
      onSuccess: (res) => {
        // Si el caso no tenía DNI, queda guardado (lo usa el acceso del cliente)
        if (!String(dniInicial || "").trim() && dniEscrito.trim()) onDniNuevo?.(dniEscrito.trim());
        setDniEscrito("");
        onSuccess(res);
        onClose();
      },
      onError
    });
    setGenerandoEscrito(false);
  };

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 499 }} onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 500 }}>
        <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: "28px 24px", maxWidth: 420, width: "100%" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: Th.text, marginBottom: 18 }}>Generar escrito</div>
          
          {caso?.compania_aseguradora && (() => {
            const falta = faltantes(ficha || {});
            return (
              <div style={{ fontSize: 12, marginBottom: 14, padding: "8px 12px", borderRadius: "var(--r-sm)", background: falta.length ? "color-mix(in srgb, var(--warn) 10%, transparent)" : "color-mix(in srgb, var(--ok) 10%, transparent)", color: falta.length ? "var(--warn)" : "var(--ok)" }}>
                {falta.length ? `A la ficha de ${caso.compania_aseguradora} le falta ${falta.join(", ")}: el escrito sale con lo que haya. ` : `Encabezado con la razón social, CUIT y domicilio de ${caso.compania_aseguradora}. `}
                <button type="button" onClick={() => { onClose(); abrirCompania(caso.compania_aseguradora); }} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, color: "var(--accent-ink)", cursor: "pointer" }}>{falta.length ? "Completar ficha" : "Ver ficha"}</button>
              </div>
            );
          })()}

          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={labelStyle}>DNI del asegurado *</span>
            <input value={dniEscrito} onChange={e => setDniEscrito(e.target.value)} placeholder="Ej: 25123456" style={Th.input} />
          </label>

          <div style={{ marginBottom: 18 }}>
            <span style={{ ...labelStyle, marginBottom: 8 }}>Documental adicional a incluir:</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: Th.text }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={opcionesDoc.licencia} onChange={e => setOpcionesDoc(p => ({ ...p, licencia: e.target.checked }))} />
                Licencia de conducir
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={opcionesDoc.presupuesto} onChange={e => setOpcionesDoc(p => ({ ...p, presupuesto: e.target.checked }))} />
                Presupuesto
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={opcionesDoc.estudiosMedicos} onChange={e => setOpcionesDoc(p => ({ ...p, estudiosMedicos: e.target.checked }))} />
                Estudios médicos / Constancia de atención
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={opcionesDoc.cartaFranquicia} onChange={e => setOpcionesDoc(p => ({ ...p, cartaFranquicia: e.target.checked }))} />
                Carta de franquicia
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: "var(--r-sm)", color: Th.sub, padding: "10px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
            <button onClick={handleGenerar} disabled={generandoEscrito || !dniEscrito.trim()} style={{ flex: 2, background: generandoEscrito || !dniEscrito.trim() ? Th.card2 : "var(--warn)", border: "none", borderRadius: "var(--r-sm)", color: "var(--on-accent)", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
              {generandoEscrito ? "Generando..." : "Generar PDF"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}