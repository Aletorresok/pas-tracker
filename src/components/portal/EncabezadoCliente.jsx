import Boton from "../ui/Boton.jsx";
import Logo from "../ui/Logo.jsx";

// Barra de arriba de las vistas públicas del cliente (reclamo y expediente). "Salir" solo si se pasa onSalir.
export default function EncabezadoCliente({ subtitulo, onSalir, darkMode, toggleDarkMode }) {
  return (
    <header style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "12px 16px", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Logo alto={26} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap" }}>ATG Lex Solutions</div>
          <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>{subtitulo}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {onSalir && <Boton variante="fantasma" tamaño="sm" icono="salir" onClick={onSalir}>Salir</Boton>}
        <Boton variante="fantasma" tamaño="sm" icono={darkMode ? "sol" : "luna"} onClick={toggleDarkMode} aria-label={darkMode ? "Modo claro" : "Modo oscuro"} />
      </div>
    </header>
  );
}
