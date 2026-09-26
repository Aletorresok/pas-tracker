import { useMemo, useState } from "react";
import { plazosRespuesta } from "../utils/metricas.js";
import { useMargenes, guardarMargen, GENERAL, MARGEN_DEFECTO } from "../utils/margenes.js";

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 };
const campo = { width: 64, font: "inherit", fontSize: 14, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", textAlign: "right" };

// Campo de días que guarda al salir o con Enter. Vacío = sin margen propio.
function Dias({ compania, valor, placeholder }) {
  const [texto, setTexto] = useState(null); // null = mostrando lo guardado
  const [estado, setEstado] = useState(""); // "" | "ok" | "error"
  const guardar = async () => {
    if (texto === null) return;
    const n = parseInt(texto, 10);
    const dias = Number.isFinite(n) && n >= 1 && n <= 365 ? n : null;
    if ((dias ?? null) === (valor ?? null)) { setTexto(null); return; }
    const ok = await guardarMargen(compania, dias);
    setEstado(ok ? "ok" : "error");
    setTexto(null);
    setTimeout(() => setEstado(""), 1500);
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input type="number" min={1} max={365} inputMode="numeric" aria-label={compania === GENERAL ? "Margen general en días" : `Margen para ${compania} en días`}
        value={texto ?? (valor ?? "")} placeholder={placeholder} onChange={e => setTexto(e.target.value)}
        onBlur={guardar} onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()} style={campo} />
      <span style={{ fontSize: 13, color: estado === "ok" ? "var(--ok)" : estado === "error" ? "var(--bad)" : "var(--muted)", minWidth: 84 }}>
        {estado === "ok" ? "✓ guardado" : estado === "error" ? "no se guardó" : "días"}
      </span>
    </span>
  );
}

// Análisis → cuántos días sin respuesta de cada compañía antes de avisarte "reclamo quieto" en Hoy
export default function MargenCompanias({ allCasos }) {
  const margenes = useMargenes();
  const plazos = useMemo(() => plazosRespuesta(allCasos), [allCasos]);
  const companias = useMemo(() => {
    const n = {};
    allCasos.forEach(c => { if (c.compania_aseguradora) n[c.compania_aseguradora] = (n[c.compania_aseguradora] || 0) + 1; });
    return Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).map(([nombre, total]) => ({ nombre, total }));
  }, [allCasos]);

  const general = margenes?.[GENERAL] ?? MARGEN_DEFECTO;

  return (
    <section style={{ ...card, padding: "14px 16px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Reclamo quieto: margen por compañía</h2>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--sub)", lineHeight: 1.45 }}>
        Días sin respuesta de la compañía antes de que Hoy te avise para reiterar el reclamo. Si dejás vacía una compañía, usa lo que tardó en responder el 75% de sus reclamos (con 3 casos o más, hasta 60 días) o, si no hay datos, el general.
      </p>
      {margenes === null ? (
        <div style={{ fontSize: 13, color: "var(--warn)" }}>Falta correr el SQL 14 en Supabase. Mientras tanto se usan {MARGEN_DEFECTO} días para todas.</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", flexWrap: "wrap" }}>
            <b style={{ fontSize: 14 }}>General</b>
            <Dias compania={GENERAL} valor={margenes[GENERAL]} placeholder={String(MARGEN_DEFECTO)} />
          </div>
          {companias.map(c => {
            const p = plazos[c.nombre];
            // Sin margen propio: el sugerido por tus datos (nunca menos que el general) o el general
            const efectivo = p?.sugerido != null ? Math.max(general, p.sugerido) : general;
            return (
              <div key={c.nombre} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14 }}>{c.nombre}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>
                    {c.total} {c.total === 1 ? "caso" : "casos"}{p ? ` · suele ofrecer a los ${p.promedio} d (${p.n} ${p.n === 1 ? "caso" : "casos"})` : ""}
                    {margenes[c.nombre] == null && (p?.sugerido != null && efectivo > general ? ` · usa ${efectivo} d según tus datos` : "")}
                  </span>
                </span>
                <Dias compania={c.nombre} valor={margenes[c.nombre]} placeholder={String(efectivo)} />
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}
