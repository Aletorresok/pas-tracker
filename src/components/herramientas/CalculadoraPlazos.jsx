import { useState, useMemo } from "react";
import { useCalendarioJudicial } from "../../hooks/useCalendarioJudicial.js";
import { calcularVencimiento, diasSalteados, plazoDeGracia, describirPlazoHabil, esHabil, motivoInhabil, sumarDiasISO } from "../../utils/plazos.js";
import { JURISDICCIONES } from "../../utils/expedientes.js";
import { fechaLocalISO } from "../../utils/formatters.js";
import Boton from "../ui/Boton.jsx";

const largo = iso => {
  const t = new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const corto = iso => new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "numeric" });
const COLOR_NIVEL = { vencido: "var(--bad)", hoy: "var(--warn)", pronto: "var(--warn)", tranquilo: "var(--info)" };

function Segmentos({ opciones, valor, onChange, etiqueta }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", flexWrap: "wrap" }}>
      {opciones.map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={valor === k} onClick={() => onChange(k)}
          style={{ font: "inherit", fontSize: 13, padding: "8px 12px", border: "none", cursor: "pointer", fontWeight: valor === k ? 600 : 500, background: valor === k ? "var(--text)" : "var(--card)", color: valor === k ? "var(--bg)" : "var(--sub)" }}>{l}</button>
      ))}
    </div>
  );
}

const campo = { padding: "9px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", width: "100%" };
const etiqueta = { display: "block", fontSize: 12, color: "var(--sub)", marginBottom: 4 };
const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 };

