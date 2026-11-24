import { THEME } from "../../utils/theme.js";
export { ESTADOS_CASO, estadoInfo } from "../../constants.js";

export const fmtDate = iso => {
  if (!iso) return "—";
  try {
    const s = String(iso);
    const [y, m, d] = s.slice(0, 10).split("-");
    return `${d}/${m}/${String(y).slice(-2)}`;
  } catch { return "—"; }
};

// El mismo formato que la app (incluye ocultar montos de relleno como $1)
export { fmtMoney } from "../../utils/formatters.js";

// Mismo sistema visual que la app (tokens en src/index.css)
export const theme = () => THEME();
