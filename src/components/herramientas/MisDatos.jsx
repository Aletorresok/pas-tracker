import { useEffect, useState } from "react";
import Boton from "../ui/Boton.jsx";
import { cargarEstudio, guardarEstudio, CAMPOS_ESTUDIO } from "../../utils/estudio.js";

const etiqueta = { display: "block", fontSize: 12, color: "var(--sub)", marginBottom: 4 };
const campo = { padding: "9px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", width: "100%" };
const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 16, display: "flex", flexDirection: "column", gap: 12 };

// Tus datos de abogado: los usan los escritos (hoy el reclamo extrajudicial; después, todos los modelos).
export default function MisDatos() {
  const [datos, setDatos] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { cargarEstudio().then(setDatos); }, []);

  const guardar = async () => {
    setGuardando(true);
    const error = await guardarEstudio(datos);
    setGuardando(false);
    setAviso(error ? { error: `No se pudo guardar: ${error}` } : { ok: "Guardado. Los próximos escritos salen con estos datos." });
    if (!error) setDatos(d => ({ ...d, guardado: true }));
  };

  if (!datos) return <div style={{ fontSize: 14, color: "var(--muted)" }}>Cargando…</div>;
  const cambiar = (k, v) => { setDatos(d => ({ ...d, [k]: v })); setAviso(null); };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 14, alignItems: "start" }}>
      <section style={tarjeta}>
        {!datos.guardado && (
          <div style={{ fontSize: 13, color: "var(--sub)" }}>Estos son los datos que estaban fijos en la app. Revisalos y guardalos para poder cambiarlos cuando quieras.</div>
        )}
        {CAMPOS_ESTUDIO.map(({ k, l }) => (
          <label key={k}>
            <span style={etiqueta}>{l}</span>
            <input id={`estudio-${k}`} value={datos[k] || ""} onChange={e => cambiar(k, e.target.value)} style={campo}
              inputMode={k === "cuit" || k === "telefono" ? "tel" : k === "mail" ? "email" : undefined} />
          </label>
        ))}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Boton variante="primario" icono="guardar" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Boton>
          {aviso && <span role="status" style={{ fontSize: 13, color: aviso.error ? "var(--bad)" : "var(--ok)" }}>{aviso.error || aviso.ok}</span>}
        </div>
      </section>

      <section style={tarjeta} aria-label="Así sale en el reclamo">
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--muted)" }}>Así sale en el reclamo</div>
        <p style={{ margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14, lineHeight: 1.65, textAlign: "justify", color: "var(--text)" }}>
          {datos.abogado}, abogado, inscripto al {datos.matriculas}, {datos.condicion_fiscal} CUIT {datos.cuit} en representación de APELLIDO NOMBRE, DNI 30.123.456, constituyendo domicilio en {datos.domicilio}, vengo a iniciar formal reclamo por el siniestro ocurrido el día 10/02/26.
        </p>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>El portal de productores sigue usando los datos de base: no puede leer tus ajustes.</div>
      </section>
    </div>
  );
}
