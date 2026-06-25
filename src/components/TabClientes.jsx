import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { fmtMoney, fmtDate, diasDesde } from "../utils/formatters.js";
import { ESTADOS_CASO } from "../constants.js";
import EstadoSelector from "./caso/EstadoSelector.jsx";
import CompaniaSelector, { useCompanias } from "./caso/CompaniaSelector.jsx";
import CasoDetalle from "../CasoUnificado.jsx";
import { deleteCasoFromAgenda } from "../utils/sync.js";
import { deleteCaso } from "../utils/storage.js";

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

const estadoInfo = key => ESTADOS_CASO.find(e => e.key === key) || { label: key || "—", emoji: "📄", color: "#64748b" };

function CasoCard({ caso, onDetalle, onDelete, darkMode }) {
  const ei = estadoInfo(caso.estado);
  const dias = caso.fecha_derivacion ? diasDesde(caso.fecha_derivacion) : null;
  const logOrdenado = [...(caso.notas_log || [])].sort((a, b) => b.ts - a.ts);
  const ultimaAccion = logOrdenado[0] || null;

  return (
    <div
      onClick={() => onDetalle(caso)}
      style={{
        background: darkMode ? "#0f172a" : "#fff",
        border: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`,
        borderLeft: `3px solid ${ei.color}`,
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 8,
        cursor: "pointer",
        transition: "border-color .15s, box-shadow .15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = ei.color + "88"; e.currentTarget.style.boxShadow = `0 2px 8px ${ei.color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = darkMode ? "#1e293b" : "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, color: darkMode ? "#f1f5f9" : "#0f172a", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {caso.asegurado || "Sin nombre"}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            <span style={{ fontSize: 10, background: ei.color + "18", color: ei.color, border: `1px solid ${ei.color}33`, borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>
              {ei.emoji} {ei.label}
            </span>
            {caso.compania && (
              <span style={{ fontSize: 10, background: darkMode ? "#1e293b" : "#f1f5f9", color: darkMode ? "#94a3b8" : "#64748b", borderRadius: 6, padding: "2px 7px", border: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}` }}>
                {caso.compania}
              </span>
            )}
            {dias !== null && (
              <span style={{ fontSize: 10, color: darkMode ? "#64748b" : "#94a3b8" }}>
                {dias}d
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {caso.monto_acordado || caso.monto_ofrecimiento ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1" }}>{fmtMoney(Number(caso.monto_acordado) || Number(caso.monto_ofrecimiento))}</span>
          ) : null}
          <button
            onClick={e => { e.stopPropagation(); onDelete(caso.id); }}
            style={{ background: "none", border: "none", color: darkMode ? "#334155" : "#cbd5e1", fontSize: 16, cursor: "pointer", padding: "2px 4px", lineHeight: 1 }}
            title="Eliminar caso"
          >×</button>
        </div>
      </div>
      {ultimaAccion && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#6366f1", flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fmtDate(ultimaAccion.fecha)} — {ultimaAccion.texto}
          </div>
        </div>
      )}
    </div>
  );
}

const ESTADO_ORDEN = Object.fromEntries(ESTADOS_CASO.map((e, i) => [e.key, i]));

function sortCasos(list, orden) {
  const sorted = [...list];
  switch (orden) {
    case "ultimo_mov": {
      sorted.sort((a, b) => {
        const lastA = (a.notas_log || []).reduce((m, n) => Math.max(m, n.ts || 0), a.caso_id || 0);
        const lastB = (b.notas_log || []).reduce((m, n) => Math.max(m, n.ts || 0), b.caso_id || 0);
        return lastB - lastA;
      });
      break;
    }
    case "alfabetico":
      sorted.sort((a, b) => (a.asegurado || "").localeCompare(b.asegurado || ""));
      break;
    case "estado":
      sorted.sort((a, b) => (ESTADO_ORDEN[a.estado] ?? 99) - (ESTADO_ORDEN[b.estado] ?? 99));
      break;
    default:
      break;
  }
  return sorted;
}

function ClienteCard({ pas, casos, onAddCaso, onDeleteCaso, onDetalleCaso, expanded, onToggle, darkMode, filtroEstado, ordenCasos }) {
  const filtered = sortCasos(filtroEstado === "todos" ? casos : casos.filter(c => c.estado === filtroEstado), ordenCasos);
  const totalMonto = casos.reduce((s, c) => s + (Number(c.monto_acordado) || Number(c.monto_ofrecimiento) || 0), 0);
  const cobrados = casos.filter(c => c.estado === "cobrado").length;

  return (
    <div style={{ background: darkMode ? "#1e293b" : "#f8fafc", border: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "14px 16px" }}
        onClick={onToggle}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 700, color: darkMode ? "#f1f5f9" : "#0f172a", fontSize: 15 }}>{pas.nombre}</div>
            {pas.manual && <span style={{ fontSize: 9, background: "#6366f122", color: "#818cf8", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>manual</span>}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8" }}>
            <span>{filtered.length} caso{filtered.length !== 1 ? "s" : ""}</span>
            {cobrados > 0 && <span style={{ color: "#22c55e" }}>✓ {cobrados} cobrado{cobrados !== 1 ? "s" : ""}</span>}
            {totalMonto > 0 && <span style={{ color: "#6366f1" }}>{fmtMoney(totalMonto)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={e => { e.stopPropagation(); onAddCaso(); }}
            style={{ background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", padding: "7px 14px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}
          >+ Caso</button>
          <span style={{ fontSize: 16, color: darkMode ? "#475569" : "#94a3b8" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}`, paddingTop: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ color: darkMode ? "#475569" : "#94a3b8", fontSize: 12, textAlign: "center", padding: 20 }}>Sin casos{filtroEstado !== "todos" ? " con este filtro" : ""}</div>
          ) : (
            filtered.map(c => (
              <CasoCard key={c.id} caso={c} onDetalle={onDetalleCaso} onDelete={onDeleteCaso} darkMode={darkMode} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function NuevoCasoModal({ pasNombre, darkMode, onClose, onSave, companias, onAgregarCompania }) {
  const [asegurado, setAsegurado] = useState("");
  const [compania, setCompania] = useState("");
  const [fechaSiniestro, setFechaSiniestro] = useState("");
  const [fechaDerivacion, setFechaDerivacion] = useState(new Date().toISOString().slice(0, 10));
  const [estado, setEstado] = useState("doc_pendiente");

  const iStyle = {
    background: darkMode ? "#1e293b" : "#f8fafc",
    border: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}`,
    borderRadius: 10,
    color: darkMode ? "#f1f5f9" : "#0f172a",
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  const handleSave = () => {
    if (!asegurado.trim()) return;
    onSave({
      id: generateUUID(),
      caso_id: Date.now(),
      asegurado: asegurado.trim(),
      compania: compania.trim() || null,
      compania_aseguradora: compania.trim() || null,
      fecha_siniestro: fechaSiniestro || null,
      fecha_derivacion: fechaDerivacion || null,
      estado,
      estado_honorarios: "NO_FACTURADO",
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: darkMode ? "#0f172a" : "#fff", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 18, width: "100%", maxWidth: 520, padding: "32px 28px", boxShadow: "0 20px 60px #0004" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, color: darkMode ? "#f1f5f9" : "#1e293b" }}>Nuevo caso</div>
        <div style={{ fontSize: 13, color: darkMode ? "#64748b" : "#94a3b8", marginBottom: 24 }}>{pasNombre}</div>

        <label style={{ display: "block", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Asegurado *</div>
          <input type="text" value={asegurado} onChange={e => setAsegurado(e.target.value)} placeholder="Nombre del asegurado" style={iStyle} autoFocus />
        </label>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Compañía aseguradora</div>
          <CompaniaSelector value={compania} onChange={setCompania} companias={companias || []} onAgregar={onAgregarCompania || (() => {})} darkMode={darkMode} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <label>
            <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Fecha siniestro</div>
            <input type="date" value={fechaSiniestro} onChange={e => setFechaSiniestro(e.target.value)} style={iStyle} />
          </label>
          <label>
            <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Fecha derivación</div>
            <input type="date" value={fechaDerivacion} onChange={e => setFechaDerivacion(e.target.value)} style={iStyle} />
          </label>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Estado del caso</div>
          <EstadoSelector value={estado} onChange={setEstado} darkMode={darkMode} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: darkMode ? "#1e293b" : "#f1f5f9", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 10, color: darkMode ? "#94a3b8" : "#64748b", padding: "11px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={handleSave} disabled={!asegurado.trim()} style={{ flex: 2, background: asegurado.trim() ? "#6366f1" : darkMode ? "#334155" : "#e2e8f0", border: "none", borderRadius: 10, color: asegurado.trim() ? "white" : darkMode ? "#64748b" : "#94a3b8", padding: "11px", cursor: asegurado.trim() ? "pointer" : "default", fontSize: 14, fontWeight: 700 }}>Crear caso</button>
        </div>
      </div>
    </div>
  );
}

function NuevoPASModal({ pasEdit, darkMode, onClose, onSave }) {
  const [nombre, setNombre] = useState(pasEdit?.nombre || "");
  const [mail, setMail] = useState(pasEdit?.mail || "");
  const iStyle = {
    background: darkMode ? "#1e293b" : "#f8fafc",
    border: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}`,
    borderRadius: 10,
    color: darkMode ? "#f1f5f9" : "#0f172a",
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: darkMode ? "#0f172a" : "#fff", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 18, width: "100%", maxWidth: 420, padding: "32px 28px", boxShadow: "0 20px 60px #0004" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 24, color: darkMode ? "#f1f5f9" : "#1e293b" }}>
          {pasEdit ? "Editar PAS" : "Nuevo PAS manual"}
        </div>
        <label style={{ display: "block", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Nombre</div>
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} style={iStyle} />
        </label>
        <label style={{ display: "block", marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Mail</div>
          <input type="email" value={mail} onChange={e => setMail(e.target.value)} style={iStyle} />
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: darkMode ? "#1e293b" : "#f1f5f9", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 10, color: darkMode ? "#94a3b8" : "#64748b", padding: "11px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={() => onSave({ id: pasEdit?.id || (100000 + Math.floor(Math.random() * 1900000)), nombre, mail, manual: true })} style={{ flex: 1, background: "#6366f1", border: "none", borderRadius: 10, color: "white", padding: "11px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

export default function TabClientes({ pas, casos, derivadores, onSaveCasos, darkMode, pasManuales, onAddPasManual, onEditPasManual, onDeletePasManual }) {
  const { companias, agregarCompania } = useCompanias(casos);
  const [modalPas, setModalPas] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [casoDetalle, setCasoDetalle] = useState(null);
  const [pasIdDetalle, setPasIdDetalle] = useState(null);
  const [modalNuevoPAS, setModalNuevoPAS] = useState(false);
  const [pasManualEdit, setPasManualEdit] = useState(null);
  const [ordenCasos, setOrdenCasos] = useState("creacion");

  const clientes = useMemo(() => {
    const derivs = pas.filter(p => derivadores[String(p.id)]);
    const manualesIds = new Set(pasManuales.map(p => String(p.id)));
    const soloDerivs = derivs.filter(p => !manualesIds.has(String(p.id)));
    return [...soloDerivs, ...pasManuales];
  }, [pas, derivadores, pasManuales]);

  const filtered = useMemo(() => {
    let list = clientes;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      list = list.filter(p => p.nombre.toLowerCase().includes(q) || (p.mail || "").toLowerCase().includes(q));
    }
    if (filtroEstado !== "todos") {
      list = list.filter(p => (casos[String(p.id)] || []).some(c => c.estado === filtroEstado));
    }
    return [...list].sort((a, b) => (casos[String(b.id)] || []).length - (casos[String(a.id)] || []).length);
  }, [clientes, busqueda, filtroEstado, casos]);

  const allCasos = useMemo(() => Object.values(casos).flat(), [casos]);

  const handleSave = (pasId, casoData, pasNombre) => {
    const cur = casos[pasId] || [];
    const idx = cur.findIndex(c => c.id === casoData.id);
    onSaveCasos(pasId, idx >= 0 ? cur.map(c => c.id === casoData.id ? casoData : c) : [...cur, casoData], pasNombre);
    setModalPas(null);
  };

  const exportarExcel = () => {
    const rows = [];
    clientes.forEach(p => {
      const casosPas = casos[p.id] || [];
      if (casosPas.length === 0) {
        rows.push({ PAS: p.nombre, Mail: p.mail, Asegurado: "", Estado: "", Compañía: "", "Fecha derivación": "", "Monto acordado": "", "Cobré yo": "", "Comisión PAS": "", Nota: "" });
      } else {
        casosPas.forEach(c => {
          rows.push({ PAS: p.nombre, Mail: p.mail, Asegurado: c.asegurado, Estado: c.estado, Compañía: c.compania || "", "Fecha derivación": c.fecha_derivacion || "", "Monto acordado": c.monto_acordado || c.monto_ofrecimiento || "", "Cobré yo": c.monto_cobro_yo || "", "Comisión PAS": c.monto_comision_pas || "", Nota: c.nota || "" });
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Casos");
    XLSX.writeFile(wb, `pastracker_casos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const iStyle = {
    background: darkMode ? "#0f172a" : "#f8fafc",
    border: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`,
    borderRadius: 10,
    color: darkMode ? "#f1f5f9" : "#0f172a",
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div>
      <div style={{ background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ESTADOS_CASO.map(e => {
            const cnt = allCasos.filter(c => c.estado === e.key).length;
            const active = filtroEstado === e.key;
            return (
              <button key={e.key} onClick={() => setFiltroEstado(active ? "todos" : e.key)} style={{ flex: 1, minWidth: 58, background: active ? e.color + "28" : cnt > 0 ? e.color + "10" : darkMode ? "#0a0f1e" : "#fff", border: `1px solid ${active ? e.color : cnt > 0 ? e.color + "33" : darkMode ? "#1e293b" : "#e2e8f0"}`, borderRadius: 8, padding: "8px 4px", textAlign: "center", cursor: "pointer", transition: "all .15s" }}>
                <div style={{ fontSize: 14 }}>{e.emoji}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: cnt > 0 ? e.color : "#334155" }}>{cnt}</div>
                <div style={{ fontSize: 8, color: cnt > 0 ? e.color + "99" : "#334155", marginTop: 1, lineHeight: 1.2 }}>{e.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍  Buscar PAS..." style={{ ...iStyle, flex: 1, minWidth: 180 }} />
        <select value={ordenCasos} onChange={e => setOrdenCasos(e.target.value)} style={{ ...iStyle, flex: "none", width: "auto", minWidth: 130, cursor: "pointer" }}>
          <option value="creacion">Creación</option>
          <option value="ultimo_mov">Último mov.</option>
          <option value="alfabetico">A → Z</option>
          <option value="estado">Estado</option>
        </select>
        <button onClick={() => { setPasManualEdit(null); setModalNuevoPAS(true); }} style={{ background: "#6366f122", border: "1px solid #6366f144", borderRadius: 8, color: "#818cf8", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>+ PAS manual</button>
        <button onClick={exportarExcel} style={{ background: "#22c55e22", border: "1px solid #22c55e44", borderRadius: 8, color: "#22c55e", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>⬇ Excel</button>
      </div>

      {filtered.length === 0 && clientes.length === 0 && (
        <div style={{ textAlign: "center", padding: "44px 16px", background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 12, border: `1px dashed ${darkMode ? "#1e293b" : "#e2e8f0"}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>☑️</div>
          <div style={{ fontSize: 15, color: "#475569", fontWeight: 600 }}>Todavía no tenés clientes PAS</div>
          <div style={{ fontSize: 13, color: "#334155", marginTop: 8, lineHeight: 1.6 }}>
            Podés marcar un PAS del Excel como derivador en <strong style={{ color: "#818cf8" }}>Contactos</strong>,<br />
            o usar el botón <strong style={{ color: "#818cf8" }}>+ PAS manual</strong> de arriba.
          </div>
        </div>
      )}

      {filtered.length === 0 && clientes.length > 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: darkMode ? "#475569" : "#94a3b8" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 14 }}>Sin resultados{filtroEstado !== "todos" ? " para ese estado" : ""}</div>
          {filtroEstado !== "todos" && <button onClick={() => setFiltroEstado("todos")} style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 13, marginTop: 8 }}>Ver todos</button>}
        </div>
      )}

      {filtered.map(p => (
        <ClienteCard key={p.id} pas={p} casos={casos[String(p.id)] || []}
          onAddCaso={() => setModalPas(p)}
          onDeleteCaso={cid => { deleteCaso(cid); deleteCasoFromAgenda(cid); onSaveCasos(p.id, (casos[String(p.id)] || []).filter(c => c.id !== cid), p.nombre); }}
          onDetalleCaso={c => { setCasoDetalle(c); setPasIdDetalle(p.id); }}
          expanded={expandedId === p.id}
          onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
          darkMode={darkMode}
          filtroEstado={filtroEstado}
          ordenCasos={ordenCasos} />
      ))}

      {modalPas && (
        <NuevoCasoModal pasNombre={modalPas.nombre} darkMode={darkMode}
          onClose={() => setModalPas(null)}
          onSave={data => handleSave(modalPas.id, data, modalPas.nombre)}
          companias={companias} onAgregarCompania={agregarCompania} />
      )}

      {modalNuevoPAS && (
        <NuevoPASModal
          pasEdit={pasManualEdit}
          darkMode={darkMode}
          onClose={() => { setModalNuevoPAS(false); setPasManualEdit(null); }}
          onSave={data => { onAddPasManual(data); setModalNuevoPAS(false); setPasManualEdit(null); }} />
      )}

      {casoDetalle && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, overflowY: "auto", background: darkMode ? "#111827" : "#f8fafc" }}>
          <CasoDetalle
            caso={casoDetalle}
            pasId={pasIdDetalle}
            darkMode={darkMode}
            companias={companias}
            onAgregarCompania={agregarCompania}
            onUpdate={updated => {
              const cur = casos[String(pasIdDetalle)] || [];
              const pasNom = [...pas, ...pasManuales].find(p => p.id === pasIdDetalle)?.nombre || "";
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
