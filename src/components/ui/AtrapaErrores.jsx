import { Component } from "react";
import Boton from "./Boton.jsx";

// Archivo de una versión anterior que ya no está publicada (después de un deploy con la app abierta)
const esArchivoViejo = e => /dynamically imported module|Importing a module script failed|error loading dynamically|MIME type|Unable to preload/i.test(String(e?.message || e));

// Recarga una sola vez por minuto: si el archivo sigue faltando, muestra el aviso en lugar de entrar en un bucle
const CLAVE = "atg-recarga-version";
export function recargarPorVersion() {
  try {
    const ultima = Number(sessionStorage.getItem(CLAVE)) || 0;
    if (Date.now() - ultima < 60000) return false;
    sessionStorage.setItem(CLAVE, String(Date.now()));
  } catch { /* sin sessionStorage: recarga igual */ }
  window.location.reload();
  return true;
}

// Vite avisa cuando no pudo bajar una parte de la app: se trae la versión nueva
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", e => { if (recargarPorVersion()) e.preventDefault(); });
}

// Si algo de adentro se rompe, muestra un aviso con "Reintentar" en vez de dejar la pantalla en blanco.
// `clave`: al cambiar (por ejemplo, de pestaña) se limpia el error.
export default class AtrapaErrores extends Component {
  state = { error: null, clave: this.props.clave };

  static getDerivedStateFromError(error) { return { error }; }

  static getDerivedStateFromProps(props, state) {
    return props.clave !== state.clave ? { error: null, clave: props.clave } : null;
  }

  componentDidCatch(error, info) {
    console.error("[AtrapaErrores]", error, info?.componentStack);
    if (esArchivoViejo(error)) recargarPorVersion();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const viejo = esArchivoViejo(error);
    return (
      <div role="alert" className="tarjeta" style={{ maxWidth: 520, margin: "48px auto", padding: 24, display: "flex", flexDirection: "column", gap: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-2)", color: "var(--text)" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{viejo ? "Hay una versión nueva de la app" : "Algo falló en esta pantalla"}</h2>
        <div style={{ fontSize: 14, color: "var(--sub)", lineHeight: 1.5 }}>
          {viejo ? "Recargá para traer la última versión. No se pierde nada de lo guardado." : "El resto de la app sigue funcionando. Probá de nuevo; si se repite, recargá."}
        </div>
        {!viejo && <code style={{ fontSize: 12, color: "var(--muted)", overflowWrap: "anywhere" }}>{String(error?.message || error)}</code>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!viejo && <Boton onClick={() => this.setState({ error: null })}>Reintentar</Boton>}
          <Boton variante="primario" icono="recargar" onClick={() => window.location.reload()}>Recargar</Boton>
        </div>
      </div>
    );
  }
}
