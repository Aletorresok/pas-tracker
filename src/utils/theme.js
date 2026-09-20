// 🎛️ CONFIGURACIÓN DE TEMA - PAS TRACKER
// Paleta semántica y estructural corregida para accesibilidad WCAG y contraste profesional

// ==========================================
// 1. PALETAS DE COLORES SEMÁNTICOS Y ACENTO
// ==========================================
export const COLORES = {
  brand: "#C9A227",          // Dorado apagado (uso reservado: número hero y logo)
  primaryGradient: "linear-gradient(135deg, #C9A227 0%, #A6821F 100%)",
  primaryLight: "#D4AF37",
  
  // Colores semánticos adaptados (más oscuros y saturados para evitar efectos neón molestos)
  success: "#2E7D53",        // Verde esmeralda profundo (Cobrado / positivo)
  warning: "#B86B29",        // Ámbar terracota formal (Pendiente de gestión)
  danger: "#A63C2E",         // Rojo ladrillo sobrio (Desistido / riesgo)
  info: "#3B6E9E",           // Azul acero profundo (En trámite / activo)
};

// ==========================================
// 2. CONFIGURACIÓN DE FONDOS, TEXTOS Y BORDES (MODO CLARO / OSCURO)
// ==========================================
export const THEME = (dark) => {
  if (dark) {
    return {
      bg:     "#10151F",
      card:   "#171E2B",
      card2:  "#1E2738",
      border: "#252D3D",
      text:   "#E9E7E1",
      sub:    "#8D93A1",
      muted:  "#5A6273",
      input: {
        background: "#171E2B",
        border: "1px solid #252D3D",
        borderRadius: 8,
        color: "#E9E7E1",
        padding: "10px 14px",
        fontSize: 14,
        width: "100%",
        boxSizing: "border-box",
        outline: "none",
        fontFamily: "inherit",
        fontVariantNumeric: "tabular-nums",
      },
    };
  }

  return {
    bg:     "#F7F6F2",       // Fondo general marfil suave (elimina el blanco puro cansador)
    card:   "#FFFFFF",
    card2:  "#EFEFEA",
    border: "#E4E2DC",
    text:   "#1A1D24",       // Texto casi negro de alta legibilidad
    sub:    "#555B6E",       // Gris secundario con excelente contraste
    muted:  "#8A909F",
    input: {
      background: "#FFFFFF",
      border: "1px solid #E4E2DC",
      borderRadius: 8,
      color: "#1A1D24",
      padding: "10px 14px",
      fontSize: 14,
      width: "100%",
      boxSizing: "border-box",
      outline: "none",
      fontFamily: "inherit",
      fontVariantNumeric: "tabular-nums",
    },
  };
};