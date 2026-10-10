import Icono from "./Icono.jsx";

// Ventana de ficha (caso, expediente): fondo, panel centrado y franja fija arriba con la X de cerrar.
// `encabezado` va en la franja fija (identidad, acciones, pestañas); `children` es el cuerpo.
export default function VentanaFicha({ etiqueta, onCerrar, dialogoRef, Th, encabezado, estiloCuerpo, children }) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 400 }} onClick={onCerrar} />
      <div ref={dialogoRef} className="modal-panel" role="dialog" aria-modal="true" aria-label={etiqueta}
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 401, width: "100%", maxWidth: 1000, maxHeight: "92vh", overflow: "auto", padding: 16 }}>
        <div style={{ background: Th.bg, border: `1px solid ${Th.border}`, borderRadius: "var(--r-lg)", boxShadow: "var(--sh-3)", minHeight: "60vh" }}>
          <div className="modal-sticky" style={{ position: "sticky", background: Th.card, borderRadius: "var(--r-lg) var(--r-lg) 0 0", borderBottom: `1px solid ${Th.border}`, padding: "16px 20px 0", zIndex: 50 }}>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ position: "absolute", top: 14, right: 16, background: Th.card2, border: `1px solid ${Th.border}`, borderRadius: "var(--r-sm)", color: Th.sub, width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer" }}>
              <Icono nombre="cerrar" size={16} />
            </button>
            {encabezado}
          </div>
          <div style={{ padding: 20, ...estiloCuerpo }}>{children}</div>
        </div>
      </div>
    </>
  );
}
