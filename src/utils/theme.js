// 🎛️ INTERRUPTOR DE DISEÑO
// Escribí "slate" para el original (azulado) o "zinc" para el nuevo (gris/premium)
const TEMA_ACTIVO = "slate"; 

// ==========================================
// 1. PALETAS DE COLORES
// ==========================================
const COLORES_SLATE = {
  primary: "#6366f1",
  primaryLight: "#818cf8",
  primaryGradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  success: "#22c55e",
  warning: "#f97316",
  danger: "#ef4444",
  info: "#06b6d4",
  yellow: "#eab308",
  purple: "#a855f7",
  blue: "#3b82f6",
};

const COLORES_ZINC = {
  primary: "#4f46e5", 
  primaryLight: "#818cf8",
  primaryGradient: "linear-gradient(135deg, #4f46e5, #7c3aed)",
  success: "#10b981", 
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#0ea5e9",
  yellow: "#eab308",
  purple: "#a855f7",
  blue: "#3b82f6",
};

// Exportamos los colores según el interruptor
export const COLORES = TEMA_ACTIVO === "zinc" ? COLORES_ZINC : COLORES_SLATE;

// ==========================================
// 2. CONFIGURACIÓN DE FONDOS Y BORDES (MODO CLARO/OSCURO)
// ==========================================
export const THEME = (dark) => {
  
  // --- TEMA NUEVO (ZINC) ---
  if (TEMA_ACTIVO === "zinc") {
    return {
      bg:     dark ? "#09090b" : "#fafafa",
      card:   dark ? "#18181b" : "#ffffff",
      card2:  dark ? "#27272a" : "#f4f4f5",
      border: dark ? "#27272a" : "#e4e4e7",
      text:   dark ? "#fafafa" : "#18181b",
      sub:    dark ? "#a1a1aa" : "#52525b",
      muted:  dark ? "#71717a" : "#a1a1aa",
      input:  dark
        ? { background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fafafa", padding: "10px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit", transition: "border-color 0.2s" }
        : { background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: 8, color: "#18181b", padding: "10px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit", transition: "border-color 0.2s" },
    };
  }

  // --- TEMA VIEJO (SLATE - ORIGINAL) ---
  return {
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
  };
};