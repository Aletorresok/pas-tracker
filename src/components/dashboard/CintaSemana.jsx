import { fechaLocalISO, sumarDias } from "../../utils/formatters.js";

// Color de cada punto según el tipo de pendiente (el mismo criterio que las etiquetas de Hoy)
const TONO = { plazo: "var(--e-en_mediacion)", escrito: "var(--e-en_mediacion)", cobro: "var(--oro)", firma: "var(--oro)", honorarios: "var(--oro)" };
const MAX_PUNTOS = 4;

// La semana en una cinta: hoy y los 6 días siguientes, con un punto por cada caso que vence ese día.
// Hoy suma lo vencido (en rojo). Sábado y domingo van punteados. Solo informa: la lista de abajo es la que se usa.
export default function CintaSemana({ grupos }) {
  const hoy = fechaLocalISO();
  // sumarDias(x, 0) devuelve null: hoy va aparte
  const dias = Array.from({ length: 7 }, (_, i) => (i === 0 ? hoy : sumarDias(hoy, i)));
  return (
    <div className="cinta-semana" aria-label="Vencimientos de la semana">
      {dias.map((iso, i) => {
        const fecha = new Date(`${iso}T12:00:00`);
        const finde = [0, 6].includes(fecha.getDay());
        const delDia = grupos.filter(g => g.vence && (i === 0 ? g.vence <= iso : g.vence === iso));
        const puntos = delDia.slice(0, MAX_PUNTOS).map(g => (g.vence < hoy ? "var(--bad)" : TONO[g.tareas[0]?.tipo] || "var(--warn)"));
        const nombre = fecha.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "");
        return (
          <div key={iso} className={`cinta-dia${i === 0 ? " hoy" : ""}${finde ? " finde" : ""}`}
            aria-label={`${i === 0 ? "Hoy" : nombre} ${fecha.getDate()}: ${delDia.length ? `${delDia.length} ${delDia.length === 1 ? "caso" : "casos"}` : "nada"}`}>
            <small aria-hidden="true">{i === 0 ? "Hoy" : nombre}</small>
            <b aria-hidden="true" className="num">{fecha.getDate()}</b>
            <span className="cinta-puntos" aria-hidden="true">
              {puntos.map((tono, k) => <span key={k} style={{ "--tono": tono }} />)}
            </span>
            {/* Más de 4: el resto en número, para que un día cargado no se vea igual que uno tranquilo */}
            {delDia.length > MAX_PUNTOS && <small className="num cinta-mas" aria-hidden="true">+{delDia.length - MAX_PUNTOS}</small>}
          </div>
        );
      })}
    </div>
  );
}
