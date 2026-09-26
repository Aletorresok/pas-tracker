import { useMemo, useState } from "react";

export const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 };
export const tono = pct => `color-mix(in srgb, var(--accent) ${pct}%, var(--card))`;

// Valor con la cantidad de casos sobre la que se calculó: "32 d · 7"
export function ConMuestra({ valor, n, sufijo = "" }) {
  if (valor === null || valor === undefined) return <span style={{ color: "var(--muted)" }}>—</span>;
  return (
    <span className="num" title={`Calculado sobre ${n} ${n === 1 ? "caso" : "casos"}`}>
      {valor}{sufijo}<span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 5 }}>· {n}</span>
    </span>
  );
}

// Barra fina debajo de un número, para comparar entre filas
export function Barrita({ valor, max, color = tono(70) }) {
  const ancho = valor && max ? Math.max(4, Math.round((valor / max) * 100)) : 0;
  return (
    <div aria-hidden="true" style={{ height: 4, background: "var(--card2)", borderRadius: 2, overflow: "hidden", marginTop: 5 }}>
      <div style={{ width: `${ancho}%`, height: "100%", background: color, borderRadius: 2 }} />
    </div>
  );
}

export function Nota({ children }) {
  return <p style={{ margin: "10px 2px 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{children}</p>;
}

// Tabla ordenable con el mismo aspecto que Clientes.
// columnas: [{ k, l, ancho, derecha, valor(fila) para ordenar, celda(fila) para mostrar, ayuda }]
export default function TablaAnalisis({ columnas, filas, ordenInicial, clave, onFila, vacio = "Sin datos todavía.", minWidth = 760 }) {
  const [orden, setOrden] = useState(ordenInicial);

  const ordenadas = useMemo(() => {
    const col = columnas.find(c => c.k === orden.k);
    if (!col) return filas;
    const val = col.valor || (f => f[col.k]);
    return [...filas].sort((a, b) => {
      const va = val(a), vb = val(b);
      // Los vacíos van siempre al final
      if (va === null || va === undefined) return vb === null || vb === undefined ? 0 : 1;
      if (vb === null || vb === undefined) return -1;
      const cmp = typeof va === "string" ? va.localeCompare(vb, "es") : va - vb;
      return orden.desc ? -cmp : cmp;
    });
  }, [filas, columnas, orden]);

  const ordenarPor = k => setOrden(o => (o.k === k ? { k, desc: !o.desc } : { k, desc: true }));

  if (!filas.length) return <div style={{ ...card, padding: 24, textAlign: "center", color: "var(--sub)", fontSize: 14 }}>{vacio}</div>;

  return (
    <div style={{ ...card, overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth, borderCollapse: "collapse", tableLayout: "fixed", fontSize: 14 }}>
        <colgroup>{columnas.map(c => <col key={c.k} style={{ width: c.ancho }} />)}</colgroup>
        <thead>
          <tr>
            {columnas.map(col => {
              const activa = orden.k === col.k;
              return (
                <th key={col.k} scope="col" title={col.ayuda} aria-sort={activa ? (orden.desc ? "descending" : "ascending") : "none"}
                  style={{ padding: 0, background: "var(--card2)", borderBottom: "1px solid var(--border)", textAlign: col.derecha ? "right" : "left", verticalAlign: "bottom" }}>
                  <button type="button" onClick={() => ordenarPor(col.k)}
                    style={{ width: "100%", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, lineHeight: 1.3, color: activa ? "var(--text)" : "var(--muted)", textAlign: col.derecha ? "right" : "left" }}>
                    {col.l}{activa ? (orden.desc ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map(f => (
            <tr key={clave(f)} className="fila-caso" onClick={onFila ? () => onFila(f) : undefined} style={onFila ? { cursor: "pointer" } : undefined}>
              {columnas.map(col => (
                <td key={col.k} style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", textAlign: col.derecha ? "right" : "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {col.celda ? col.celda(f) : f[col.k]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
