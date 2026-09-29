import { DIAS_SEMANA, lunesDe, primeroDelMes, claveRegistro, diaSemana } from "../../utils/rutina.js";
import { sumarDiasISO } from "../../utils/plazos.js";
import { FilaItem, Barra, tarjeta } from "./comunes.jsx";

const corta = iso => new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" });

// Semana: lo semanal por día (y lo de "cualquier día"). Mes: lo mensual por día del mes.
export default function RutinaPeriodo({ tipo, items, registro, onTildar, onIr, hoy }) {
  const frecuencia = tipo === "semana" ? "semanal" : "mensual";
  const lista = items.filter(i => i.activo && i.frecuencia === frecuencia);
  const inicio = tipo === "semana" ? lunesDe(hoy) : primeroDelMes(hoy);
  const hecho = i => registro.has(`${i.id}|${claveRegistro(i, hoy)}`);

  const grupos = tipo === "semana"
    ? [...DIAS_SEMANA.map((d, n) => ({ k: n + 1, titulo: `${d} ${corta(sumarDiasISO(inicio, n))}`, hoy: diaSemana(hoy) === n + 1, items: lista.filter(i => Number(i.dia) === n + 1) })),
       { k: "cualquiera", titulo: "Cualquier día de la semana", items: lista.filter(i => !i.dia) }]
    : [...[...new Set(lista.map(i => Number(i.dia) || 0))].sort((a, b) => (a || 99) - (b || 99)).map(d => ({ k: d, titulo: d ? `Día ${d}` : "Último día del mes", hoy: d === Number(hoy.slice(8, 10)), items: lista.filter(i => (Number(i.dia) || 0) === d) }))];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 820 }}>
      <div style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{tipo === "semana" ? `Semana del ${corta(inicio)}` : new Date(`${inicio}T12:00:00`).toLocaleDateString("es-AR", { month: "long", year: "numeric" }).replace(/^./, c => c.toUpperCase())}</span>
        {lista.length ? <Barra hechos={lista.filter(hecho).length} total={lista.length} /> : <div style={{ fontSize: 14, color: "var(--muted)" }}>No hay nada {tipo === "semana" ? "semanal" : "mensual"} en la rutina. Agregalo desde "Editar rutina".</div>}
      </div>
      {grupos.filter(g => g.items.length).map(g => (
        <div key={g.k} style={{ ...tarjeta, padding: "12px 16px", borderColor: g.hoy ? "var(--accent)" : "var(--border)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: g.hoy ? "var(--accent-ink)" : "var(--text)" }}>{g.titulo}{g.hoy ? " · hoy" : ""}</div>
          {g.items.map(i => <FilaItem key={i.id} item={i} hecho={hecho(i)} onTildar={(it, v) => onTildar(it, hoy, v)} onIr={onIr}
            extra={i.hora_inicio ? <span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{String(i.hora_inicio).slice(0, 5)}</span> : null} />)}
        </div>
      ))}
    </div>
  );
}
