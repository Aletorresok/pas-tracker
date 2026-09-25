import { fmtMoney, fechaLocalISO } from "../../utils/formatters.js";
import { indemnizacionPagada, honorariosCobrados, tieneHonorarios } from "../../utils/metricas.js";
import Icono from "../ui/Icono.jsx";

const num = v => Number(v) || 0;

// Dos pagos independientes: la indemnización al asegurado y mis honorarios. Cada compañía los paga cuando quiere,
// así que se tildan por separado (con su fecha). Cuando están los dos, el caso pasa solo a "Cobrado".
export default function SeccionPagos({ formData, onChange, Th, compacto = false }) {
  const indem = indemnizacionPagada(formData);
  const hon = honorariosCobrados(formData);
  const conHonorarios = tieneHonorarios(formData);

  // Ajusta el estado del caso según lo que quedó pagado
  const acomodarEstado = (indemOk, honOk) => {
    const completo = indemOk && (honOk || !conHonorarios);
    if (completo && formData.estado !== "cobrado") onChange("estado", "cobrado");
    else if (!completo && formData.estado === "cobrado") {
      onChange("estado", "esperando_pago");
      // Al salir de "Cobrado", lo que sigue pagado necesita su fecha propia (los casos viejos no la tienen)
      if (indemOk && !formData.fecha_cobro) onChange("fecha_cobro", fechaLocalISO());
      if (honOk && !formData.fecha_cobro_honorarios) { onChange("fecha_cobro_honorarios", fechaLocalISO()); onChange("estado_honorarios", "COBRADO"); }
    }
  };

  const tildarIndemnizacion = () => {
    if (indem) onChange("fecha_cobro", "");
    else onChange("fecha_cobro", fechaLocalISO());
    acomodarEstado(!indem, hon);
  };
  const tildarHonorarios = () => {
    if (hon) {
      onChange("fecha_cobro_honorarios", "");
      onChange("estado_honorarios", formData.fecha_factura ? "FACTURADO" : "NO_FACTURADO");
    } else {
      onChange("fecha_cobro_honorarios", fechaLocalISO());
      onChange("estado_honorarios", "COBRADO");
    }
    acomodarEstado(indem, !hon);
  };

  const filas = [
    { k: "indem", l: "Indemnización pagada al asegurado", monto: num(formData.monto_cobro_asegurado), ok: indem, fecha: "fecha_cobro", tildar: tildarIndemnizacion },
    ...(conHonorarios || hon ? [{ k: "hon", l: "Mis honorarios cobrados", monto: num(formData.monto_cobro_yo), ok: hon, fecha: "fecha_cobro_honorarios", tildar: tildarHonorarios }] : []),
  ];

  const contenido = filas.map((f, i) => (
    <div key={f.k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i || compacto ? `1px solid ${Th.border}` : "none", flexWrap: "wrap" }}>
      <button type="button" onClick={f.tildar} aria-pressed={f.ok}
        style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", color: Th.text, flex: "1 1 200px", minWidth: 0, textAlign: "left" }}>
        <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 5, flex: "none", display: "grid", placeItems: "center", background: f.ok ? "var(--ok)" : "transparent", border: `1.5px solid ${f.ok ? "var(--ok)" : "var(--border2)"}`, color: "#fff" }}>
          {f.ok && <Icono nombre="check" size={12} />}
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{f.l}</span>
          {f.monto > 0 && <span className="num" style={{ display: "block", fontSize: 12, color: Th.sub }}>{fmtMoney(f.monto)}</span>}
        </span>
      </button>
      {f.ok
        ? <input type="date" value={formData[f.fecha] || ""} onChange={e => onChange(f.fecha, e.target.value)} aria-label={`Fecha: ${f.l}`} style={{ ...Th.input, width: 150, padding: "6px 8px", fontSize: 13 }} />
        : <span style={{ fontSize: 12, color: Th.muted }}>pendiente</span>}
    </div>
  ));

  if (compacto) return <div style={{ marginTop: 6 }}>{contenido}</div>;
  return (
    <div style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: Th.text, marginBottom: 4 }}>Pagos</div>
      <div style={{ fontSize: 12, color: Th.sub, marginBottom: 6 }}>Tildá cada uno cuando la compañía lo paga. Con los dos, el caso pasa a "Cobrado".</div>
      {contenido}
    </div>
  );
}
