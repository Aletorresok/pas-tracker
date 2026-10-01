import { useMemo, useState } from "react";
import { abrirCompania } from "../../utils/companiaAbierta.js";
import { proyeccion } from "../../utils/analisis.js";
import { plazosRespuesta } from "../../utils/metricas.js";
import { useMargenes, guardarMargen, GENERAL, MARGEN_DEFECTO } from "../../utils/margenes.js";
import { useEsCelular } from "../../hooks/useEsCelular.js";

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)" };
const campo = { width: 64, font: "inherit", fontSize: 14, padding: "5px 8px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", textAlign: "right" };
const ANCHO_COL = 132;

// Campo numérico que guarda al salir o con Enter. Vacío = sin valor propio. `guardar(valor)` devuelve true si se guardó.
function Numero({ valor, placeholder, guardar, unidad, max, entero = false, etiqueta, titulo }) {
  const esCelular = useEsCelular();
  const [texto, setTexto] = useState(null);
  const [estado, setEstado] = useState("");
  const alSalir = async () => {
    if (texto === null) return;
    const n = entero ? parseInt(texto, 10) : parseFloat(String(texto).replace(",", "."));
    const nuevo = Number.isFinite(n) && n > 0 && n <= max ? n : null;
    if ((nuevo ?? null) === (valor ?? null)) { setTexto(null); return; }
    const ok = await guardar(nuevo);
    setEstado(ok ? "ok" : "error");
    setTexto(null);
    setTimeout(() => setEstado(""), 1500);
  };
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 2, width: ANCHO_COL }}>
    {esCelular && titulo && <span style={{ fontSize: 11, color: "var(--muted)" }}>{titulo}</span>}
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input inputMode={entero ? "numeric" : "decimal"} aria-label={etiqueta} value={texto ?? (valor ?? "")} placeholder={placeholder}
        onChange={e => setTexto(e.target.value)} onBlur={alSalir} onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()} style={campo} />
      <span style={{ fontSize: 12, color: estado === "ok" ? "var(--ok)" : estado === "error" ? "var(--bad)" : "var(--muted)" }}>
        {estado === "ok" ? "✓" : estado === "error" ? "no se guardó" : unidad}
      </span>
    </span>
    </span>
  );
}

// Análisis → Compañías: margen de reclamo quieto, % de honorarios y plazo de pago de cada compañía, para leer al lado
// de los números. Se editan en la ficha de cada compañía (tocá el nombre); acá solo el margen general, que vale para todas.
const Valor = ({ v, sugerido, unidad }) => (
  <span className="num" style={{ width: ANCHO_COL, fontSize: 14, color: v != null ? "var(--text)" : "var(--muted)" }}>
    {v != null ? `${v} ${unidad}` : sugerido != null ? `≈ ${sugerido} ${unidad}` : "—"}
  </span>
);

export default function CondicionesCompanias({ allCasos, companias }) {
  const margenes = useMargenes();
  const plazos = useMemo(() => plazosRespuesta(allCasos), [allCasos]);
  const { pctHonGeneral, pctHonDatos } = useMemo(() => proyeccion(allCasos, companias || {}), [allCasos, companias]);
  const lista = useMemo(() => {
    const n = {};
    allCasos.forEach(c => { if (c.compania_aseguradora) n[c.compania_aseguradora] = (n[c.compania_aseguradora] || 0) + 1; });
    return Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).map(([nombre, total]) => ({ nombre, total }));
  }, [allCasos]);
  const general = margenes?.[GENERAL] ?? MARGEN_DEFECTO;
  const fila = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" };
  const encabezado = { width: ANCHO_COL, fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4 };
  return (
    <section style={{ ...card, padding: "14px 16px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Condiciones de cada compañía</h2>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--sub)", lineHeight: 1.5 }}>
        Se cambian en la ficha de cada compañía: tocá el nombre. Con "≈" va lo que surge de tus casos cuando la compañía no tiene un valor propio
        {pctHonGeneral != null ? ` (honorarios de todas: ${pctHonGeneral}%)` : ""}.
      </p>
      <div className="hide-mobile" style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingBottom: 6 }}>
        <span style={encabezado}>Reclamo quieto</span>
        <span style={encabezado}>Honorarios</span>
        <span style={encabezado}>Plazo de pago</span>
      </div>
      {margenes === null && <div style={{ fontSize: 13, color: "var(--warn)", padding: "6px 0" }}>Falta correr el SQL 14: el reclamo quieto usa {MARGEN_DEFECTO} días para todas.</div>}
      {margenes !== null && (
        <div style={{ ...fila, borderTop: "none" }}>
          <span><b style={{ fontSize: 14 }}>General</b><span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>para las compañías sin datos ni margen propio</span></span>
          <span style={{ display: "inline-flex", gap: 12 }}>
            <Numero titulo="Reclamo quieto" etiqueta="Reclamo quieto general, en días" valor={margenes[GENERAL] ?? null} placeholder={String(MARGEN_DEFECTO)} unidad="días" max={365} entero
              guardar={v => guardarMargen(GENERAL, v)} />
            <span style={{ width: ANCHO_COL }} />
            <span style={{ width: ANCHO_COL }} />
          </span>
        </div>
      )}
      {lista.map(c => {
        const p = plazos[c.nombre];
        const datos = pctHonDatos(c.nombre);
        const ficha = companias?.[c.nombre];
        const detalle = [`${c.total} ${c.total === 1 ? "caso" : "casos"}`, p && `suele ofrecer a los ${p.promedio} d`].filter(Boolean).join(" · ");
        return (
          <div key={c.nombre} style={fila}>
            <button type="button" onClick={() => abrirCompania(c.nombre)} title="Abrir la ficha para cambiar las condiciones"
              style={{ minWidth: 0, background: "none", border: "none", padding: 0, font: "inherit", textAlign: "left", cursor: "pointer", color: "var(--text)" }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--accent-ink)" }}>{c.nombre}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{detalle}</span>
            </button>
            <span style={{ display: "inline-flex", gap: 12, flexWrap: "wrap" }}>
              <Valor v={margenes?.[c.nombre] ?? null} sugerido={p?.sugerido != null ? Math.max(general, p.sugerido) : general} unidad="días" />
              <Valor v={ficha?.honorarios_pct ?? null} sugerido={datos ?? null} unidad="%" />
              <Valor v={ficha?.plazo_pago_dias ?? null} unidad="días" />
            </span>
          </div>
        );
      })}
    </section>
  );
}
