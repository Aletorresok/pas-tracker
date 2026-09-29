import { describirPlazo } from "../../utils/formatters.js";
import { propsMenu } from "./MenuContextual.jsx";

const NIVEL = { vencido: "var(--bad)", hoy: "var(--warn)", pronto: "var(--warn)", tranquilo: "var(--info)" };

// Tarjeta redonda de tarea/cobro (estilos .tc-* en index.css).
// derecha: texto fijo (monto); accion: { texto, onClick, deshabilitada } aparece al pasar el mouse.
// menu: () => ítems del menú de acciones (click derecho).
// dragProps: atributos y listeners de dnd-kit (los pone ListaOrdenable).
export default function TarjetaTarea({ menu, chip, vence, tipo, titulo, detalle, derecha, accion, onClick, dragging = false, dragProps }) {
  const p = vence ? describirPlazo(vence) : null;
  const color = p ? NIVEL[p.nivel] : "var(--muted)";
  const parar = e => e.stopPropagation();
  return (
    <div className="tc" data-dragging={dragging} style={{ "--nivel": color }} onClick={onClick} {...dragProps} {...(menu ? propsMenu(menu) : {})}
      onKeyDown={e => { if (e.key === "Enter" && e.target === e.currentTarget) onClick?.(); dragProps?.onKeyDown?.(e); }}>
      <span className="tc-asa" aria-hidden="true">
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          {[2, 8, 14].flatMap(y => [2, 8].map(x => <circle key={`${x}${y}`} cx={x} cy={y} r="1.4" />))}
        </svg>
      </span>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {chip || <span className="tc-chip num">{p ? p.texto : "Sin plazo"}</span>}
          {tipo && <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: ".02em" }}>{tipo}</span>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</div>
        {detalle && <div style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{detalle}</div>}
      </div>

      <div style={{ position: "relative", minWidth: accion ? 96 : 0, display: "grid", justifyItems: "end" }}>
        {derecha && <span className={`num ${accion ? "tc-monto" : ""}`} style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{derecha}</span>}
        {accion && (
          <button type="button" className="tc-accion" disabled={accion.deshabilitada} title={accion.titulo}
            style={{ position: derecha ? "absolute" : "static", right: 0 }}
            onPointerDown={parar} onKeyDown={parar} onClick={e => { parar(e); accion.onClick?.(); }}>
            {accion.texto}
          </button>
        )}
      </div>
    </div>
  );
}
