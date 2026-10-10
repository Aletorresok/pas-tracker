// Encabezado de tabla ordenable (Casos, Clientes, Análisis): <colgroup> + <thead>.
// columnas: [{ k, l, ancho, derecha, ayuda }]; orden: { k, desc }. Con `pista`, las columnas sin ordenar muestran ↕ al pasar el mouse.
export default function CabeceraOrdenable({ columnas, orden, ordenarPor, pista }) {
  return (
    <>
      <colgroup>{columnas.map(c => <col key={c.k} style={{ width: c.ancho }} />)}</colgroup>
      <thead>
        <tr>
          {columnas.map(col => {
            const activa = orden.k === col.k;
            const alinear = col.derecha ? "right" : "left";
            return (
              <th key={col.k} scope="col" title={col.ayuda} aria-sort={activa ? (orden.desc ? "descending" : "ascending") : "none"}
                style={{ padding: 0, background: "var(--card2)", borderBottom: "1px solid var(--border)", textAlign: alinear, verticalAlign: "bottom" }}>
                <button type="button" onClick={() => ordenarPor(col.k)} className={pista ? "th-orden" : undefined}
                  style={{ width: "100%", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, lineHeight: 1.3, color: activa ? "var(--text)" : "var(--muted)", textAlign: alinear }}>
                  {col.l}{pista
                    ? <span aria-hidden="true" className={activa ? undefined : "th-flecha"} style={{ marginLeft: 4 }}>{activa ? (orden.desc ? "↓" : "↑") : "↕"}</span>
                    : activa ? (orden.desc ? " ↓" : " ↑") : ""}
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
    </>
  );
}
