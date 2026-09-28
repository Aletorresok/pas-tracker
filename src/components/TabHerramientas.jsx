import { useState, lazy, Suspense } from "react";
import Icono from "./ui/Icono.jsx";

// Para sumar una herramienta: agregarla acá (se carga recién cuando se abre).
const HERRAMIENTAS = [
  {
    k: "pdf",
    titulo: "Editor de PDF",
    desc: "Juntar PDFs e imágenes, sacar, ordenar y rotar páginas, poner una firma o sello, quedarte con algunas páginas y comprimir.",
    icono: "escrito",
    Componente: lazy(() => import("./herramientas/EditorPDF.jsx")),
  },
];

export default function TabHerramientas() {
  const [abierta, setAbierta] = useState(null);
  const h = HERRAMIENTAS.find(x => x.k === abierta);

  if (h) {
    return (
      <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <header>
          <button type="button" onClick={() => setAbierta(null)}
            style={{ background: "none", border: "none", padding: 0, color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icono nombre="chevron" size={14} style={{ transform: "rotate(90deg)" }} />Herramientas
          </button>
          <h1 style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>{h.titulo}</h1>
        </header>
        <Suspense fallback={<div style={{ fontSize: 14, color: "var(--muted)" }}>Cargando…</div>}>
          <h.Componente />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Herramientas</h1>
        <div style={{ fontSize: 14, color: "var(--sub)", marginTop: 4 }}>Para el día a día, fuera de un caso. Todo corre en tu navegador.</div>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {HERRAMIENTAS.map(x => (
          <button key={x.k} type="button" onClick={() => setAbierta(x.k)}
            style={{ textAlign: "left", font: "inherit", color: "var(--text)", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, cursor: "pointer", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span style={{ flex: "none", width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-ink)" }}>
              <Icono nombre={x.icono} size={20} />
            </span>
            <span>
              <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{x.titulo}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--sub)", marginTop: 4, lineHeight: 1.45 }}>{x.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
