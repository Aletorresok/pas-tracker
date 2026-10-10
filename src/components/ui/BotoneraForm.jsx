import Boton from "./Boton.jsx";

// Pie de los formularios de edición: Borrar (si ya existe) a la izquierda; Cancelar y Guardar a la derecha
export default function BotoneraForm({ onBorrar, onCancelar, onGuardar, guardando, deshabilitado, style }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap", marginTop: 4, ...style }}>
      {onBorrar ? <Boton variante="peligro" onClick={onBorrar}>Borrar</Boton> : <span />}
      <span style={{ display: "flex", gap: 8 }}>
        <Boton variante="fantasma" onClick={onCancelar}>Cancelar</Boton>
        <Boton variante="primario" onClick={onGuardar} disabled={guardando || deshabilitado}>{guardando ? "Guardando…" : "Guardar"}</Boton>
      </span>
    </div>
  );
}
