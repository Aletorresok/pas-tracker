import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../supabase.js";
import { normalizarContacto } from "../hooks/usePASData.js";
import EstadoPill from "./ui/EstadoPill.jsx";
import Icono from "./ui/Icono.jsx";

// Minúsculas y sin tildes, para comparar
const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const sinEspacios = s => norm(s).replace(/[\s.-]/g, "");

const MAX_CASOS = 8;
const MAX_PAS = 6;

// Buscador único (Ctrl + K): casos por asegurado, patente, siniestro, DNI, compañía o PAS; PAS por nombre, mail
// o teléfono (los cargados en la app y, desde 3 letras, también los ~50 mil contactos de la base).
export default function BuscadorGlobal({ abierto, onCerrar, allCasos, pas, pasManuales, derivadores, onAbrirCaso, onAbrirCliente, onContactar }) {
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState(0);
  const [remotos, setRemotos] = useState([]);
  const inputRef = useRef(null);
  const listaRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    setQ(""); setActivo(0); setRemotos([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [abierto]);

  const texto = norm(q.trim());
  const compacto = sinEspacios(q);

  const casos = useMemo(() => {
    if (!texto) return [];
    return allCasos.filter(c =>
      norm(c.asegurado).includes(texto) ||
      (compacto.length >= 3 && (sinEspacios(c.patente).includes(compacto) || sinEspacios(c.dni_asegurado).includes(compacto) || sinEspacios(c.nro_siniestro).includes(compacto))) ||
      norm(c.compania_aseguradora).includes(texto) ||
      norm(c._pasNombre).includes(texto)
    ).sort((a, b) => Number(!["cobrado", "desistido"].includes(b.estado)) - Number(!["cobrado", "desistido"].includes(a.estado))).slice(0, MAX_CASOS);
  }, [allCasos, texto, compacto]);

  const locales = useMemo(() => {
    if (!texto) return [];
    const esCliente = p => p.manual || derivadores[String(p.id)];
    const vistos = new Set();
    return [...pasManuales.map(p => ({ ...p, manual: true })), ...pas]
      .filter(p => {
        if (vistos.has(String(p.id))) return false;
        vistos.add(String(p.id));
        return norm(p.nombre).includes(texto) || norm(p.mail).includes(texto) || (compacto.length >= 4 && (p.telefonos || []).some(t => sinEspacios(t).includes(compacto)));
      })
      .map(p => ({ ...p, _cliente: !!esCliente(p) }))
      .sort((a, b) => Number(b._cliente) - Number(a._cliente))
      .slice(0, MAX_PAS);
  }, [pas, pasManuales, derivadores, texto, compacto]);

  // Contactos de la base que no están cargados en la app
  useEffect(() => {
    const limpio = q.trim().replace(/[,()*%\\]/g, " ").trim();
    if (!abierto || limpio.length < 3) { setRemotos([]); return; }
    let cancelado = false;
    const t = setTimeout(async () => {
      const { data, error } = await supabase.from("pas_contactos").select("*")
        .or(`nombre.ilike.*${limpio}*,mail.ilike.*${limpio}*,telefonos.ilike.*${limpio}*`).limit(MAX_PAS + 4);
      if (cancelado || error) return;
      setRemotos((data || []).map(normalizarContacto));
    }, 300);
    return () => { cancelado = true; clearTimeout(t); };
  }, [q, abierto]);

  const cargados = new Set([...pas, ...pasManuales].map(p => String(p.id)));
  const otros = remotos.filter(p => !cargados.has(String(p.id))).slice(0, Math.max(0, MAX_PAS - locales.length));

  const items = [
    ...casos.map(c => ({ tipo: "caso", key: `c-${c.id}`, c })),
    ...locales.map(p => ({ tipo: p._cliente ? "cliente" : "contacto", key: `p-${p.id}`, p })),
    ...otros.map(p => ({ tipo: "contacto", key: `r-${p.id}`, p, remoto: true })),
  ];

  useEffect(() => { setActivo(0); }, [q]);
  useEffect(() => { listaRef.current?.querySelector(`[data-i="${activo}"]`)?.scrollIntoView({ block: "nearest" }); }, [activo]);

  const elegir = (it) => {
    if (!it) return;
    onCerrar();
    if (it.tipo === "caso") onAbrirCaso(it.c);
    else if (it.tipo === "cliente") onAbrirCliente(it.p);
    else onContactar(it.p, it.remoto);
  };

  const teclas = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onCerrar(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActivo(a => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); elegir(items[activo]); }
  };

  if (!abierto) return null;

  const grupo = (titulo) => <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--muted)", padding: "10px 14px 4px" }}>{titulo}</div>;
  const fila = (it, i, contenido) => (
    <button key={it.key} type="button" data-i={i} role="option" aria-selected={i === activo} onMouseMove={() => setActivo(i)} onClick={() => elegir(it)}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: i === activo ? "color-mix(in srgb, var(--accent) 12%, var(--card))" : "none", border: "none", textAlign: "left", cursor: "pointer", color: "var(--text)", font: "inherit" }}>
      {contenido}
    </button>
  );

  let i = -1;
  return (
    <div className="buscador-fondo" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "color-mix(in srgb, #000 40%, transparent)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "10vh 16px 16px" }}>
      <div className="buscador-panel" role="dialog" aria-modal="true" aria-label="Buscar"
        style={{ width: "100%", maxWidth: 620, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "var(--shadow)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "75vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ color: "var(--muted)", display: "flex" }}><Icono nombre="buscar" size={18} /></span>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={teclas} placeholder="Buscar caso, patente, DNI, siniestro o PAS…" aria-label="Buscar"
            role="combobox" aria-expanded={items.length > 0} aria-controls="buscador-resultados"
            style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: "var(--text)", fontSize: 16, fontFamily: "inherit" }} />
          <button type="button" onClick={onCerrar} className="kbd-esc" style={{ font: "inherit", fontSize: 11, border: "1px solid var(--border2)", borderRadius: 5, padding: "1px 6px", background: "none", color: "var(--sub)", cursor: "pointer" }}>Esc</button>
        </div>

        <div id="buscador-resultados" role="listbox" ref={listaRef} style={{ overflowY: "auto", paddingBottom: 6 }}>
          {!texto && <div style={{ padding: "18px 14px", fontSize: 13, color: "var(--muted)" }}>Escribí un apellido, una patente (AB123CD), un DNI, un número de siniestro, una compañía o un PAS.</div>}
          {texto && items.length === 0 && <div style={{ padding: "18px 14px", fontSize: 14, color: "var(--sub)" }}>Nada coincide con “{q.trim()}”.</div>}

          {casos.length > 0 && grupo("Casos")}
          {casos.map(c => { i++; return fila(items[i], i, <>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.asegurado || "Sin nombre"}{c.patente && <span style={{ marginLeft: 8, fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>{c.patente}</span>}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--sub)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[c.compania_aseguradora, c._pasNombre].filter(Boolean).join(" · ")}</span>
            </span>
            <EstadoPill estado={c.estado} size="sm" />
          </>); })}

          {(locales.length > 0 || otros.length > 0) && grupo("PAS")}
          {[...locales, ...otros].map(p => { i++; const it = items[i]; return fila(it, i, <>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nombre}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--sub)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[p.mail, (p.telefonos || [])[0]].filter(Boolean).join(" · ") || "Sin datos de contacto"}</span>
            </span>
            <span style={{ fontSize: 11, color: it.tipo === "cliente" ? "var(--accent-ink)" : "var(--muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{it.tipo === "cliente" ? "Cliente →" : "Registrar contacto"}</span>
          </>); })}
        </div>

        <div className="buscador-ayuda" style={{ borderTop: "1px solid var(--border)", padding: "7px 14px", fontSize: 11, color: "var(--muted)", display: "flex", gap: 14 }}>
          <span>↑ ↓ para moverte</span><span>Enter para abrir</span><span>Esc para cerrar</span>
        </div>
      </div>
    </div>
  );
}
