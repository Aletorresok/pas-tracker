import { useState, useMemo } from "react";
import { fmtMoney, diasDesde } from "../utils/formatters.js";
import { ESTADOS_CASO } from "../constants.js";
import CasoDetalle from "../CasoUnificado.jsx";
import { useCompanias } from "./caso/CompaniaSelector.jsx";
import FiltrosEstados from "./caso/FiltrosEstados.jsx";
import { deleteCaso } from "../utils/storage.js";
import { alpha } from "../utils/theme.js";
import EstadoPill from "./ui/EstadoPill.jsx";

const estadoInfo = key => ESTADOS_CASO.find(e => e.key === key) || { label: key || "—", emoji: "", color: "var(--muted)" };

export default function TabCasos({ pas, casos, onSaveCasos, darkMode, pasManuales = [] }) {
  const { companias, agregarCompania: onAgregarCompania } = useCompanias(casos);
  const [busqueda, setBusqueda] = useState("");
  const [filtrosEstados, setFiltrosEstados] = useState(() => ESTADOS_CASO.map(e => e.key));
  const [ordenCasos, setOrdenCasos] = useState("ultimo_mov");
  const [casoDetalle, setCasoDetalle] = useState(null);
  const [pasIdDetalle, setPasIdDetalle] = useState(null);

  const todosLosPas = useMemo(() => [...pas, ...pasManuales], [pas, pasManuales]);

  const allCasos = useMemo(() => {
    return Object.entries(casos).flatMap(([pasId, casosList]) => {
      const pasObj = todosLosPas.find(p => String(p.id) === String(pasId));
      return (casosList || []).map(c => ({ ...c, _pasId: pasId, _pasNombre: pasObj?.nombre || "PAS desconocido" }));
    });
  }, [casos, todosLosPas]);

  const filtered = useMemo(() => {
    let list = allCasos.filter(c => filtrosEstados.includes(c.estado));

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      list = list.filter(c =>
        (c.asegurado || "").toLowerCase().includes(q) ||
        (c._pasNombre || "").toLowerCase().includes(q) ||
        (c.compania_aseguradora || "").toLowerCase().includes(q) ||
        (c.nro_siniestro || "").toLowerCase().includes(q)
      );
    }

    switch (ordenCasos) {
      case "ultimo_mov":
        list.sort((a, b) => (b.fecha_ultimo_movimiento || b.fecha_derivacion || "").localeCompare(a.fecha_ultimo_movimiento || a.fecha_derivacion || ""));
        break;
      case "alfabetico":
        list.sort((a, b) => (a.asegurado || "").localeCompare(b.asegurado || ""));
        break;
      case "estado": {
        const orden = Object.fromEntries(ESTADOS_CASO.map((e, i) => [e.key, i]));
        list.sort((a, b) => (orden[a.estado] ?? 99) - (orden[b.estado] ?? 99));
        break;
      }
      case "monto":
        list.sort((a, b) => (Number(b.monto_acordado) || Number(b.monto_ofrecimiento) || 0) - (Number(a.monto_acordado) || Number(a.monto_ofrecimiento) || 0));
        break;
      case "pas":
        list.sort((a, b) => (a._pasNombre || "").localeCompare(b._pasNombre || ""));
        break;
    }
    return list;
  }, [allCasos, busqueda, filtrosEstados, ordenCasos]);

  const handleDeleteCaso = (caso) => {
    if (!window.confirm(`¿Eliminar definitivamente el caso de ${caso.asegurado || "este asegurado"}? Esta acción no se puede deshacer.`)) return;
    deleteCaso(caso.id);
    onSaveCasos(caso._pasId, (casos[String(caso._pasId)] || []).filter(c => c.id !== caso.id), caso._pasNombre);
  };

  const iStyle = {
    background: "var(--card2)",
    border: `1px solid ${"var(--border)"}`,
    borderRadius: 10,
    color: "var(--text)",
    padding: "10px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit",
  };

  return (
    <div>
      <FiltrosEstados filtrosEstados={filtrosEstados} setFiltrosEstados={setFiltrosEstados} allCasos={allCasos} darkMode={darkMode} />

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por asegurado, PAS, compañía o siniestro..." style={{ ...iStyle, flex: 1, minWidth: 200 }} />
        <select value={ordenCasos} onChange={e => setOrdenCasos(e.target.value)} style={{ ...iStyle, flex: "none", width: "auto", minWidth: 140, cursor: "pointer" }}>
          <option value="ultimo_mov">Último mov.</option>
          <option value="alfabetico">A → Z</option>
          <option value="estado">Estado</option>
          <option value="monto">Monto</option>
          <option value="pas">PAS</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: "var(--sub)", marginBottom: 12 }}>
        {filtered.length} caso{filtered.length !== 1 ? "s" : ""} mostrados ({filtrosEstados.length} de {ESTADOS_CASO.length} estados activos)
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)" }}>
          <div style={{ fontSize: 14 }}>Sin resultados con los filtros actuales</div>
          <button onClick={() => { setFiltrosEstados(ESTADOS_CASO.map(e => e.key)); setBusqueda(""); }} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, marginTop: 8, fontWeight: 600 }}>Restablecer filtros</button>
        </div>
      )}

      {filtered.map(c => {
        const ei = estadoInfo(c.estado);
        const dias = c.fecha_derivacion ? diasDesde(c.fecha_derivacion) : null;
        const monto = Number(c.monto_acordado) || Number(c.monto_ofrecimiento) || 0;

        return (
          <div
            key={c.id}
            onClick={() => { setCasoDetalle(c); setPasIdDetalle(c._pasId); }}
            style={{
              background: "var(--card)",
              border: `1px solid ${"var(--border)"}`,
              borderLeft: `3px solid ${ei.color}`,
              borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer", transition: "border-color .15s, box-shadow .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = alpha(ei.color, 53); e.currentTarget.style.boxShadow = `0 2px 8px ${alpha(ei.color, 13)}`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.asegurado || "Sin nombre"}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  <EstadoPill estado={c.estado} size="sm" />
                  <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>
                    {c._pasNombre}
                  </span>
                  {c.compania_aseguradora && (
                    <span style={{ fontSize: 11, background: "var(--card2)", color: "var(--sub)", borderRadius: 6, padding: "2px 7px", border: `1px solid ${"var(--border)"}` }}>
                      {c.compania_aseguradora}
                    </span>
                  )}
                  {dias !== null && <span style={{ fontSize: 11, color: "var(--muted)" }}>{dias}d</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                {monto > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>{fmtMoney(monto)}</span>}
                <button onClick={e => { e.stopPropagation(); handleDeleteCaso(c); }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 16, cursor: "pointer", padding: "2px 4px", lineHeight: 1 }} title="Eliminar caso">×</button>
              </div>
            </div>
          </div>
        );
      })}

      {casoDetalle && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, overflowY: "auto", background: "var(--bg)" }}>
          <CasoDetalle
            caso={casoDetalle} pasId={pasIdDetalle} pasNombre={casoDetalle._pasNombre} darkMode={darkMode}
            companias={companias} onAgregarCompania={onAgregarCompania}
            onUpdate={updated => {
              const cur = casos[String(pasIdDetalle)] || [];
              const pasNom = todosLosPas.find(p => String(p.id) === String(pasIdDetalle))?.nombre || "";
              onSaveCasos(pasIdDetalle, cur.map(c => c.id === updated.id ? updated : c), pasNom);
              setCasoDetalle(updated);
            }}
            onClose={() => { setCasoDetalle(null); setPasIdDetalle(null); }}
          />
        </div>
      )}
    </div>
  );
}