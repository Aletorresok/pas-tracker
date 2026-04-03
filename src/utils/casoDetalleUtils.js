// casoDetalleUtils.js
// Utilidades para CasoDetalle

export const TIPOS_DOC = ["DNI", "CEDULA", "DENUNCIA", "CERTIFICADO", "LICENCIA", "PRESUPUESTO", "ESCRITO", "FOTO"];
export const EXTENSIONES_VALIDAS = [".jpg", ".jpeg", ".png", ".pdf"];
export const ESTADOS_HONORARIOS = ["NO_FACTURADO", "FACTURADO", "COBRADO"];

export function sanitizarNombre(str) {
  return String(str || "").replace(/[/\\:*?"<>|]/g, "").trim();
}

export function formatoFecha(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${String(y).slice(-2)}`;
}

export function formatoFechaCarpeta(iso) {
  if (!iso) return "00-00-0000";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
}

export function fmtMoney(n) {
  if (n === null || n === undefined || n === "") return "—";
  return "$" + Number(n).toLocaleString("es-AR");
}

export function diasDesde(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function sumarDias(iso, dias) {
  if (!iso || !dias) return null;
  const d = new Date(iso);
  d.setDate(d.getDate() + Number(dias));
  return d.toISOString().slice(0, 10);
}

export function getExtension(nombre) {
  const parts = nombre.split(".");
  if (parts.length < 2) return "";
  return "." + parts[parts.length - 1].toLowerCase();
}

export async function verificarPermiso(handle, mode = "readwrite") {
  try {
    const perm = await handle.queryPermission({ mode });
    if (perm === "granted") return true;
    const req = await handle.requestPermission({ mode });
    return req === "granted";
  } catch {
    return false;
  }
}

export const THEME = (dark) => ({
  bg:     dark ? "#111827" : "#f8fafc",
  card:   dark ? "#1a2535" : "#ffffff",
  card2:  dark ? "#222f42" : "#f1f5f9",
  border: dark ? "#2d3f55" : "#e2e8f0",
  text:   dark ? "#f1f5f9" : "#0f172a",
  sub:    dark ? "#94a3b8" : "#475569",
  muted:  dark ? "#64748b" : "#94a3b8",
  input:  dark
    ? { background: "#1e293b", border: "1px solid #2d3f55", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }
    : { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, color: "#0f172a", padding: "9px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
});
