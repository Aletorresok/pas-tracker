import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { fmtMoney, diasDesde } from "../utils/formatters.js";
import { ESTADOS_CASO } from "../constants.js";
import CasoDetalle from "../CasoUnificado.jsx";
import { deleteCasoFromAgenda } from "../utils/sync.js";

const IS = {
  background: "#1e293b",
  border: "1px solid #2d3f55",
  borderRadius: 8,
  color: "#f1f5f9",
  padding: "9px 12px",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const IS_LIGHT = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  color: "#0f172a",
  padding: "9px 12px",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

function StatCard({ label, value, color, sub, dark }) {
  return (
    <div style={{ background: dark ? "#0f172a" : "#f8fafc", border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: dark ? "#475569" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: dark ? "#64748b" : "#94a3b8", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function ClienteCard({ pas, casos, onAddCaso, onEditCaso, onDeleteCaso, onDetalleCaso, expanded, onToggle, darkMode, filtroEstado, onEditPasManual, onDeletePasManual }) {
  const filtered = filtroEstado === "todos" ? casos : casos.filter(c => c.estado === filtroEstado);
  return (
    <div style={{ background: darkMode ? "#1e293b" : "#f8fafc", border: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={onToggle}>
        <div>
          <div style={{ fontWeight: 700, color: darkMode ? "#f1f5f9" : "#0f172a" }}>{pas.nombre}</div>
          <div style={{ fontSize: 12, color: darkMode ? "#64748b" : "#94a3b8", marginTop: 4 }}>{filtered.length} caso{filtered.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onAddCaso(); }} style={{ background: "#6366f1", border: "none", borderRadius: 6, color: "#fff", padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
          + Caso
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${darkMode ? "#2d3f55" : "#e2e8f0"}` }}>
          {filtered.length === 0 ? (
            <div style={{ color: darkMode ? "#64748b" : "#94a3b8", fontSize: 12, textAlign: "center", padding: 16 }}>Sin casos registrados</div>
          ) : (
            filtered.map(c => (
              <div key={c.id} style={{ background: darkMode ? "#0f172a" : "#fff", border: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`, borderRadius: 8, padding: 10, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, color: darkMode ? "#f1f5f9" : "#0f172a", fontSize: 13 }}>{c.asegurado}</div>
                  <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", marginTop: 2 }}>{c.estado} • {fmtMoney(c.monto_cobro_yo)}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onDetalleCaso(c)} style={{ background: "#6366f122", border: "1px solid #6366f144", borderRadius: 4, color: "#818cf8", padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Ver</button>
                  <button onClick={() => onEditCaso(c)} style={{ background: "#eab30822", border: "1px solid #eab30844", borderRadius: 4, color: "#eab308", padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Editar</button>
                  <button onClick={() => onDeleteCaso(c.id)} style={{ background: "#ef444422", border: "1px solid #ef444444", borderRadius: 4, color: "#ef4444", padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>×</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CasoModal({ pasNombre, casoEdit, darkMode, onClose, onSave }) {
  const [asegurado, setAsegurado] = useState(casoEdit?.asegurado || "");
  const [estado, setEstado] = useState(casoEdit?.estado || "derivado");
  const [monto, setMonto] = useState(casoEdit?.monto_cobro_yo || "");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: darkMode ? "#0f172a" : "#fff", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 16, width: "100%", maxWidth: 420, padding: 28 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: darkMode ? "#f1f5f9" : "#1e293b" }}>
          {casoEdit ? "Editar caso" : "Nuevo caso"} - {pasNombre}
        </div>
        <label style={{ display: "block", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>Asegurado</div>
          <input type="text" value={asegurado} onChange={e => setAsegurado(e.target.value)} style={{ ...IS, background: darkMode ? "#1e293b" : "#f8fafc" }} />
        </label>
        <label style={{ display: "block", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>Estado</div>
          <select value={estado} onChange={e => setEstado(e.target.value)} style={{ ...IS, background: darkMode ? "#1e293b" : "#f8fafc" }}>
            <option value="derivado">Derivado</option>
            <option value="esperando_pago">Esperando pago</option>
            <option value="cobrado">Cobrado</option>
          </select>
        </label>
        <label style={{ display: "block", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>Monto cobrado</div>
          <input type="number" value={monto} onChange={e => setMonto(e.target.value)} style={{ ...IS, background: darkMode ? "#1e293b" : "#f8fafc" }} />
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: darkMode ? "#1e293b" : "#f1f5f9", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 10, color: darkMode ? "#94a3b8" : "#64748b", padding: "10px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={() => onSave({ id: casoEdit?.id || `caso-${Date.now()}`, asegurado, estado, monto_cobro_yo: Number(monto) })} style={{ flex: 1, background: "#6366f1", border: "none", borderRadius: 10, color: "white", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function NuevoPASModal({ pasEdit, darkMode, onClose, onSave }) {
  const [nombre, setNombre] = useState(pasEdit?.nombre || "");
  const [mail, setMail] = useState(pasEdit?.mail || "");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: darkMode ? "#0f172a" : "#fff", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 16, width: "100%", maxWidth: 420, padding: 28 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: darkMode ? "#f1f5f9" : "#1e293b" }}>
          {pasEdit ? "Editar PAS" : "Nuevo PAS manual"}
        </div>
        <label style={{ display: "block", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>Nombre</div>
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} style={{ ...IS, background: darkMode ? "#1e293b" : "#f8fafc" }} />
        </label>
        <label style={{ display: "block", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: darkMode ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>Mail</div>
          <input type="email" value={mail} onChange={e => setMail(e.target.value)} style={{ ...IS, background: darkMode ? "#1e293b" : "#f8fafc" }} />
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: darkMode ? "#1e293b" : "#f1f5f9", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 10, color: darkMode ? "#94a3b8" : "#64748b", padding: "10px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={() => onSave({ id: pasEdit?.id || Date.now(), nombre, mail, manual: true })} style={{ flex: 1, background: "#6366f1", border: "none", borderRadius: 10, color: "white", padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

export default function TabClientes({ pas, casos, derivadores, onSaveCasos, darkMode, pasManuales, onAddPasManual, onEditPasManual, onDeletePasManual }) {
  const [modalPas, setModalPas] = useState(null);
  const [casoEdit, setCasoEdit] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [casoDetalle, setCasoDetalle] = useState(null);
  const [pasIdDetalle, setPasIdDetalle] = useState(null);
  const [modalNuevoPAS, setModalNuevoPAS] = useState(false);
  const [pasManualEdit, setPasManualEdit] = useState(null);

  const clientes = useMemo(() => {
    const derivs = pas.filter(p => derivadores[String(p.id)]);
    const manualesIds = new Set(pasManuales.map(p => String(p.id)));
    const soloDerivs = derivs.filter(p => !manualesIds.has(String(p.id)));
    return [...soloDerivs, ...pasManuales];
  }, [pas, derivadores, pasManuales]);

  // DEBUG - borrar después de verificar
  console.log("derivadores keys:", Object.keys(derivadores).slice(0, 5));
  console.log("pas ids sample:", pas.slice(0, 3).map(p => ({ id: p.id, tipo: typeof p.id })));
  console.log("clientes:", clientes.map(p => p.nombre));

  const filtered = useMemo(() => {
    if (!busqueda.trim()) return clientes;
    const q = busqueda.toLowerCase();
    return clientes.filter(p => p.nombre.toLowerCase().includes(q) || (p.mail || "").toLowerCase().includes(q));
  }, [clientes, busqueda]);

  const allCasos = useMemo(() => Object.values(casos).flat(), [casos]);
  const totalCobradoYo = allCasos.reduce((s, c) => s + (Number(c.monto_cobro_yo) || 0), 0);
  const totalComisionesPAS = allCasos.reduce((s, c) => s + (Number(c.monto_comision_pas) || 0), 0);
  const totalPendiente = allCasos.filter(c => c.estado === "esperando_pago").reduce((s, c) => s + (Number(c.monto_cobro_yo) || 0), 0);
  const enGestion = allCasos.filter(c => c.estado !== "cobrado").length;
  const cobradosCasos = allCasos.filter(c => c.estado === "cobrado" && c.fecha_derivacion);
  const promCierre = cobradosCasos.length ? Math.round(cobradosCasos.reduce((s, c) => s + diasDesde(c.fecha_derivacion), 0) / cobradosCasos.length) : null;

  const handleSave = (pasId, casoData, pasNombre) => {
    const cur = casos[pasId] || [];
    const idx = cur.findIndex(c => c.id === casoData.id);
    onSaveCasos(pasId, idx >= 0 ? cur.map(c => c.id === casoData.id ? casoData : c) : [...cur, casoData], pasNombre);
    setModalPas(null);
    setCasoEdit(null);
  };

  const exportarExcel = () => {
    const rows = [];
    clientes.forEach(p => {
      const casosPas = casos[p.id] || [];
      if (casosPas.length === 0) {
        rows.push({ PAS: p.nombre, Mail: p.mail, Asegurado: "", Estado: "", "Fecha derivación": "", "Monto ofrecimiento": "", "Cobré yo": "", "Cobró asegurado": "", "Comisión PAS": "", Nota: "" });
      } else {
        casosPas.forEach(c => {
          rows.push({ PAS: p.nombre, Mail: p.mail, Asegurado: c.asegurado, Estado: c.estado, "Fecha derivación": c.fecha_derivacion || "", "Monto ofrecimiento": c.monto_ofrecimiento || "", "Cobré yo": c.monto_cobro_yo || "", "Cobró asegurado": c.monto_cobro_asegurado || "", "Comisión PAS": c.monto_comision_pas || "", Nota: c.nota || "" });
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Casos");
    XLSX.writeFile(wb, `pastracker_casos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const iStyle = darkMode ? { ...IS, background: "#0f172a", border: "1px solid #1e293b" } : { ...IS_LIGHT };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <StatCard label="Cobré yo (total)" value={fmtMoney(totalCobradoYo)} color="#6366f1" dark={darkMode} />
        <StatCard label="Esperando cobro" value={fmtMoney(totalPendiente)} color="#06b6d4" dark={darkMode} />
        <StatCard label="Comisiones PAS" value={fmtMoney(totalComisionesPAS)} color="#eab308" dark={darkMode} />
        <StatCard label="Casos activos" value={enGestion} color="#f97316" sub={promCierre ? `Prom. cierre: ${promCierre}d` : "Sin cobros aún"} dark={darkMode} />
      </div>

      <div style={{ background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${darkMode ? "#1e293b" : "#e2e8f0"}`, borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Pipeline total</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ESTADOS_CASO.map(e => {
            const cnt = allCasos.filter(c => c.estado === e.key).length;
            return (
              <div key={e.key} style={{ flex: 1, minWidth: 58, background: cnt > 0 ? e.color + "18" : darkMode ? "#0a0f1e" : "#fff", border: `1px solid ${cnt > 0 ? e.color + "44" : darkMode ? "#1e293b" : "#e2e8f0"}`, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 16 }}>{e.emoji}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: cnt > 0 ? e.color : "#334155" }}>{cnt}</div>
                <div style={{ fontSize: 9, color: cnt > 0 ? e.color + "99" : "#334155", marginTop: 1, lineHeight: 1.2 }}>{e.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍  Buscar entre tus clientes PAS..." style={{ ...iStyle, flex: 1, minWidth: 180 }} />
        <button onClick={() => { setPasManualEdit(null); setModalNuevoPAS(true); }} style={{ background: "#6366f122", border: "1px solid #6366f144", borderRadius: 8, color: "#818cf8", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>+ PAS manual</button>
        <button onClick={exportarExcel} style={{ background: "#22c55e22", border: "1px solid #22c55e44", borderRadius: 8, color: "#22c55e", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>⬇ Exportar Excel</button>
      </div>

      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
        {[{ key: "todos", label: "Todos", color: "#64748b" }, ...ESTADOS_CASO].map(e => (
          <button key={e.key} onClick={() => setFiltroEstado(e.key)} style={{ flexShrink: 0, padding: "5px 11px", borderRadius: 20, border: "1px solid", borderColor: filtroEstado === e.key ? e.color : darkMode ? "#1e293b" : "#e2e8f0", background: filtroEstado === e.key ? e.color + "22" : darkMode ? "#0a0f1e" : "#f8fafc", color: filtroEstado === e.key ? e.color : "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            {e.emoji ? `${e.emoji} ` : ""}{e.label}
          </button>
        ))}
      </div>

      {clientes.length === 0 && (
        <div style={{ textAlign: "center", padding: "44px 16px", background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: 12, border: `1px dashed ${darkMode ? "#1e293b" : "#e2e8f0"}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>☑️</div>
          <div style={{ fontSize: 15, color: "#475569", fontWeight: 600 }}>Todavía no tenés clientes PAS</div>
          <div style={{ fontSize: 13, color: "#334155", marginTop: 8, lineHeight: 1.6 }}>
            Podés marcar un PAS del Excel como derivador en <strong style={{ color: "#818cf8" }}>Contactos</strong>,<br />
            o usar el botón <strong style={{ color: "#818cf8" }}>+ PAS manual</strong> de arriba para agregar uno directamente.
          </div>
        </div>
      )}

      {filtered.map(p => (
        <ClienteCard key={p.id} pas={p} casos={casos[String(p.id)] || []}
          onAddCaso={() => { setModalPas(p); setCasoEdit(null); }}
          onEditCaso={c => { setModalPas(p); setCasoEdit(c); }}
          onDeleteCaso={cid => { deleteCasoFromAgenda(cid); onSaveCasos(p.id, (casos[String(p.id)] || []).filter(c => c.id !== cid), p.nombre); }}
          onDetalleCaso={c => { setCasoDetalle(c); setPasIdDetalle(p.id); }}
          expanded={expandedId === p.id}
          onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
          darkMode={darkMode}
          filtroEstado={filtroEstado}
          onEditPasManual={p.manual ? pManual => { setPasManualEdit(pManual); setModalNuevoPAS(true); } : undefined}
          onDeletePasManual={p.manual ? id => { onDeletePasManual(id); } : undefined} />
      ))}

      {modalPas && (
        <CasoModal pasNombre={modalPas.nombre} casoEdit={casoEdit} darkMode={darkMode}
          onClose={() => { setModalPas(null); setCasoEdit(null); }}
          onSave={data => handleSave(modalPas.id, data, modalPas.nombre)} />
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