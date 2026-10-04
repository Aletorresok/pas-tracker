import { useState, useRef, useEffect } from "react";
import { estadoInfo } from "../../constants.js";
import { fechasAlCambiarEstado, datosQueSobran } from "../../utils/flujoEstados.js";
import { fechaPagoEstimada } from "../../utils/vistaCliente.js";
import { fechaLocalISO, fmtDate, fmtMoney, diasEntreFechas } from "../../utils/formatters.js";
import CampoMonto from "../ui/CampoMonto.jsx";
import Boton from "../ui/Boton.jsx";

const iso = v => (v ? String(v).slice(0, 10) : "");
const mostrar = d => (d.fecha ? fmtDate(d.valor) : d.campo === "plazo_pago" ? `${d.valor} d` : fmtMoney(Number(d.valor)));

// Lo que se pregunta al mover un caso de etapa, en el mismo lugar desde la ficha, la tabla o el tablero:
// · Esperando pago: fecha de pago y monto acordado (de ahí sale el aviso de Hoy)
// · Cobrado: cuánto cobró el asegurado y cuándo
// · Desistido: el motivo (queda en la bitácora)
// · Volver a una etapa anterior: qué datos de las etapas posteriores borrar
// onConfirmar({ cambios, nota }): cambios ya con null para lo que se borra. Enter confirma, Escape cancela.
export default function DialogoEtapa({ caso, nuevo, plazoCompania = null, onConfirmar, onCancelar }) {
  const hoy = fechaLocalISO();
  const sobran = datosQueSobran(caso, nuevo);
  const [borrar, setBorrar] = useState(() => Object.fromEntries(sobran.map(d => [d.campo, d.marcado])));

  // Esperando pago: la fecha que calcularía la app (firma o aceptación de hoy + plazo de la compañía)
  const conFechas = { ...caso, ...fechasAlCambiarEstado(caso, nuevo, hoy), plazo_pago: Number(caso.plazo_pago) || plazoCompania || caso.plazo_pago };
  const [fechaPago, setFechaPago] = useState(() => iso(fechaPagoEstimada(conFechas)) || "");
  const [acordado, setAcordado] = useState(() => String(Number(caso.monto_acordado) || Number(caso.monto_ofrecimiento) || ""));
  const [cobrado, setCobrado] = useState(() => String(Number(caso.monto_cobro_asegurado) || Number(caso.monto_acordado) || Number(caso.monto_ofrecimiento) || ""));
  const [fechaCobro, setFechaCobro] = useState(() => iso(caso.fecha_cobro) || hoy);
  const [motivo, setMotivo] = useState("");

  // Foco en el primer campo (o la primera casilla) para escribir y confirmar con Enter
  const dialogo = useRef(null);
  useEffect(() => { dialogo.current?.querySelector("input")?.focus(); }, []);

  const confirmar = () => {
    const cambios = {};
    sobran.forEach(d => { if (borrar[d.campo]) cambios[d.campo] = null; });
    let nota = "";
    if (nuevo === "esperando_pago") {
      if (Number(acordado)) cambios.monto_acordado = Number(acordado);
      if (fechaPago) {
        cambios.fecha_pago = fechaPago;
        // La fecha que manda es firma (o aceptación) + plazo: el plazo se ajusta para que dé la fecha elegida
        const base = iso(conFechas.fecha_firma || conFechas.fecha_aceptacion) || hoy;
        const plazo = diasEntreFechas(base, fechaPago);
        if (plazo >= 0) cambios.plazo_pago = plazo;
      }
    }
    if (nuevo === "cobrado") {
      if (Number(cobrado)) cambios.monto_cobro_asegurado = Number(cobrado);
      if (fechaCobro) cambios.fecha_cobro = fechaCobro;
    }
    if (nuevo === "desistido") nota = motivo.trim();
    onConfirmar({ cambios, nota });
  };

  const tecla = e => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancelar(); }
    if (e.key === "Enter" && e.target.tagName !== "BUTTON" && e.target.type !== "checkbox") { e.preventDefault(); confirmar(); }
  };

  const etiqueta = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--sub)", flex: "1 1 160px", minWidth: 0 };
  const campo = { width: "100%", boxSizing: "border-box", padding: "7px 10px", borderRadius: "var(--r-xs)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" };
  const vuelve = sobran.length > 0;
  const titulo = vuelve ? `¿Volver a ${estadoInfo(nuevo).label}?` : `Pasar a ${estadoInfo(nuevo).label}`;

  return (
    <div onClick={onCancelar} style={{ position: "fixed", inset: 0, zIndex: 650, background: "color-mix(in srgb, #000 45%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div ref={dialogo} role="dialog" aria-modal="true" aria-labelledby="titulo-etapa" onClick={e => e.stopPropagation()} onKeyDown={tecla} className="slide-up"
        style={{ width: "100%", maxWidth: 460, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-3)", padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{caso.asegurado || "Sin nombre"}</div>
          <h2 id="titulo-etapa" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{titulo}</h2>
        </div>

        {vuelve && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.45 }}>Estaba en {estadoInfo(caso.estado).label}. Estos datos son de etapas posteriores; marcá los que hay que borrar:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--card2)", borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
              {sobran.map((d, i) => (
                <label key={d.campo} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text)", cursor: "pointer" }}>
                  <input type="checkbox" checked={!!borrar[d.campo]}
                    onChange={e => setBorrar(b => ({ ...b, [d.campo]: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: "var(--accent)", margin: 0, flex: "none" }} />
                  <span>{d.label} · <span className="num" style={{ color: "var(--sub)" }}>{mostrar(d)}</span></span>
                </label>
              ))}
            </div>
          </div>
        )}

        {nuevo === "esperando_pago" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={etiqueta}>Fecha de pago
              <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} style={campo} />
            </label>
            <label style={etiqueta}>Monto acordado
              <CampoMonto value={acordado} onChange={setAcordado} />
            </label>
          </div>
        )}
        {nuevo === "cobrado" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={etiqueta}>Lo que cobró el asegurado
              <CampoMonto value={cobrado} onChange={setCobrado} />
            </label>
            <label style={etiqueta}>Fecha de cobro
              <input type="date" value={fechaCobro} onChange={e => setFechaCobro(e.target.value)} style={campo} />
            </label>
          </div>
        )}
        {nuevo === "desistido" && (
          <label style={etiqueta}>Motivo (queda en la bitácora)
            <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej.: el cliente no quiso seguir" style={campo} />
          </label>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--muted)", marginRight: "auto" }}>Enter para confirmar</span>
          <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
          <Boton variante="primario" onClick={confirmar}>{vuelve ? "Volver" : "Mover"}</Boton>
        </div>
      </div>
    </div>
  );
}
