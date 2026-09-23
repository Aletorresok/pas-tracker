import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "../supabase.js";
import { VISTAS_C } from "../constants.js";
import { normalizarContacto } from "../hooks/usePASData.js";
import PASCard from "./PASCard.jsx";
import Boton from "./ui/Boton.jsx";
import { alpha } from "../utils/theme.js";

const POR_TANDA = 40;
const COLUMNA_ORDEN = { nombre: "nombre", telefono: "telefonos", mail: "mail" };

// Arma la consulta de contactos según vista, búsqueda y orden (sin paginar)
function consultaContactos({ vista, busqueda, orden, soloContar = false }) {
  let q = soloContar
    ? supabase.from("pas_contactos").select("id", { count: "exact", head: true })
    : supabase.from("pas_contactos").select("*");
  if (vista !== "todos") q = q.eq("prioridad", vista);
  const texto = busqueda.trim().replace(/[,()*%\\]/g, " ").trim();
  if (texto) q = q.or(`nombre.ilike.*${texto}*,mail.ilike.*${texto}*,telefonos.ilike.*${texto}*`);
  if (!soloContar) q = q.order(COLUMNA_ORDEN[orden] || "nombre", { ascending: true }).order("id");
  return q;
}

// Lista de contactos sin contactar. Con 50 mil registros no se descargan todos:
// se piden de a tandas a Supabase y se filtran los ya contactados y descartados.
export default function TabContactos({
  pas,
  historial,
  derivadores,
  descartados,
  darkMode,
  onContactar,
  onToggleDerivador,
  onToggleDescartado,
  onAgregarPas,
}) {
  const [vista, setVista] = useState("agendado");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaActiva, setBusquedaActiva] = useState("");
  const [orden, setOrden] = useState("nombre");
  const [expandedId, setExpandedId] = useState(null);

  const [lista, setLista] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hayMas, setHayMas] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [conteos, setConteos] = useState({});
  const pedidoRef = useRef(0);

  // No van en esta lista: los ya contactados y los descartados
  const excluir = useCallback(
    p => (historial[p.id]?.length > 0) || descartados[p.id],
    [historial, descartados]
  );

  // Espera a que termines de escribir para buscar
  useEffect(() => {
    const t = setTimeout(() => setBusquedaActiva(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Trae la próxima tanda; sigue pidiendo si la tanda quedó casi vacía por los excluidos
  const cargar = useCallback(async (desde, reiniciar) => {
    const pedido = ++pedidoRef.current;
    setCargando(true);
    setError("");
    let nuevos = [];
    let cursor = desde;
    let quedan = true;
    try {
      while (quedan && nuevos.length < POR_TANDA) {
        const { data, error: err } = await consultaContactos({ vista, busqueda: busquedaActiva, orden })
          .range(cursor, cursor + POR_TANDA * 2 - 1);
        if (err) throw err;
        if (pedido !== pedidoRef.current) return; // cambió el filtro mientras cargaba
        cursor += data.length;
        quedan = data.length === POR_TANDA * 2;
        nuevos = nuevos.concat(data.map(normalizarContacto).filter(p => !excluir(p)));
      }
      setLista(prev => (reiniciar ? nuevos : [...prev, ...nuevos]));
      setOffset(cursor);
      setHayMas(quedan);
    } catch (e) {
      console.error("[TabContactos] error:", e);
      if (pedido === pedidoRef.current) setError("No se pudieron cargar los contactos. Revisá la conexión y probá de nuevo.");
    } finally {
      if (pedido === pedidoRef.current) setCargando(false);
    }
  }, [vista, busquedaActiva, orden, excluir]);

  // Al cambiar vista, búsqueda u orden, empieza de cero
  useEffect(() => {
    setExpandedId(null);
    cargar(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, busquedaActiva, orden]);

  // Cantidad por vista = total en la base − los ya contactados/descartados de esa vista
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const excluidosPorVista = { todos: 0 };
      pas.forEach(p => {
        if (!excluir(p)) return;
        excluidosPorVista.todos++;
        excluidosPorVista[p.prioridad] = (excluidosPorVista[p.prioridad] || 0) + 1;
      });
      const res = await Promise.all(VISTAS_C.map(v => consultaContactos({ vista: v.key, busqueda: "", orden, soloContar: true })));
      if (cancelado) return;
      const c = {};
      VISTAS_C.forEach((v, i) => {
        if (res[i].count != null) c[v.key] = Math.max(0, res[i].count - (excluidosPorVista[v.key] || 0));
      });
      setConteos(c);
    })();
    return () => { cancelado = true; };
    // Los conteos solo cambian al contactar o descartar a alguien
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historial, descartados]);

  // Si contactás o descartás a alguien de la lista, sale de la lista al instante
  const visibles = useMemo(() => lista.filter(p => !excluir(p)), [lista, excluir]);

  // Contactar o marcar derivador suma el contacto a los que la app mantiene cargados
  const porId = useMemo(() => Object.fromEntries(visibles.map(p => [String(p.id), p])), [visibles]);
  const contactar = (p) => { onAgregarPas?.(p); onContactar(p); };
  const toggleDerivador = (id) => { if (porId[String(id)]) onAgregarPas?.(porId[String(id)]); onToggleDerivador(id); };

  const iStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text)",
    padding: "10px 12px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 2, alignItems: "center" }}>
        {VISTAS_C.map(v => {
          const activa = vista === v.key;
          return (
            <button key={v.key} type="button" onClick={() => { setVista(v.key); setBusqueda(""); }} aria-pressed={activa}
              style={{ flex: "none", whiteSpace: "nowrap", padding: "5px 12px", borderRadius: 999, fontSize: 12, cursor: "pointer", fontWeight: activa ? 700 : 500,
                border: `1px solid ${activa ? "var(--text)" : "var(--border)"}`, background: "var(--card)", color: activa ? "var(--text)" : "var(--sub)" }}>
              {v.label}{" "}
              <span className="num" style={{ fontWeight: 700, color: "var(--text)" }}>{conteos[v.key] != null ? conteos[v.key].toLocaleString("es-AR") : "…"}</span>
            </button>
          );
        })}
      </div>

      <input
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, mail o teléfono..."
        aria-label="Buscar contactos"
        style={{ ...iStyle, marginBottom: 8 }}
      />

      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 2 }}>Ordenar:</span>
        {[
          { key: "nombre", label: "Nombre" },
          { key: "telefono", label: "Teléfono" },
          { key: "mail", label: "Mail" },
        ].map(o => (
          <button key={o.key} type="button" onClick={() => setOrden(o.key)} aria-pressed={orden === o.key} style={{
            padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: orden === o.key ? 700 : 500,
            border: `1px solid ${orden === o.key ? "var(--text)" : "var(--border)"}`,
            background: "var(--card)",
            color: orden === o.key ? "var(--text)" : "var(--sub)",
            cursor: "pointer",
          }}>
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "var(--sub)", marginBottom: 12 }}>
        {busquedaActiva.trim()
          ? `${visibles.length.toLocaleString("es-AR")}${hayMas ? "+" : ""} resultados para "${busquedaActiva.trim()}"`
          : `Mostrando ${visibles.length.toLocaleString("es-AR")}${conteos[vista] != null ? ` de ${conteos[vista].toLocaleString("es-AR")}` : ""}`}
      </div>

      {error && (
        <div style={{ background: alpha("var(--bad)", 10), border: `1px solid ${alpha("var(--bad)", 30)}`, color: "var(--bad)", borderRadius: 8, padding: "10px 12px", fontSize: 13, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          {error}
          <Boton tamaño="sm" onClick={() => cargar(visibles.length ? offset : 0, !visibles.length)}>Reintentar</Boton>
        </div>
      )}

      {!cargando && !error && visibles.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--sub)", fontSize: 14 }}>
          {busquedaActiva.trim() ? "Ningún contacto sin contactar coincide con la búsqueda." : "No hay contactos pendientes en esta vista."}
        </div>
      )}

      {visibles.length > 0 && <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      {visibles.map(p => (
        <PASCard
          key={p.id}
          pas={p}
          historial={historial}
          derivadores={derivadores}
          onContactar={contactar}
          onToggleDerivador={toggleDerivador}
          onToggleDescartado={onToggleDescartado}
          descartados={descartados}
          expanded={expandedId === p.id}
          onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
          darkMode={darkMode}
        />
      ))}
      </div>}

      {(hayMas || cargando) && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <Boton onClick={() => cargar(offset, false)} disabled={cargando}>
            {cargando ? "Cargando…" : "Mostrar más"}
          </Boton>
        </div>
      )}
    </>
  );
}
