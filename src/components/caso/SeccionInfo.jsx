import { useEffect, useState } from "react";
import CompaniaSelector from "./CompaniaSelector.jsx";
import Boton from "../ui/Boton.jsx";
import { GRUPOS_SINIESTRO, necesitaSql44, hayColumnasSql44, ciaNoCoincide, lineasReclamo, textoReclamo } from "../../utils/datosSiniestro.js";

const copiar = async texto => {
  try { await navigator.clipboard.writeText(texto); return true; } catch { window.prompt("Copiá el texto:", texto); return false; }
};

export default function SeccionInfo({ formData, onChange, darkMode, Th, companias, onAgregarCompania }) {
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: Th.text, marginBottom: 6 };
  const inputStyle = Th.input;
  const tarjeta = { background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", marginBottom: 16 };
  const ayuda = { display: "block", fontSize: 12, color: Th.muted, marginTop: 4 };

  const [sql44, setSql44] = useState(null); // null = preguntando
  useEffect(() => { let vivo = true; hayColumnasSql44().then(v => vivo && setSql44(v)); return () => { vivo = false; }; }, []);

  // Los grupos con datos arrancan abiertos; los vacíos, plegados
  const visibles = GRUPOS_SINIESTRO.map(g => ({ ...g, campos: g.campos.filter(c => !necesitaSql44(g, c) || sql44) })).filter(g => g.campos.length);
  const [abiertos] = useState(() => new Set(GRUPOS_SINIESTRO.filter(g => g.campos.some(c => formData[c.k])).map(g => g.k)));

  const [copiado, setCopiado] = useState(null);
  const marcarCopiado = async (clave, texto) => { if (await copiar(texto)) { setCopiado(clave); setTimeout(() => setCopiado(c => (c === clave ? null : c)), 1500); } };
  const lineas = lineasReclamo(formData);
  const ciaDistinta = ciaNoCoincide(formData.tercero_cia, formData.compania_aseguradora);

  const campo = c => {
    const valor = formData[c.k] || "";
    const cambiar = e => onChange(c.k, c.mayus ? e.target.value.toUpperCase() : e.target.value);
    const comun = { value: c.t === "time" ? String(valor).slice(0, 5) : valor, onChange: cambiar, placeholder: c.ph, style: inputStyle };
    return (
      <label key={c.k} data-corto={c.ancho <= 2 ? "" : undefined} style={{ gridColumn: `span ${c.ancho}` }}>
        <span style={labelStyle}>{c.l}</span>
        {c.t === "area" ? <textarea rows={3} {...comun} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
          : <input type={c.t || "text"} {...comun} style={c.mayus ? { ...inputStyle, textTransform: "uppercase" } : inputStyle} />}
        {c.ayuda && <span style={ayuda}>{c.ayuda}</span>}
        {c.k === "tercero_cia" && ciaDistinta && <span style={{ ...ayuda, color: "var(--warn)" }}>No coincide con la compañía reclamada ({formData.compania_aseguradora}).</span>}
      </label>
    );
  };

  return (
    <>
    <div style={{ ...tarjeta, padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: Th.text, marginBottom: 14 }}>Datos del siniestro</div>

      {/* GRILLA DE 3 COLUMNAS PARA INCLUIR LA PATENTE */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 12, marginBottom: 12 }}>
        <label>
          <span style={labelStyle}>Asegurado *</span>
          <input type="text" value={formData.asegurado || ""} onChange={e => onChange("asegurado", e.target.value)} style={inputStyle} />
        </label>

        <label>
          <span style={labelStyle}>Patente</span>
          <input
            type="text"
            value={formData.patente || ""}
            onChange={e => {
              const val = e.target.value.toUpperCase();
              onChange("patente", val);
            }}
            placeholder="Ej: AB123CD"
            style={{ ...inputStyle, textTransform: "uppercase", textAlign: "center" }}
          />
        </label>

        <div>
          <span style={labelStyle}>Compañía aseguradora</span>
          <CompaniaSelector value={formData.compania_aseguradora || ""} onChange={v => onChange("compania_aseguradora", v)} companias={companias || []} onAgregar={onAgregarCompania || (() => {})} darkMode={darkMode} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span style={labelStyle}>Fecha del siniestro</span>
          <input type="date" value={formData.fecha_siniestro || ""} onChange={e => onChange("fecha_siniestro", e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>DNI del asegurado</span>
          <input type="text" inputMode="numeric" value={formData.dni_asegurado || ""} onChange={e => onChange("dni_asegurado", e.target.value)} placeholder="Ej: 25123456" style={inputStyle} />
          <span style={ayuda}>El cliente consulta su caso con la patente y los últimos 3 números.</span>
        </label>
        <label>
          <span style={labelStyle}>Teléfono del asegurado</span>
          <input type="tel" value={formData.telefono_asegurado || ""} onChange={e => onChange("telefono_asegurado", e.target.value)} placeholder="Ej: 11 3313 3259" style={inputStyle} />
          <span style={ayuda}>Para avisarle por WhatsApp desde el caso.</span>
        </label>
      </div>
    </div>

    {visibles.map(g => (
      <details key={g.k} open={abiertos.has(g.k)} style={tarjeta}>
        <summary style={{ cursor: "pointer", padding: "12px 16px", fontSize: 15, fontWeight: 700, color: Th.text }}>
          {g.titulo}
          {g.k === "tercero" && ciaDistinta && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: "var(--warn)" }}>Revisar compañía</span>}
        </summary>
        <div className="grilla-siniestro" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12, padding: "0 16px 16px" }}>
          {g.campos.map(campo)}
        </div>
      </details>
    ))}
    {sql44 === false && (
      <div style={{ fontSize: 12, color: Th.muted, margin: "-6px 0 16px" }}>Falta correr el SQL 44 en Supabase para ver la póliza del cliente, el conductor, la hora y las observaciones.</div>
    )}

    {lineas.length > 0 && (
      <div style={{ ...tarjeta, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: Th.text }}>Datos para cargar el reclamo</div>
          <Boton tamaño="sm" variante="secundario" onClick={() => marcarCopiado("todo", textoReclamo(formData))}>{copiado === "todo" ? "Copiado" : "Copiar todo"}</Boton>
        </div>
        <div style={{ display: "grid", gap: 2 }}>
          {lineas.map(([l, v]) => (
            <div key={l} style={{ display: "grid", gridTemplateColumns: "minmax(0, 190px) minmax(0, 1fr) auto", gap: 10, alignItems: "baseline", padding: "4px 0", borderBottom: `1px solid ${Th.border}` }}>
              <span style={{ fontSize: 12, color: Th.muted }}>{l}</span>
              <span style={{ fontSize: 14, color: Th.text, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{v}</span>
              <button type="button" onClick={() => marcarCopiado(l, v)} aria-label={`Copiar ${l}`}
                style={{ background: "none", border: "none", padding: "2px 4px", font: "inherit", fontSize: 12, fontWeight: 600, color: copiado === l ? "var(--ok)" : "var(--accent-ink)", cursor: "pointer" }}>
                {copiado === l ? "Copiado" : "Copiar"}
              </button>
            </div>
          ))}
        </div>
      </div>
    )}
    </>
  );
}
