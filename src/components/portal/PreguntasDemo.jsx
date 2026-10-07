import Icono from "../ui/Icono.jsx";
import { linkWhatsApp, TELEFONO_ESTUDIO } from "../../utils/mensajes.js";
import { TEXTO_ACCESO } from "./demoPortal.js";

// Preguntas frecuentes al final de la demostración del portal (/portal/demo). Sin mención a comisión.
const PREGUNTAS = [
  ["¿Qué casos toman?",
    "Todo reclamo de tu cliente a la compañía del tercero: daños del vehículo y también lesiones. Además, los incumplimientos de la propia compañía de tu cliente."],
  ["¿Qué tengo que hacer yo?",
    "Derivar el caso desde el portal con el botón \"Derivar caso\". Del resto nos encargamos nosotros. Vos seguís cómo avanza desde acá o nos escribís cuando quieras."],
  ["¿Cuánto tarda?",
    "Depende de la compañía. En \"Estadísticas por compañía\" ves cuántos días suele tardar cada una en ofrecer y en pagar, con los casos del estudio."],
  ["¿Qué pasa si la compañía ofrece poco?",
    "Se negocia y, si no mejora, se va a mediación o a juicio. Siempre se le consulta al cliente antes de aceptar."],
  ["¿Dónde trabajan?",
    "Reclamos dentro de la Ciudad de Buenos Aires y la Provincia de Buenos Aires."],
  ["¿Cómo consigo mi acceso?",
    "Tocá \"Quiero mi acceso\" y te armamos el usuario para que veas tus casos reales."],
];

export default function PreguntasDemo({ T }) {
  return (
    <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: "18px" }}>
      <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: T.text }}>Preguntas frecuentes</h2>
      {PREGUNTAS.map(([p, r], i) => (
        <details key={p} style={{ borderTop: i ? `1px solid ${T.border}` : "none" }}>
          <summary style={{ cursor: "pointer", padding: "12px 0", fontSize: 14, fontWeight: 600, color: T.text }}>{p}</summary>
          <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5, color: T.sub }}>{r}</p>
        </details>
      ))}
      <a href={linkWhatsApp(TELEFONO_ESTUDIO, TEXTO_ACCESO)} target="_blank" rel="noreferrer" className="btn-wa-grande"
        style={{ marginTop: 12, padding: "10px 16px", fontSize: 14, display: "inline-flex" }}>
        <Icono nombre="mensaje" size={15} /> Quiero mi acceso
      </a>
    </section>
  );
}
