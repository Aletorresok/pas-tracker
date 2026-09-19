import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { THEME, COLORES } from "../utils/theme.js";

// Creamos el contexto
const ThemeContext = createContext();

// Este componente va a envolver a toda tu app
export function ThemeProvider({ children }) {
  // Leemos la preferencia de modo oscuro de la memoria (por defecto oscuro)
  const [darkMode, setDarkMode] = useState(() => {
    const guardado = localStorage.getItem("pas_tracker_dark_mode");
    return guardado !== null ? JSON.parse(guardado) : true;
  });

  // Cada vez que cambie, lo guardamos en el navegador
  useEffect(() => {
    localStorage.setItem("pas_tracker_dark_mode", JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Generamos el tema dinámicamente
  const T = useMemo(() => THEME(darkMode), [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, T, COLORES }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook personalizado para usar el tema en cualquier archivo fácilmente
export const useTheme = () => useContext(ThemeContext);