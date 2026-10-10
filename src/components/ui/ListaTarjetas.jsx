// Lista vertical de tarjetas (Para hacer, Cobros). render(item) devuelve la tarjeta; el orden es el que viene.
export default function ListaTarjetas({ items, render, gap = 10 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {items.map(x => <div key={x.id} className="entra">{render(x)}</div>)}
    </div>
  );
}
