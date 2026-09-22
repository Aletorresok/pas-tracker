import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { THEME, COLORES, ACENTOS } from "../utils/theme.js";

const ThemeContext = createContext();

const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin storage */ } };
const sistemaOscuro = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({ children }) {
  // null = seguir el tema del sistema; true/false = elección manual guardada
  const [preferencia, setPreferencia] = useState(() => {
    const g = leer("pas_tracker_dark_mode");
    return g === null ? null : JSON.parse(g);
  });
  const [oscuroSistema, setOscuroSistema] = useState(sistemaOscuro);
  const [acento, setAcentoState] = useState(() => leer("pas_tracker_acento") || "");

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e) => setOscuroSistema(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const darkMode = preferencia === null ? oscuroSistema : preferencia;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = darkMode ? "dark" : "light";
    if (acento) root.dataset.accent = acento; else delete root.dataset.accent;
  }, [darkMode, acento]);

  const toggleDarkMode = () => {
    const nuevo = !darkMode;
    setPreferencia(nuevo);
    guardar("pas_tracker_dark_mode", JSON.stringify(nuevo));
  };

  const setAcento = (a) => {
    setAcentoState(a);
    guardar("pas_tracker_acento", a);
  };

  const T = useMemo(() => THEME(darkMode), [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, acento, setAcento, ACENTOS, T, COLORES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
