import { fmtMoney } from "../../utils/formatters.js";

// Los números de arriba de Hoy. Atrasadas y Para hoy filtran la lista de Para hacer; Nuevos y Por cobrar llevan a su bloque.
export default function ResumenHoy({ atrasadas, hoy, nuevos, cobrar, foco, onFoco, onIrA }) {
  const items = [
    { k: "atras", l: "Atrasadas", n: atrasadas, sub: "con plazo vencido", tono: atrasadas ? "var(--bad)" : "var(--text)", filtra: true },
    { k: "hoy", l: "Para hoy", n: hoy, sub: "con fecha de hoy", tono: hoy ? "var(--warn)" : "var(--text)", filtra: true },
    { k: "nuevos", l: "Nuevos", n: nuevos, sub: "casos del portal sin abrir", tono: nuevos ? "var(--info)" : "var(--text)", ir: "hoy-nuevos" },
    { k: "cobrar", l: "Por cobrar", n: cobrar ? fmtMoney(cobrar) : "—", sub: "mi neto pendiente", tono: "var(--text)", ir: "hoy-cobros" },
  ];
  return (
    <div className="resumen-hoy" role="group" aria-label="Resumen del día">
      {items.map(it => (
        <button key={it.k} type="button" className="stat" aria-pressed={it.filtra ? foco === it.k : undefined}
          onClick={() => (it.filtra ? onFoco(foco === it.k ? null : it.k) : onIrA(it.ir))}>
          <span className="stat-l">{it.l}</span>
          <span className="stat-n num" style={{ color: it.tono }}>{it.n}</span>
          <span className="stat-s">{it.sub}</span>
        </button>
      ))}
    </div>
  );
}
