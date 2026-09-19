import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { ESTADOS_CASO } from "../constants.js";
import { useCompanias } from "./caso/CompaniaSelector.jsx";
import CasoDetalle from "../CasoUnificado.jsx";
import { deleteCaso } from "../utils/storage.js";

// Importamos los nuevos componentes modulares
import ClienteCard from "./clientes/ClienteCards.jsx";
import { NuevoCasoModal, NuevoPASModal } from "./clientes/ModalesCliente.jsx";

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
          onDeleteCaso={cid => { const caso = (casos[String(p.id)] || []).find(c => c.id === cid); if (!window.confirm(`¿Eliminar definitivamente el caso de ${caso?.asegurado || "este asegurado"}? Esta acción no se puede deshacer.`)) return; deleteCaso(cid); onSaveCasos(p.id, (casos[String(p.id)] || []).filter(c => c.id !== cid), p.nombre); }}
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
            pasNombre={[...pas, ...pasManuales].find(p => p.id === pasIdDetalle)?.nombre || ""}
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