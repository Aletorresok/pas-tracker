import { useMemo, useState } from "react";
import TabContactos from "./TabContactos.jsx";
import ListaContactados, { FILTROS_CONTACTADOS } from "./prospeccion/ListaContactados.jsx";

// Contactos y Contactados en una sola pestaña, con filtros arriba
export default function TabProspeccion(props) {
  const { pas, historial, derivadores, descartados } = props;
  const [filtro, setFiltro] = useState("sin_contactar");

  const conteos = useMemo(() => {
    const contactados = pas.filter(p => historial[p.id]?.length > 0 && !descartados[p.id]);
    return Object.fromEntries(FILTROS_CONTACTADOS.map(f => [f.k, contactados.filter(p => f.test(p, historial, derivadores)).length]));
  }, [pas, historial, derivadores, descartados]);

  const chip = (k, l, n) => {
    const activo = filtro === k;
    return (
      <button key={k} type="button" onClick={() => setFiltro(k)} aria-pressed={activo}
        style={{ flex: "none", whiteSpace: "nowrap", padding: "6px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer", fontWeight: activo ? 600 : 500,
          border: `1px solid ${activo ? "var(--text)" : "var(--border)"}`, background: activo ? "var(--text)" : "var(--card)", color: activo ? "var(--bg)" : "var(--sub)" }}>
        {l}{n !== undefined && <b className="num" style={{ marginLeft: 6, color: activo ? "var(--bg)" : "var(--text)" }}>{n}</b>}
      </button>
    );
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Prospección</h1>
      <div role="group" aria-label="Filtrar PAS" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {chip("sin_contactar", "Sin contactar")}
        {FILTROS_CONTACTADOS.map(f => chip(f.k, f.l, conteos[f.k]))}
      </div>
      {filtro === "sin_contactar"
        ? <TabContactos {...props} />
        : <ListaContactados {...props} filtro={filtro} />}
    </div>
  );
}
