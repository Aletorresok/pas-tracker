import { useCallback, useMemo, useState } from "react";
import AvisoDeshacer from "../ui/AvisoDeshacer.jsx";
import { diasDesde } from "../../utils/formatters.js";
import PASCard from "../PASCard.jsx";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";
import { recordatorioPendiente, fueInteresado, recibioRecordatorio, textoRecordatorio, linkWhatsApp, DIAS_RECORDATORIO } from "../../utils/mensajes.js";

const POR_TANDA = 40;
export const ultimoContacto = (historial, id) => { const h = historial[id] || []; return h[h.length - 1]; };

// "Para descartar": el último contacto fue hace más de DIAS_DESCARTAR días y no quedó como interesado
// (los que derivan o ya están descartados no entran)
const DIAS_DESCARTAR = 60;
const paraDescartar = lista => {
  const ultimo = lista?.[lista.length - 1];
  return !!ultimo?.fecha && diasDesde(ultimo.fecha) > DIAS_DESCARTAR && !fueInteresado(lista) && !recordatorioPendiente(lista);
};

// Contactados = con al menos un contacto, que no derivan ni están descartados
export const FILTROS_CONTACTADOS = [
  { k: "contactados", l: "Contactados", test: (p, h, d, x) => h[p.id]?.length > 0 && !d[p.id] && !x[p.id] },
  { k: "interesados", l: "Interesados", test: (p, h, d, x) => fueInteresado(h[p.id]) && !d[p.id] && !x[p.id] },
  { k: "recordar", l: "Para recordar", test: (p, h, d, x) => !!recordatorioPendiente(h[p.id]) && !d[p.id] && !x[p.id] },
  { k: "descartar", l: "Para descartar", test: (p, h, d, x) => paraDescartar(h[p.id]) && !d[p.id] && !x[p.id] },
  { k: "descartados", l: "Descartados", test: (p, h, d, x) => !!x[p.id] },
];

export default function ListaContactados({ pas, historial, derivadores, descartados, filtro, onContactar, onToggleDerivador, onToggleDescartado, onDescartarVarios, onRecordatorio }) {
  const [deshacer, setDeshacer] = useState(null); // ids recién descartados de una vez
  const cerrarAviso = useCallback(() => setDeshacer(null), []);
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
      style={{ padding: "5px 12px", borderRadius: "var(--r-xl)", fontSize: 12, fontWeight: orden === k ? 700 : 500, cursor: "pointer", border: `1px solid ${orden === k ? "var(--text)" : "var(--border)"}`, background: "var(--card)", color: orden === k ? "var(--text)" : "var(--sub)" }}>{l}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setMostrar(POR_TANDA); }} placeholder="Buscar por nombre, mail o teléfono…" aria-label="Buscar contactados"
        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Ordenar:</span>
        {chipOrden("recientes", "Contacto más reciente")}
        {chipOrden("antiguos", "Hace más tiempo")}
        {chipOrden("nombre", "Nombre")}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--sub)" }}>{lista.length.toLocaleString("es-AR")} PAS</span>
      </div>

      {filtro === "recordar" && <AyudaRecordatorio pas={pas} historial={historial} derivadores={derivadores} />}
      {filtro === "descartar" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, color: "var(--sub)", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "10px 14px", lineHeight: 1.5 }}>
          <span style={{ flex: "1 1 260px" }}>PAS contactados hace más de {DIAS_DESCARTAR} días que no derivaron ni quedaron como interesados. Descartalos de a uno (click derecho o desde su detalle) o todos juntos.</span>
          {onDescartarVarios && lista.length > 0 && (
            <Boton tamaño="sm" onClick={async () => {
              if (!window.confirm(`¿Descartar ${lista.length === 1 ? "este PAS" : `estos ${lista.length} PAS`}? Pasan a Descartados y no vuelven a aparecer en Contactos.`)) return;
              const ids = lista.map(p => p.id);
              await onDescartarVarios(ids, true);
              setDeshacer(ids);
            }}>Descartar {lista.length === 1 ? "este PAS" : `los ${lista.length.toLocaleString("es-AR")}`}</Boton>
          )}
        </div>
      )}
      {deshacer && (
        <AvisoDeshacer texto={`${deshacer.length.toLocaleString("es-AR")} PAS descartados`} onCerrar={cerrarAviso}
          onDeshacer={() => onDescartarVarios(deshacer, false)} />
      )}

      {filtro === "recordar" && lista.length > 0 ? (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", overflow: "hidden" }}>
          {lista.slice(0, mostrar).map((p, i) => {
            const r = recordatorioPendiente(historial[p.id]);
            const wa = (p.telefonos || [])[0] ? linkWhatsApp(p.telefonos[0], textoRecordatorio(p.nombre)) : null;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: i ? "1px solid var(--border)" : "none", flexWrap: "wrap" }}>
                <span style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{p.nombre || "Sin nombre"}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>Interesado hace {r?.dias} días · no derivó</span>
                </span>
                {wa
                  ? <a href={wa} target="_blank" rel="noreferrer" onClick={() => onRecordatorio?.(p)} className="btn-wa-grande" style={{ padding: "7px 12px", fontSize: 13 }}><Icono nombre="mensaje" size={14} /> Mandar recordatorio</a>
                  : <span style={{ fontSize: 12, color: "var(--muted)" }}>Sin teléfono</span>}
                <Boton tamaño="sm" variante="fantasma" onClick={() => onRecordatorio?.(p, { sinMandar: true })} title="Sale de la lista sin mandar nada">No mandar</Boton>
              </div>
            );
          })}
        </div>
      ) : lista.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--sub)", fontSize: 14 }}>No hay PAS en "{def.l}"{busqueda.trim() ? " con esa búsqueda" : ""}.</div>
      ) : (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", overflow: "hidden" }}>
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

// Cómo funciona el recordatorio y si sirve: de los que lo recibieron, cuántos terminaron derivando
function AyudaRecordatorio({ pas, historial, derivadores }) {
  const conRecordatorio = pas.filter(p => recibioRecordatorio(historial[p.id]));
  const derivaron = conRecordatorio.filter(p => derivadores[p.id]).length;
  return (
    <div style={{ fontSize: 13, color: "var(--sub)", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "10px 14px", lineHeight: 1.5 }}>
      PAS que te dijeron que te iban a tener en cuenta y en {DIAS_RECORDATORIO} días no derivaron. Se les manda <b>un solo</b> recordatorio útil y después salen de la lista.
      {conRecordatorio.length > 0 && <> De {conRecordatorio.length} {conRecordatorio.length === 1 ? "recordatorio enviado" : "recordatorios enviados"}, <b>{derivaron}</b> {derivaron === 1 ? "derivó" : "derivaron"}.</>}
    </div>
  );
}