// Calculadora de plazos procesales: vencimiento en días hábiles judiciales o corridos (con feriados,
// feria e inhábiles por jurisdicción) y días entre dos fechas. Usa el mismo motor que Expedientes.
export default function CalculadoraPlazos() {
  const cal = useCalendarioJudicial();
  const hoy = fechaLocalISO();
  const [modo, setModo] = useState("vencimiento");
  const [desde, setDesde] = useState(hoy);
  const [dias, setDias] = useState("5");
  const [computo, setComputo] = useState("habiles");
  const [juris, setJuris] = useState("CABA");
  const [hasta, setHasta] = useState(hoy);
  const [verConteo, setVerConteo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const vence = modo === "vencimiento" ? calcularVencimiento({ desde, dias, computo, jurisdiccion: juris }, cal) : null;
  const salteados = vence ? diasSalteados(desde, vence, cal, juris) : [];
  const gracia = vence ? plazoDeGracia(vence, cal, juris) : null;
  const estado = vence ? describirPlazoHabil(vence, hoy, cal, juris) : null;

  // Día por día: qué se contó y qué no
  const conteo = useMemo(() => {
    if (!vence) return [];
    const filas = [];
    let n = 0;
    for (let f = sumarDiasISO(desde, 1); f <= vence; f = sumarDiasISO(f, 1)) {
      const motivo = motivoInhabil(f, cal, juris);
      const cuenta = computo === "corridos" ? f <= sumarDiasISO(desde, Number(dias)) : !motivo;
      if (cuenta) n++;
      filas.push({ f, motivo, n: cuenta ? n : null });
    }
    return filas;
  }, [vence, desde, dias, computo, cal, juris]);

  const entre = useMemo(() => {
    if (modo !== "entre" || !desde || !hasta || hasta < desde) return null;
    let corridos = 0, habiles = 0;
    for (let f = sumarDiasISO(desde, 1); f <= hasta; f = sumarDiasISO(f, 1)) {
      corridos++;
      if (esHabil(f, cal, juris)) habiles++;
    }
    return { corridos, habiles };
  }, [modo, desde, hasta, cal, juris]);

  const copiar = () => {
    const texto = `Notificado el ${largo(desde)}. Plazo de ${dias} días ${computo === "habiles" ? "hábiles judiciales" : "corridos"} (${juris}): vence el ${largo(vence)}${gracia ? `; plazo de gracia hasta las primeras ${gracia.horas} horas del ${largo(gracia.fecha)}` : ""}.`;
    navigator.clipboard?.writeText(texto).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); }).catch(() => {});
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
      <Segmentos etiqueta="Qué calcular" valor={modo} onChange={setModo} opciones={[["vencimiento", "Vencimiento de un plazo"], ["entre", "Días entre dos fechas"]]} />

      <div style={{ ...tarjeta, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, alignItems: "end" }}>
        <label><span style={etiqueta}>{modo === "vencimiento" ? "Notificado el" : "Desde"}</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={campo} /></label>
        {modo === "vencimiento"
          ? <label><span style={etiqueta}>Días de plazo</span>
              <input type="number" min="1" max="3650" inputMode="numeric" value={dias} onChange={e => setDias(e.target.value)} style={campo} /></label>
          : <label><span style={etiqueta}>Hasta</span>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={campo} /></label>}
        <div><span style={etiqueta}>Jurisdicción</span>
          <Segmentos etiqueta="Jurisdicción" valor={juris} onChange={setJuris} opciones={JURISDICCIONES.map(j => [j, j])} /></div>
        {modo === "vencimiento" && (
          <div style={{ gridColumn: "1 / -1" }}><span style={etiqueta}>Cómputo</span>
            <Segmentos etiqueta="Cómputo" valor={computo} onChange={setComputo} opciones={[["habiles", "Días hábiles judiciales"], ["corridos", "Días corridos"]]} /></div>
        )}
      </div>

      {cal.aproximado && <div style={{ fontSize: 12, color: "var(--warn)" }}>No se pudieron bajar los feriados de este año: se usan solo los de fecha fija. Revisá el resultado.</div>}

      {modo === "vencimiento" && !vence && <div style={{ fontSize: 14, color: "var(--muted)" }}>Completá la fecha y los días.</div>}

      {vence && (
        <div style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: "var(--sub)" }}>Vence el</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>{largo(vence)}</span>
            {estado && <span className="num" style={{ fontSize: 13, fontWeight: 700, color: COLOR_NIVEL[estado.nivel], background: `color-mix(in srgb, ${COLOR_NIVEL[estado.nivel]} 14%, transparent)`, padding: "2px 8px", borderRadius: 6 }}>{estado.texto}</span>}
          </div>
          {gracia && <div style={{ fontSize: 14, color: "var(--sub)" }}>Plazo de gracia: hasta las primeras <b>{gracia.horas} horas</b> del despacho del {largo(gracia.fecha).toLowerCase()}.</div>}
          {salteados.length > 0 && (
            <div style={{ fontSize: 13, color: "var(--sub)" }}>
              No se contaron: {salteados.map(s => `${corto(s.fecha)} (${s.motivo})`).join(" · ")}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <Boton tamaño="sm" onClick={copiar}>{copiado ? "Copiado ✓" : "Copiar texto"}</Boton>
            <Boton tamaño="sm" variante="fantasma" onClick={() => setVerConteo(v => !v)}>{verConteo ? "Ocultar el conteo" : "Ver el conteo día por día"}</Boton>
          </div>
          {verConteo && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 4, marginTop: 4 }}>
              {conteo.map(c => (
                <div key={c.f} className="num" style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, background: c.n ? "var(--card2)" : "transparent", color: c.n ? "var(--text)" : "var(--muted)", border: c.f === vence ? "1px solid var(--accent)" : "1px solid transparent" }}>
                  {corto(c.f)} · {c.n ? `día ${c.n}` : c.motivo || "primer hábil"}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {entre && (
        <div style={{ ...tarjeta, display: "flex", gap: 32, flexWrap: "wrap" }}>
          <div><div style={{ fontSize: 13, color: "var(--sub)" }}>Días corridos</div><div className="num" style={{ fontSize: 28, fontWeight: 700 }}>{entre.corridos}</div></div>
          <div><div style={{ fontSize: 13, color: "var(--sub)" }}>Días hábiles judiciales ({juris})</div><div className="num" style={{ fontSize: 28, fontWeight: 700 }}>{entre.habiles}</div></div>
          <div style={{ fontSize: 12, color: "var(--muted)", alignSelf: "flex-end" }}>Se cuentan desde el día siguiente al "Desde", hasta el "Hasta" inclusive.</div>
        </div>
      )}
      {modo === "entre" && hasta < desde && <div style={{ fontSize: 14, color: "var(--muted)" }}>La fecha "Hasta" tiene que ser posterior a "Desde".</div>}
    </div>
  );
}
