import { useMemo, useState } from "react";
import PASCard from "../PASCard.jsx";
import Boton from "../ui/Boton.jsx";

const POR_TANDA = 40;
export const ultimoContacto = (historial, id) => { const h = historial[id] || []; return h[h.length - 1]; };

// Contactados = con al menos un contacto, que no derivan ni están descartados
export const FILTROS_CONTACTADOS = [
  { k: "contactados", l: "Contactados", test: (p, h, d, x) => h[p.id]?.length > 0 && !d[p.id] && !x[p.id] },
  { k: "derivadores", l: "Derivadores", test: (p, h, d, x) => !!d[p.id] && !x[p.id] },
  { k: "descartados", l: "Descartados", test: (p, h, d, x) => !!x[p.id] },
];

export default function ListaContactados({ pas, historial, derivadores, descartados, filtro, onContactar, onToggleDerivador, onToggleDescartado }) {
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("recientes");
  const [mostrar, setMostrar] = useState(POR_TANDA);
  const [expandedId, setExpandedId] = useState(null);

  const def = FILTROS_CONTACTADOS.find(f => f.k === filtro) || FILTROS_CONTACTADOS[FILTROS_CONTACTADOS.length - 1];

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const fecha = p => ultimoContacto(historial, p.id)?.fecha || "";
    // sin contactos quedan al final en "más reciente" y al principio en "hace más tiempo"
    return pas
      .filter(p => def.test(p, historial, derivadores, descartados))
      .filter(p => !q || (p.nombre || "").toLowerCase().includes(q) || (p.mail || "").toLowerCase().includes(q) || (p.telefonos || []).join(" ").includes(q))
      .sort((a, b) => orden === "nombre" ? (a.nombre || "").localeCompare(b.nombre || "")
        : orden === "antiguos" ? fecha(a).localeCompare(fecha(b)) : fecha(b).localeCompare(fecha(a)));
  }, [pas, historial, derivadores, descartados, def, busqueda, orden]);

  const chipOrden = (k, l) => (
    <button key={k} type="button" onClick={() => setOrden(k)} aria-pressed={orden === k}
      style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: orden === k ? 700 : 500, cursor: "pointer", border: `1px solid ${orden === k ? "var(--text)" : "var(--border)"}`, background: "var(--card)", color: orden === k ? "var(--text)" : "var(--sub)" }}>{l}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setMostrar(POR_TANDA); }} placeholder="Buscar por nombre, mail o teléfono…" aria-label="Buscar contactados"
        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Ordenar:</span>
        {chipOrden("recientes", "Contacto más reciente")}
        {chipOrden("antiguos", "Hace más tiempo")}
        {chipOrden("nombre", "Nombre")}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--sub)" }}>{lista.length.toLocaleString("es-AR")} PAS</span>
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--sub)", fontSize: 14 }}>No hay PAS en "{def.l}"{busqueda.trim() ? " con esa búsqueda" : ""}.</div>
      ) : (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {lista.slice(0, mostrar).map(p => (
            <PASCard key={p.id} pas={p} historial={historial} derivadores={derivadores} descartados={descartados}
              onContactar={onContactar} onToggleDerivador={onToggleDerivador} onToggleDescartado={onToggleDescartado}
              expanded={expandedId === p.id} onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
        {lista.length > mostrar && <Boton onClick={() => setMostrar(m => m + POR_TANDA)}>Mostrar más</Boton>}
      </div>
    </div>
  );
}
