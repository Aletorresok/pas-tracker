import { useState } from "react";
import { generarEscrito } from "../../utils/generarEscrito.js";

export default function ModalGenerarEscrito({ isOpen, onClose, caso, pasId, dirHandle, onSuccess, onError, Th }) {
  const [dniEscrito, setDniEscrito] = useState("");
  const [opcionesDoc, setOpcionesDoc] = useState({
    licencia: true,
    presupuesto: true,
    estudiosMedicos: false,
    cartaFranquicia: false,
  });
  const [generandoEscrito, setGenerandoEscrito] = useState(false);

  if (!isOpen) return null;

  const handleGenerar = async () => {
    setGenerandoEscrito(true);
    await generarEscrito({
      caso,
      pasId,
      dni: dniEscrito,
      dirHandle,
      opcionesDoc,
      onSuccess: (res) => {
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
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 499 }} onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 500 }}>
        <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 16, padding: "28px 24px", maxWidth: 420, width: "100%" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: Th.text, marginBottom: 18 }}>📝 Generar escrito</div>
          
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
            <button onClick={onClose} style={{ flex: 1, background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: 8, color: Th.sub, padding: "10px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
            <button onClick={handleGenerar} disabled={generandoEscrito || !dniEscrito.trim()} style={{ flex: 2, background: generandoEscrito || !dniEscrito.trim() ? Th.card2 : "#f97316", border: "none", borderRadius: 8, color: "white", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
              {generandoEscrito ? "Generando..." : "Generar PDF"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}