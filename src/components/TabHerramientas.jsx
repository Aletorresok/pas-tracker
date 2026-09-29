import { useState, useMemo, lazy, Suspense } from "react";
import Icono from "./ui/Icono.jsx";
import { aplanarCasos } from "../utils/metricas.js";

// Para sumar una herramienta: agregarla acá (se carga recién cuando se abre).
const HERRAMIENTAS = [
  {
    k: "pdf",
    titulo: "Editor de PDF",
    desc: "Juntar PDFs e imágenes, sacar, ordenar y rotar páginas, poner una firma o sello, quedarte con algunas páginas y comprimir.",
    icono: "escrito",
    Componente: lazy(() => import("./herramientas/EditorPDF.jsx")),
  },
  {
    k: "escaner",
    titulo: "Escáner",
    desc: "Fotos del celular a PDF como escaneo: encuentra la hoja, la endereza y la deja blanca, sin sombras.",
    icono: "camara",
    Componente: lazy(() => import("./herramientas/Escaner.jsx")),
  },
  {
    k: "plazos",
    titulo: "Calculadora de plazos",
    desc: "Vencimiento en días hábiles judiciales o corridos, con feriados, feria y plazo de gracia. También días entre dos fechas.",
    icono: "calendario",
    Componente: lazy(() => import("./herramientas/CalculadoraPlazos.jsx")),
  },
  {
    k: "intereses",
    titulo: "Intereses y actualización",
    desc: "Compará tasa activa BNA, IPC, IPC + 3% e ICL para un capital entre dos fechas, con el texto listo para el escrito.",
    icono: "calculadora",
    Componente: lazy(() => import("./herramientas/CalculadoraIntereses.jsx")),
  },
  {
    k: "carta",
    titulo: "Carta documento",
    desc: "Texto listo para imprimir sobre el formulario de Correo Argentino, con modelos y los datos del caso.",
    icono: "sobre",
    Componente: lazy(() => import("./herramientas/CartaDocumento.jsx")),
  },
];

export default function TabHerramientas({ casos = {}, todosLosPas = [] }) {
  const [abierta, setAbierta] = useState(null);
  const allCasos = useMemo(() => aplanarCasos(casos, todosLosPas), [casos, todosLosPas]);
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
          <h.Componente allCasos={allCasos} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Herramientas</h1>
        <div style={{ fontSize: 14, color: "var(--sub)", marginTop: 4 }}>Para el día a día, fuera de un caso. Los archivos no salen de tu compu o tu celular.</div>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {HERRAMIENTAS.map(x => (
          <button key={x.k} type="button" className="tarjeta-lift" onClick={() => setAbierta(x.k)}
            style={{ textAlign: "left", font: "inherit", color: "var(--text)", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", padding: 16, cursor: "pointer", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span style={{ flex: "none", width: 40, height: 40, borderRadius: "var(--r-sm)", display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-ink)" }}>
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
