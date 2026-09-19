// 🎛️ CONFIGURACIÓN DE TEMA - PAS TRACKER
// Paleta semántica y estructural exacta según especificación de rediseño

// ==========================================
// 1. PALETAS DE COLORES SEMÁNTICOS Y ACENTO
// ==========================================
export const COLORES = {
  brand: "#C9A227",          // Dorado apagado (uso reservado: número hero y logo)
  success: "#3FA773",        // Verde esmeralda (Cobrado / positivo)
  warning: "#D98F3F",        // Ámbar terracota (Pendiente de gestión / esperando)
  danger: "#C1503F",         // Rojo ladrillo (Desistido / riesgo)
  info: "#4A7FB5",           // Azul acero (En trámite / activo)
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
    bg:     "#F7F6F2",
    card:   "#FFFFFF",
    card2:  "#EFEFEA",
    border: "#E4E2DC",
    text:   "#1A1D24",
    sub:    "#6B7180",
    muted:  "#9CA3AF",
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