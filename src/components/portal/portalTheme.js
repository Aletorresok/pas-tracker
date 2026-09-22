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

export const fmtMoney = n => {
  if (n === null || n === undefined || n === "") return "—";
  return "$" + Number(n).toLocaleString("es-AR");
};

// Mismo sistema visual que la app (tokens en src/index.css)
export const theme = () => THEME();
