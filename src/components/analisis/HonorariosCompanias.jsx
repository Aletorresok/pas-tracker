import { useMemo, useState } from "react";
import { guardarCompania } from "../../utils/ofertas.js";
import { proyeccion } from "../../utils/analisis.js";

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 };
const campo = { width: 64, font: "inherit", fontSize: 14, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", textAlign: "right" };

// Campo de % que guarda al salir o con Enter. Vacío = usar lo que surge de tus casos.
function Porcentaje({ compania, valor, placeholder, onGuardado, campoDb = "honorarios_pct", unidad = "%", max = 100, entero = false }) {
  const [texto, setTexto] = useState(null);
  const [estado, setEstado] = useState("");
  const guardar = async () => {
    if (texto === null) return;
    const n = entero ? parseInt(texto, 10) : parseFloat(String(texto).replace(",", "."));
    const pct = Number.isFinite(n) && n > 0 && n <= max ? n : null;
    if ((pct ?? null) === (valor ?? null)) { setTexto(null); return; }
    const err = await guardarCompania(compania, { [campoDb]: pct });
    setEstado(err ? "error" : "ok");
    setTexto(null);
    if (!err) onGuardado();
    setTimeout(() => setEstado(""), 1500);
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input inputMode={entero ? "numeric" : "decimal"} aria-label={`${compania}: ${unidad}`} value={texto ?? (valor ?? "")} placeholder={placeholder}
        onChange={e => setTexto(e.target.value)} onBlur={guardar} onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()} style={campo} />
      <span style={{ fontSize: 13, minWidth: 64, color: estado === "ok" ? "var(--ok)" : estado === "error" ? "var(--bad)" : "var(--muted)" }}>
        {estado === "ok" ? "✓ guardado" : estado === "error" ? "no se guardó" : unidad}
      </span>
    </span>
  );
}

// Análisis → Compañías: % de honorarios (sobre la indemnización) que paga cada compañía. Lo usa la proyección.
export default function HonorariosCompanias({ allCasos, companias, onGuardado }) {
  const { pctHonGeneral, pctHonDatos } = useMemo(() => proyeccion(allCasos, companias || {}), [allCasos, companias]);
  const lista = useMemo(() => {
    const n = {};
    allCasos.forEach(c => { if (c.compania_aseguradora) n[c.compania_aseguradora] = (n[c.compania_aseguradora] || 0) + 1; });
    return Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).map(([nombre, total]) => ({ nombre, total }));
  }, [allCasos]);

  return (
    <section style={{ ...card, padding: "14px 16px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Condiciones de cada compañía</h2>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--sub)", lineHeight: 1.45 }}>
        <b>Honorarios</b>: % sobre la indemnización (lo usa la proyección; vacío = lo que surge de tus casos cobrados{pctHonGeneral != null ? `, o el de todas: ${pctHonGeneral}%` : ""}). <b>Plazo de pago</b>: días que suele tener para pagar desde la aceptación o la firma; se copia al caso cuando no tiene plazo cargado.
      </p>
      {companias === null ? (
        <div style={{ fontSize: 13, color: "var(--warn)" }}>Falta correr el SQL 21 en Supabase.</div>
      ) : lista.map((c, i) => {
        const datos = pctHonDatos(c.nombre);
        return (
          <div key={c.nombre} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: i ? "1px solid var(--border)" : "none", flexWrap: "wrap" }}>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14 }}>{c.nombre}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{c.total} {c.total === 1 ? "caso" : "casos"}{datos != null ? ` · en tus casos cobrados pagó ${datos}%` : ""}</span>
            </span>
            <span style={{ display: "inline-flex", gap: 14, flexWrap: "wrap" }}>
              <Porcentaje compania={c.nombre} valor={companias?.[c.nombre]?.honorarios_pct ?? null} placeholder={String(datos ?? pctHonGeneral ?? "")} onGuardado={onGuardado} />
              <Porcentaje compania={c.nombre} valor={companias?.[c.nombre]?.plazo_pago_dias ?? null} placeholder="días" onGuardado={onGuardado} campoDb="plazo_pago_dias" unidad="días" max={365} entero />
            </span>
          </div>
        );
      })}
    </section>
  );
}
