import { useState, useEffect } from "react";
import { PLANTILLAS_CLIENTE, PLANTILLAS_PAS, plantillaSugerida, textoCliente, linkWhatsApp } from "../../utils/mensajes.js";
import Icono from "../ui/Icono.jsx";

// "Avisar por WhatsApp": elegís a quién (cliente o PAS) y una plantilla; el texto sale completo con los datos
// del caso, lo podés retocar y se abre WhatsApp. Para el cliente, opcionalmente queda también como
// "Mensaje del estudio" (lo ven el PAS en el portal y el cliente en su vista).
export default function AvisarWhatsApp({ caso, pasNombre = "", pasTelefono = "", onTelefonoCliente, onUsarComoMensaje, abiertoInicial = false }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [para, setPara] = useState("cliente");
  const [plantilla, setPlantilla] = useState(() => plantillaSugerida(caso));
  const [texto, setTexto] = useState("");
  const [tocado, setTocado] = useState(false);
  const [usarComoMensaje, setUsarComoMensaje] = useState(true);
  const [aviso, setAviso] = useState("");

  const lista = para === "cliente" ? PLANTILLAS_CLIENTE : PLANTILLAS_PAS;
  const actual = lista.find(p => p.k === plantilla) || lista[0];
  const extra = { pasNombre };

  // Rearma el texto al cambiar de plantilla o destinatario (si no lo editaste a mano)
  useEffect(() => {
    if (!abierto || tocado) return;
    setTexto(para === "cliente" ? textoCliente(actual, caso, extra) : actual.texto(caso, extra));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, para, plantilla, caso.estado, caso.monto_ofrecimiento, caso.monto_cobro_asegurado, caso.fecha_pago]);

  const elegirPara = (p) => { setPara(p); setTocado(false); setPlantilla(p === "cliente" ? plantillaSugerida(caso) : "novedad"); };
  const elegirPlantilla = (k) => { setPlantilla(k); setTocado(false); };

  const telefono = para === "cliente" ? caso.telefono_asegurado : pasTelefono;
  const link = linkWhatsApp(telefono, texto);
  const sugerido = para === "cliente" && !caso.telefono_asegurado && /\d{8}/.test(String(caso.tercero_contacto || "").replace(/\D/g, "")) ? caso.tercero_contacto : "";

  const alEnviar = () => {
    if (para === "cliente" && usarComoMensaje && actual.cuerpo && !tocado) {
      onUsarComoMensaje?.(actual.cuerpo(caso, extra));
      setAviso("Se abrió WhatsApp y el mensaje quedó también como Mensaje del estudio.");
    } else {
      setAviso("Se abrió WhatsApp.");
    }
  };

  const chip = activo => ({ font: "inherit", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${activo ? "var(--text)" : "var(--border)"}`, background: activo ? "var(--text)" : "var(--card)", color: activo ? "var(--bg)" : "var(--sub)", whiteSpace: "nowrap" });
  const campo = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" };

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--card)", color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        <Icono nombre="mensaje" size={15} /> Avisar por WhatsApp
      </button>
    );
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--card)", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div role="group" aria-label="Destinatario" style={{ display: "flex", gap: 4 }}>
          <button type="button" aria-pressed={para === "cliente"} onClick={() => elegirPara("cliente")} style={chip(para === "cliente")}>Al cliente</button>
          <button type="button" aria-pressed={para === "pas"} onClick={() => elegirPara("pas")} style={chip(para === "pas")}>Al PAS</button>
        </div>
        <button type="button" onClick={() => { setAbierto(false); setAviso(""); setTocado(false); }} aria-label="Cerrar" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex" }}><Icono nombre="cerrar" size={16} /></button>
      </div>

      <div role="group" aria-label="Plantilla" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {lista.map(p => <button key={p.k} type="button" aria-pressed={plantilla === p.k} onClick={() => elegirPlantilla(p.k)} style={chip(plantilla === p.k)}>{p.l}</button>)}
      </div>

      <textarea aria-label="Texto del mensaje" rows={5} value={texto} onChange={e => { setTexto(e.target.value); setTocado(true); }} style={{ ...campo, resize: "vertical", lineHeight: 1.45 }} />

      {para === "cliente" && !caso.telefono_asegurado && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "var(--sub)" }}>Teléfono del asegurado (queda guardado en el caso)
            <input inputMode="tel" placeholder="Ej: 11 3313 3259" onBlur={e => e.target.value.trim() && onTelefonoCliente?.(e.target.value.trim())} style={{ ...campo, marginTop: 4, maxWidth: 220 }} />
          </label>
          {sugerido && <button type="button" onClick={() => onTelefonoCliente?.(sugerido)} style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: "var(--accent-ink)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Usar {sugerido} (cargado como contacto)</button>}
        </div>
      )}
      {para === "pas" && !pasTelefono && <div style={{ fontSize: 12, color: "var(--warn)" }}>Este PAS no tiene teléfono cargado.</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {link
          ? <a className="btn-wa-grande" href={link} target="_blank" rel="noreferrer" onClick={alEnviar} style={{ padding: "8px 14px", fontSize: 14 }}><Icono nombre="mensaje" size={16} /> Abrir WhatsApp</a>
          : <span style={{ fontSize: 13, color: "var(--muted)" }}>Cargá el teléfono para enviarlo.</span>}
        {para === "cliente" && actual.cuerpo && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: tocado ? "var(--muted)" : "var(--sub)" }} title={tocado ? "Editaste el texto: el mensaje del estudio no se cambia" : undefined}>
            <input type="checkbox" checked={usarComoMensaje && !tocado} disabled={tocado} onChange={e => setUsarComoMensaje(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
            Usar también como mensaje del estudio
          </label>
        )}
      </div>
      {aviso && <div role="status" style={{ fontSize: 12, color: "var(--ok)" }}>{aviso}</div>}
    </div>
  );
}
