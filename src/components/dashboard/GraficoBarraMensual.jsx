import { useState, useRef, useEffect } from "react";
import { fmtMoney } from "../../utils/formatters.js";

// Honorarios por mes (una sola serie). Mes actual en color de acento, el resto atenuado.
// Hover o foco muestra el monto; clic filtra el detalle del mes.
const ALTO = 150, IZQ = 44, ABAJO = 22, ARRIBA = 8;

function escala(max) {
  const pasos = [1, 2, 2.5, 5, 10];
  const bruto = max / 3;
  const pot = Math.pow(10, Math.floor(Math.log10(bruto || 1)));
  const paso = pasos.map(p => p * pot).find(p => p >= bruto) || pot * 10;
  return { paso, tope: Math.max(paso * 3, paso * Math.ceil(max / paso)) };
}
const abreviar = v => (v >= 1e6 ? `${(v / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M` : v >= 1e3 ? `${Math.round(v / 1e3)} k` : String(v));

export default function GraficoBarraMensual({ datos, mesSeleccionado, onClickMes }) {
  const [hover, setHover] = useState(null);
  // El SVG se dibuja al ancho real del contenedor para que el texto no se achique
  const cajaRef = useRef(null);
  const [ANCHO, setAncho] = useState(480);
  useEffect(() => {
    const el = cajaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const max = Math.max(...datos.map(d => d.valor), 1);
  const { paso, tope } = escala(max);
  const ticks = [];
  for (let v = 0; v <= tope; v += paso) ticks.push(v);
  const altoPlot = ALTO - ABAJO - ARRIBA;
  const y = v => ARRIBA + altoPlot - (v / tope) * altoPlot;
  const banda = (ANCHO - IZQ) / datos.length;
  const anchoBarra = Math.min(24, banda * 0.6);
  const activo = hover ?? mesSeleccionado;
  const dActivo = datos.find(d => d.key === activo);

  return (
    <div ref={cajaRef} style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} width={ANCHO} height={ALTO} role="img" aria-label="Honorarios cobrados por mes, últimos 12 meses" style={{ display: "block", overflow: "visible" }}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={IZQ} x2={ANCHO} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={IZQ - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" style={{ fontVariantNumeric: "tabular-nums" }}>{abreviar(v)}</text>
          </g>
        ))}
        {datos.map((d, i) => {
          const x = IZQ + i * banda + (banda - anchoBarra) / 2;
          const h = Math.max(y(0) - y(d.valor), d.valor > 0 ? 2 : 0);
          const esActual = i === datos.length - 1;
          const seleccionado = d.key === mesSeleccionado;
          const r = Math.min(4, h);
          const color = seleccionado || esActual ? "var(--accent)" : "color-mix(in srgb, var(--accent) 45%, var(--card))";
          return (
            <g key={d.key}
              onMouseEnter={() => setHover(d.key)} onMouseLeave={() => setHover(null)}
              onClick={() => d.valor > 0 && onClickMes?.(seleccionado ? null : d.key)}
              style={{ cursor: d.valor > 0 ? "pointer" : "default" }}>
              <rect x={IZQ + i * banda} y={ARRIBA} width={banda} height={altoPlot + ABAJO} fill="transparent" />
              {h > 0 && (
                <path d={`M${x},${y(0)} V${y(0) - h + r} Q${x},${y(0) - h} ${x + r},${y(0) - h} H${x + anchoBarra - r} Q${x + anchoBarra},${y(0) - h} ${x + anchoBarra},${y(0) - h + r} V${y(0)} Z`} fill={color} />
              )}
              <text x={x + anchoBarra / 2} y={ALTO - 6} textAnchor="middle" fontSize="11"
                fill={esActual || seleccionado ? "var(--text)" : "var(--muted)"} fontWeight={esActual || seleccionado ? 700 : 400}>{d.mes}</text>
            </g>
          );
        })}
      </svg>
      <div aria-live="polite" style={{ minHeight: 20, fontSize: 12, color: "var(--sub)", marginTop: 4 }}>
        {dActivo
          ? <><b style={{ color: "var(--text)" }}>{dActivo.mes} {dActivo.anio}:</b> <span className="num">{fmtMoney(dActivo.valor)}</span>{dActivo.valor > 0 && !mesSeleccionado ? " · clic para ver los casos" : ""}</>
          : "Pasá el mouse o tocá una barra para ver el monto."}
      </div>
    </div>
  );
}
