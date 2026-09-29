import { useEffect, useState } from "react";
import { cargarContacto, guardarContacto } from "../../utils/ofertas.js";
import { useDirectorio, fichaDe, tipoContacto, faltantes } from "../../utils/companias.js";
import { abrirCompania } from "../../utils/companiaAbierta.js";
import { linkWhatsApp } from "../../utils/mensajes.js";

// Ficha → Resumen: quién lleva el siniestro en la compañía (de este caso) y los datos generales de la compañía
// (salen de la pestaña Compañías y se editan ahí). Se guarda al salir de cada campo. Solo lo ve el estudio.
export default function ContactoCompania({ casoId, compania, Th }) {
  const [contacto, setContacto] = useState(undefined); // undefined = cargando, null = falta el SQL 21
  const dir = useDirectorio();
  const cia = (compania && dir && fichaDe(dir.fichas, compania)) || {};
  const contactosCia = (dir?.contactos || []).filter(c => c.compania === cia.compania);
  const [estado, setEstado] = useState(""); // "" | "ok" | error

  useEffect(() => { if (casoId) cargarContacto(casoId).then(setContacto); }, [casoId]);

  const aviso = err => { setEstado(err ? "No se guardó: " + err : "ok"); setTimeout(() => setEstado(""), 1500); };
  const guardarCaso = async () => aviso(await guardarContacto(casoId, { nombre: contacto.nombre || null, telefono: contacto.telefono || null, mail: contacto.mail || null, notas: contacto.notas || null }));

  const caja = { background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-md)", padding: 16 };
  const campo = { width: "100%", boxSizing: "border-box", padding: "6px 9px", borderRadius: "var(--r-xs)", border: `1px solid ${Th.border}`, background: "var(--card)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" };
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
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${Th.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: Th.sub }}>
              <b style={{ color: Th.text }}>{compania}</b>{cia.razon_social ? ` · ${cia.razon_social}` : ""}{cia.cuit ? ` · CUIT ${cia.cuit}` : ""}
            </span>
            <button type="button" onClick={() => abrirCompania(compania)} style={{ ...link, background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", fontSize: 12 }}>
              {faltantes(cia).length || !cia.compania ? "Completar ficha de la compañía" : "Ver ficha de la compañía"}
            </button>
          </div>
          {[cia.mail || cia.telefono ? { id: "general", tipo: "General", mail: cia.mail, telefono: cia.telefono } : null, ...contactosCia].filter(Boolean).map(c => (
            <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: Th.muted, minWidth: 110 }}>{c.id === "general" ? "General" : tipoContacto(c.tipo)}</span>
              {c.nombre && <span style={{ fontWeight: 600, color: Th.text }}>{c.nombre}</span>}
              {c.mail && <a href={`mailto:${c.mail}`} style={link}>{c.mail}</a>}
              {c.telefono && <a href={`tel:${c.telefono.replace(/[^\d+]/g, "")}`} style={link}>{c.telefono}</a>}
              {c.telefono && linkWhatsApp(c.telefono, "") && <a href={linkWhatsApp(c.telefono, "")} target="_blank" rel="noreferrer" style={link}>WhatsApp</a>}
            </div>
          ))}
          {!cia.mail && !cia.telefono && !contactosCia.length && <div style={{ fontSize: 12, color: Th.muted }}>Sin contactos cargados para esta compañía.</div>}
          {cia.plazo_pago_dias ? <div style={{ fontSize: 12, color: Th.muted }}>Suele pagar a los {cia.plazo_pago_dias} días de la firma.</div> : null}
        </div>
      )}
    </div>
  );
}
