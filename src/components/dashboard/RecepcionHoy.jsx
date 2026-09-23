import { useState, useEffect, useMemo } from "react";
import { pendientesRecepcion, escucharRecepcion, etiquetaDoc } from "../../utils/subidasCliente.js";
import Boton from "../ui/Boton.jsx";

// Documentación que mandaron los clientes desde su vista y todavía no guardaste en la PC
export default function RecepcionHoy({ allCasos, onAbrir }) {
  const [pendientes, setPendientes] = useState([]);
  useEffect(() => {
    const cargar = () => pendientesRecepcion().then(d => setPendientes(d || []));
    cargar();
    return escucharRecepcion(cargar);
  }, []);

  const porCaso = useMemo(() => {
    const casos = Object.fromEntries(allCasos.map(c => [String(c.id), c]));
    const grupos = {};
    pendientes.forEach(s => { (grupos[s.caso_id] ||= []).push(s); });
    return Object.entries(grupos).map(([id, lista]) => ({ caso: casos[id], lista })).filter(g => g.caso);
  }, [pendientes, allCasos]);

  if (!porCaso.length) return null;

  return (
    <section aria-labelledby="recepcion-hoy" style={{ background: "var(--card)", border: "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <h2 id="recepcion-hoy" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Documentación recibida</h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{pendientes.length} {pendientes.length === 1 ? "archivo" : "archivos"} para guardar</span>
      </div>
      {porCaso.map(({ caso, lista }, i) => {
        const tipos = [...new Set(lista.map(s => etiquetaDoc(s.tipo)))];
        return (
          <div key={caso.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i ? "1px solid var(--border)" : "none", flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 180 }}>
              <span style={{ display: "block", fontWeight: 600, fontSize: 14 }}>{caso.asegurado || "Sin nombre"}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--sub)" }}>{tipos.join(", ")} · {new Date(lista[0].creado).toLocaleDateString("es-AR")}</span>
            </span>
            <Boton tamaño="sm" variante="primario" onClick={() => onAbrir(caso)}>Guardar en el caso</Boton>
          </div>
        );
      })}
    </section>
  );
}
