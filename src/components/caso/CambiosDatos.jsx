import { useEffect, useState } from "react";
import { historialDe, renglonesDe, aValorFormulario } from "../../utils/auditoria.js";

const dos = n => String(n).padStart(2, "0");
function cuando(iso) {
  const d = new Date(iso), hoy = new Date();
  const dia = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dif = Math.round((dia(hoy) - dia(d)) / 86400000);
  const hora = `${dos(d.getHours())}:${dos(d.getMinutes())}`;
  if (dif === 0) return `Hoy ${hora}`;
  if (dif === 1) return `Ayer ${hora}`;
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}${d.getFullYear() !== hoy.getFullYear() ? `/${String(d.getFullYear()).slice(-2)}` : ""} ${hora}`;
}

const POR_PAGINA = 40;
// Montos y fechas no se parten en dos renglones; los textos largos sí
const corto = v => (String(v ?? "").length <= 24 ? { whiteSpace: "nowrap" } : null);

/**
 * Bitácora → "Cambios de datos" (auditoría, SQL 31).
 * cambios: { tabla, filaId, version, puedeRestaurar(campo), valorActual(campo), onRestaurar(campo, valor) }
 * `version` cambia cuando la ficha terminó de guardar, para recargar la lista.
 */
export default function CambiosDatos({ tabla, filaId, version, puedeRestaurar, valorActual, onRestaurar, Th }) {
  const [filas, setFilas] = useState(undefined); // undefined = cargando, null = falta el SQL 31
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [restaurado, setRestaurado] = useState(null); // key del renglón recién restaurado

  useEffect(() => {
    let vivo = true;
    historialDe(tabla, filaId).then(d => { if (vivo) setFilas(d); });
    return () => { vivo = false; };
  }, [tabla, filaId, version]);

  if (filas === undefined) return <div style={{ color: Th.muted, fontSize: 13 }}>Cargando…</div>;
  if (filas === null) return (
    <div style={{ color: Th.muted, fontSize: 13, lineHeight: 1.5 }}>
      Falta correr el SQL 31 (auditoría) en Supabase. Desde ese momento, cada cambio de datos queda registrado acá.
    </div>
  );

  const renglones = renglonesDe(filas, tabla);
  if (!renglones.length) return (
    <div style={{ color: Th.muted, fontSize: 13, textAlign: "center", padding: "12px 0" }}>
      Todavía no hay cambios registrados. Se registran desde que se corrió el SQL 31.
    </div>
  );

  const restaurar = r => {
    onRestaurar(r.campo, aValorFormulario(r.campo, r.valorAntes));
    setRestaurado(r.key);
  };
  const mismoValor = r => JSON.stringify(aValorFormulario(r.campo, valorActual(r.campo))) === JSON.stringify(aValorFormulario(r.campo, r.valorAntes));

  return (
    <div>
      {renglones.slice(0, mostrar).map(r => {
        const puede = r.tipo === "cambio" && puedeRestaurar(r.campo) && !mismoValor(r);
        return (
          <div key={r.key} style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "center", justifyContent: "space-between", padding: "10px 2px", borderBottom: `1px solid ${Th.border}` }}>
            <div style={{ minWidth: 0, flex: "1 1 240px" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 2 }}>
                <span style={{ fontSize: 11.5, color: Th.muted, fontVariantNumeric: "tabular-nums" }}>{cuando(r.en)}</span>
                <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: "var(--r-pill)", background: "color-mix(in srgb, var(--text) 6%, transparent)", color: "var(--sub)" }}>{r.quien}</span>
              </div>
              <div style={{ fontSize: 13.5, color: Th.text, lineHeight: 1.45, overflowWrap: "anywhere" }}>
                <b style={{ fontWeight: 600 }}>{r.etiqueta}</b>
                {r.tipo === "cambio" && (r.texto
                  ? <span style={{ color: Th.sub }}>: {r.texto}</span>
                  : <>
                      <span style={{ color: Th.sub }}>: </span>
                      <s style={{ color: Th.muted, ...corto(r.antes) }}>{r.antes}</s>
                      <span style={{ color: Th.muted, padding: "0 5px" }}>→</span>
                      <span style={corto(r.despues)}>{r.despues}</span>
                    </>)}
              </div>
            </div>
            {restaurado === r.key
              ? <span style={{ fontSize: 12, color: "var(--ok)", fontWeight: 600 }}>Restaurado, se guarda solo</span>
              : puede && (
                <button type="button" onClick={() => restaurar(r)} title={`Volver a: ${r.antes ?? ""}`}
                  style={{ background: "none", border: "1px solid var(--border2)", borderRadius: "var(--r-pill)", color: "var(--sub)", padding: "4px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                  Volver a este valor
                </button>
              )}
          </div>
        );
      })}
      {renglones.length > mostrar && (
        <button type="button" onClick={() => setMostrar(m => m + POR_PAGINA)}
          style={{ marginTop: 10, background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}>
          Ver más ({renglones.length - mostrar})
        </button>
      )}
    </div>
  );
}
