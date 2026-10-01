// Números = Finanzas + Análisis en una sola entrada del menú, con un selector arriba
export default function EncabezadoNumeros({ actual, onIr }) {
  return (
    <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Números</h1>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          {actual === "analisis" ? "Compañías, PAS y etapas: lo que no hace falta mirar todos los días" : "Lo que entra, lo que sale y lo que falta facturar o cobrar"}
        </div>
      </div>
      <div role="group" aria-label="Finanzas o Análisis" className="segmentado" style={{ alignSelf: "flex-start" }}>
        {[["finanzas", "Finanzas"], ["analisis", "Análisis"]].map(([k, l]) => (
          <button key={k} type="button" aria-pressed={actual === k} onClick={() => onIr(k)}>{l}</button>
        ))}
      </div>
    </header>
  );
}
