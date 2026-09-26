import { useEffect, useState } from "react";
import { cargarContacto, guardarContacto, cargarCompania, guardarCompania } from "../../utils/ofertas.js";

// Ficha → Resumen: quién lleva el siniestro en la compañía (de este caso) y los datos generales de la compañía
// (sirven para todos sus casos). Se guarda al salir de cada campo. Solo lo ve el estudio.
export default function ContactoCompania({ casoId, compania, Th }) {
  const [contacto, setContacto] = useState(undefined); // undefined = cargando, null = falta el SQL 21
  const [cia, setCia] = useState({});
  const [estado, setEstado] = useState(""); // "" | "ok" | error

  useEffect(() => { if (casoId) cargarContacto(casoId).then(setContacto); }, [casoId]);
  useEffect(() => { cargarCompania(compania).then(d => setCia(d || {})); }, [compania]);

  const aviso = err => { setEstado(err ? "No se guardó: " + err : "ok"); setTimeout(() => setEstado(""), 1500); };
  const guardarCaso = async () => aviso(await guardarContacto(casoId, { nombre: contacto.nombre || null, telefono: contacto.telefono || null, mail: contacto.mail || null, notas: contacto.notas || null }));
  const guardarCia = async () => { if (compania) aviso(await guardarCompania(compania, { mail: cia.mail || null, telefono: cia.telefono || null })); };
  const guardarPlazo = async () => { if (compania) { const n = parseInt(cia.plazo_pago_dias, 10); aviso(await guardarCompania(compania, { plazo_pago_dias: n >= 1 && n <= 365 ? n : null })); } };

  const caja = { background: Th.card, border: `1px solid ${Th.border}`, borderRadius: 12, padding: 16 };
  const campo = { width: "100%", boxSizing: "border-box", padding: "6px 9px", borderRadius: 7, border: `1px solid ${Th.border}`, background: "var(--card)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" };
  const etiqueta = { display: "block", fontSize: 11, color: Th.muted, marginBottom: 3 };
  const link = { fontSize: 12, color: "var(--accent-ink)", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" };

  if (contacto === undefined) return null;
  if (contacto === null) return <div style={{ ...caja, fontSize: 13, color: "var(--warn)" }}>Contacto en la compañía: falta correr el SQL 21 en Supabase.</div>;

  const Campo = ({ l, valor, set, onBlur, tipo = "text", ph, accion }) => (
    <label style={{ display: "block", minWidth: 0 }}>
      <span style={{ ...etiqueta, display: "flex", justifyContent: "space-between", gap: 6 }}>{l}{accion}</span>
      <input type={tipo} value={valor || ""} placeholder={ph} onChange={e => set(e.target.value)} onBlur={onBlur} style={campo} />
    </label>
  );

  return (
    <div style={caja}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: Th.text }}>Contacto en la compañía</span>
        {estado && <span style={{ fontSize: 12, color: estado === "ok" ? "var(--ok)" : "var(--bad)" }}>{estado === "ok" ? "✓ guardado" : estado}</span>}
      </div>

      <div style={{ fontSize: 12, color: Th.sub, marginBottom: 6 }}>Quién lleva este siniestro</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {Campo({ l: "Nombre", valor: contacto.nombre, set: v => setContacto(c => ({ ...c, nombre: v })), onBlur: guardarCaso, ph: "Liquidador / analista" })}
        {Campo({ l: "Teléfono", valor: contacto.telefono, set: v => setContacto(c => ({ ...c, telefono: v })), onBlur: guardarCaso, tipo: "tel",
          accion: contacto.telefono ? <a href={`tel:${contacto.telefono.replace(/[^\d+]/g, "")}`} style={link}>Llamar</a> : null })}
        {Campo({ l: "Mail", valor: contacto.mail, set: v => setContacto(c => ({ ...c, mail: v })), onBlur: guardarCaso, tipo: "email",
          accion: contacto.mail ? <a href={`mailto:${contacto.mail}`} style={link}>Escribir</a> : null })}
        {Campo({ l: "Notas", valor: contacto.notas, set: v => setContacto(c => ({ ...c, notas: v })), onBlur: guardarCaso, ph: "Interno, horario…" })}
      </div>

      {compania && (
        <>
          <div style={{ fontSize: 12, color: Th.sub, margin: "12px 0 6px", paddingTop: 10, borderTop: `1px solid ${Th.border}` }}>{compania} · para todos sus casos</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Campo({ l: "Mail de siniestros", valor: cia.mail, set: v => setCia(c => ({ ...c, mail: v })), onBlur: guardarCia, tipo: "email",
              accion: cia.mail ? <a href={`mailto:${cia.mail}`} style={link}>Escribir</a> : null })}
            {Campo({ l: "Teléfono", valor: cia.telefono, set: v => setCia(c => ({ ...c, telefono: v })), onBlur: guardarCia, tipo: "tel",
              accion: cia.telefono ? <a href={`tel:${cia.telefono.replace(/[^\d+]/g, "")}`} style={link}>Llamar</a> : null })}
            {Campo({ l: "Plazo de pago habitual (días)", valor: cia.plazo_pago_dias ?? "", set: v => setCia(c => ({ ...c, plazo_pago_dias: v })), onBlur: guardarPlazo, tipo: "number", ph: "Ej: 15" })}
          </div>
        </>
      )}
    </div>
  );
}
