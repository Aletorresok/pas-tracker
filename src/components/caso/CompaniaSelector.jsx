import { useState, useRef, useEffect, useMemo } from "react";

const STORAGE_KEY = "pas_tracker_companias";

function loadCompaniasExtra() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveCompaniasExtra(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function useCompanias(casos) {
  const [extra, setExtra] = useState(loadCompaniasExtra);

  const todas = useMemo(() => {
    const fromCasos = Object.values(casos || {}).flat().map(c => c.compania_aseguradora?.trim()).filter(Boolean);
    const merged = [...new Set([...fromCasos, ...extra])].sort((a, b) => a.localeCompare(b, "es"));
    return merged;
  }, [casos, extra]);

  const agregar = (nombre) => {
    const trimmed = nombre.trim();
    if (!trimmed || todas.includes(trimmed)) return;
    const updated = [...extra, trimmed];
    setExtra(updated);
    saveCompaniasExtra(updated);
  };

  return { companias: todas, agregarCompania: agregar };
}

export default function CompaniaSelector({ value, onChange, companias, onAgregar, darkMode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [nueva, setNueva] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return companias;
    const q = query.toLowerCase();
    return companias.filter(c => c.toLowerCase().includes(q));
  }, [companias, query]);

  const bg = "var(--card2)";
  const border = "var(--border)";
  const text = "var(--text)";
  const muted = "var(--muted)";
  const dropBg = "var(--card)";

  const handleAgregar = () => {
    if (!nueva.trim()) return;
    onAgregar(nueva.trim());
    onChange(nueva.trim());
    setNueva("");
    setAdding(false);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 10,
          color: value ? text : muted,
          padding: "10px 14px",
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || "Seleccionar compañía..."}
        </span>
        <span style={{ fontSize: 11, color: muted, flexShrink: 0, marginLeft: 8 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          background: dropBg, border: `1px solid ${border}`, borderRadius: 10,
          marginTop: 4, boxShadow: "0 8px 24px #0003", maxHeight: 260, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${border}` }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar compañía..."
              style={{ background: "transparent", border: "none", outline: "none", color: text, fontSize: 13, width: "100%", fontFamily: "inherit" }}
            />
          </div>

          <div style={{ overflowY: "auto", flex: 1, maxHeight: 180 }}>
            {value && (
              <div
                onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
                style={{ padding: "8px 14px", fontSize: 12, color: "var(--bad)", cursor: "pointer", borderBottom: `1px solid ${border}` }}
              >
                ✕ Quitar compañía
              </div>
            )}
            {filtered.map(c => (
              <div
                key={c}
                onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                style={{
                  padding: "8px 14px", fontSize: 13, cursor: "pointer",
                  color: c === value ? "var(--accent)" : text,
                  fontWeight: c === value ? 700 : 400,
                  background: c === value ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "transparent",
                }}
                onMouseEnter={e => { if (c !== value) e.currentTarget.style.background = "var(--card2)"; }}
                onMouseLeave={e => { if (c !== value) e.currentTarget.style.background = "transparent"; }}
              >
                {c}
              </div>
            ))}
            {filtered.length === 0 && !adding && (
              <div style={{ padding: "12px 14px", fontSize: 12, color: muted, textAlign: "center" }}>Sin resultados</div>
            )}
          </div>

          <div style={{ borderTop: `1px solid ${border}`, padding: "8px 10px" }}>
            {!adding ? (
              <button
                onClick={() => { setAdding(true); setNueva(query); }}
                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 0 }}
              >
                + Agregar nueva compañía
              </button>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={nueva}
                  onChange={e => setNueva(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAgregar()}
                  placeholder="Nombre de la compañía"
                  autoFocus
                  style={{ flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: 6, color: text, padding: "6px 10px", fontSize: 12, outline: "none", fontFamily: "inherit" }}
                />
                <button onClick={handleAgregar} style={{ background: "var(--accent)", border: "none", borderRadius: 6, color: "var(--on-accent)", padding: "6px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Agregar</button>
                <button onClick={() => setAdding(false)} style={{ background: "none", border: "none", color: muted, cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
