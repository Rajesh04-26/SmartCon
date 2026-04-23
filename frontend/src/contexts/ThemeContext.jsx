import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "smartcon-theme";

export const themes = [
  { id: "default", label: "Default" },
  { id: "light", label: "Light" },
  { id: "dark-gold", label: "Dark Gold" },
  { id: "neon-purple", label: "Neon Purple" },
  { id: "forest", label: "Forest" }
];

const ThemeContext = createContext({
  currentTheme: "default",
  setCurrentTheme: () => {}
});

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return themes.some((theme) => theme.id === savedTheme) ? savedTheme : "default";
  });

  useEffect(() => {
    document.body.setAttribute("data-theme", currentTheme);
    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  }, [currentTheme]);

  const value = useMemo(
    () => ({
      currentTheme,
      setCurrentTheme
    }),
    [currentTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
