import { useState, useEffect } from "react";
import { resumenDelMes, MESES_LARGOS } from "../../utils/estadisticasPas.js";
import { linkWhatsApp } from "../../utils/mensajes.js";
import Icono from "../ui/Icono.jsx";

// Resumen del mes para mandarle al PAS: casos nuevos, cobrados (con su comisión) y cómo va cada caso en curso.
export default function ResumenMensual({ pas, casos, onCerrar }) {
  const hoy = new Date();
  const meses = [0, 1].map(n => { const d = new Date(hoy.getFullYear(), hoy.getMonth() - n, 1); return { anio: d.getFullYear(), mes: d.getMonth() }; });
  const [elegido, setElegido] = useState(0);
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => { setTexto(resumenDelMes(pas, casos, meses[elegido]).texto); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [elegido, pas.id, casos]);

  const telefono = (pas.telefonos || [])[0];
  const link = linkWhatsApp(telefono, texto);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sin portapapeles: queda el texto para copiar a mano */ }
  };
  const chip = activo => ({ font: "inherit", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${activo ? "var(--text)" : "var(--border)"}`, background: activo ? "var(--text)" : "var(--card)", color: activo ? "var(--bg)" : "var(--sub)" });

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--card)", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Resumen del mes</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {meses.map((m, i) => <button key={i} type="button" aria-pressed={elegido === i} onClick={() => setElegido(i)} style={chip(elegido === i)}>{MESES_LARGOS[m.mes].charAt(0).toUpperCase() + MESES_LARGOS[m.mes].slice(1)}</button>)}
          <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex", marginLeft: 4 }}><Icono nombre="cerrar" size={16} /></button>
        </div>
      </div>
      <textarea aria-label="Texto del resumen" rows={9} value={texto} onChange={e => setTexto(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", lineHeight: 1.45, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {link
          ? <a className="btn-wa-grande" href={link} target="_blank" rel="noreferrer" style={{ padding: "8px 14px", fontSize: 14 }}><Icono nombre="mensaje" size={16} /> Enviar por WhatsApp</a>
          : <span style={{ fontSize: 13, color: "var(--warn)" }}>Este PAS no tiene teléfono cargado.</span>}
        <button type="button" onClick={copiar} style={{ font: "inherit", fontSize: 13, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--card)", color: "var(--text)", cursor: "pointer" }}>{copiado ? "✓ Copiado" : "Copiar"}</button>
      </div>
    </div>
  );
}
