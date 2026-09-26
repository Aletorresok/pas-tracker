import { useMemo, useState } from "react";
import { guardarCompania } from "../../utils/ofertas.js";
import { proyeccion } from "../../utils/analisis.js";
import { plazosRespuesta } from "../../utils/metricas.js";
import { useMargenes, guardarMargen, GENERAL, MARGEN_DEFECTO } from "../../utils/margenes.js";
import { useEsCelular } from "../../hooks/useEsCelular.js";

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 };
const campo = { width: 64, font: "inherit", fontSize: 14, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", textAlign: "right" };
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

// Análisis → Compañías: margen de reclamo quieto, % de honorarios y plazo de pago de cada compañía, en una sola tabla.
export default function CondicionesCompanias({ allCasos, companias, onGuardado }) {
  const margenes = useMargenes();
  const plazos = useMemo(() => plazosRespuesta(allCasos), [allCasos]);
  const { pctHonGeneral, pctHonDatos } = useMemo(() => proyeccion(allCasos, companias || {}), [allCasos, companias]);
  const lista = useMemo(() => {
    const n = {};
    allCasos.forEach(c => { if (c.compania_aseguradora) n[c.compania_aseguradora] = (n[c.compania_aseguradora] || 0) + 1; });
    return Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).map(([nombre, total]) => ({ nombre, total }));
  }, [allCasos]);

  const general = margenes?.[GENERAL] ?? MARGEN_DEFECTO;
  const guardarEnCompania = (nombre, campoDb) => async v => { const err = await guardarCompania(nombre, { [campoDb]: v }); if (!err) onGuardado?.(); return !err; };
  const fila = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" };
  const encabezado = { width: ANCHO_COL, fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4 };

  return (
    <section style={{ ...card, padding: "14px 16px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Condiciones de cada compañía</h2>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--sub)", lineHeight: 1.5 }}>
        <b>Reclamo quieto</b>: días sin respuesta antes de que Hoy te avise para reiterar (vacío = lo que tardó en responder el 75% de sus reclamos, o el general).{" "}
        <b>Honorarios</b>: % sobre la indemnización, para la proyección (vacío = lo que surge de tus casos cobrados{pctHonGeneral != null ? `, o el de todas: ${pctHonGeneral}%` : ""}).{" "}
        <b>Plazo de pago</b>: días que suele tener para pagar desde la aceptación o la firma; se copia al caso si no tiene plazo.
        Se guarda al salir de cada campo.
      </p>

      <div className="hide-mobile" style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingBottom: 6 }}>
        <span style={encabezado}>Reclamo quieto</span>
        <span style={encabezado}>Honorarios</span>
        <span style={encabezado}>Plazo de pago</span>
      </div>

      {margenes === null && <div style={{ fontSize: 13, color: "var(--warn)", padding: "6px 0" }}>Falta correr el SQL 14: el reclamo quieto usa {MARGEN_DEFECTO} días para todas.</div>}
      {companias === null && <div style={{ fontSize: 13, color: "var(--warn)", padding: "6px 0" }}>Falta correr el SQL 21: honorarios y plazo de pago no se pueden guardar.</div>}

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
        const quietoEfectivo = p?.sugerido != null ? Math.max(general, p.sugerido) : general;
        const detalle = [
          `${c.total} ${c.total === 1 ? "caso" : "casos"}`,
          p && `suele ofrecer a los ${p.promedio} d`,
          datos != null && `en tus casos pagó ${datos}% de honorarios`,
        ].filter(Boolean).join(" · ");
        return (
          <div key={c.nombre} style={fila}>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14 }}>{c.nombre}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{detalle}</span>
            </span>
            <span style={{ display: "inline-flex", gap: 12, flexWrap: "wrap" }}>
              <Numero titulo="Reclamo quieto" etiqueta={`${c.nombre}: reclamo quieto en días`} valor={margenes?.[c.nombre] ?? null} placeholder={String(quietoEfectivo)} unidad="días" max={365} entero
                guardar={v => guardarMargen(c.nombre, v)} />
              <Numero titulo="Honorarios" etiqueta={`${c.nombre}: honorarios en %`} valor={companias?.[c.nombre]?.honorarios_pct ?? null} placeholder={String(datos ?? pctHonGeneral ?? "")} unidad="%" max={100}
                guardar={guardarEnCompania(c.nombre, "honorarios_pct")} />
              <Numero titulo="Plazo de pago" etiqueta={`${c.nombre}: plazo de pago en días`} valor={companias?.[c.nombre]?.plazo_pago_dias ?? null} placeholder="días" unidad="días" max={365} entero
                guardar={guardarEnCompania(c.nombre, "plazo_pago_dias")} />
            </span>
          </div>
        );
      })}
    </section>
  );
}
