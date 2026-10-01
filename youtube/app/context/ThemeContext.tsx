"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeContextType = {
  theme: string;
  applyTheme: (next: string, manual: boolean) => void;
};

// single source of truth for light/dark theme
const ThemeContext = createContext<ThemeContextType | null>(null);

// login time rule (Task 5): 5:00 AM - 12:00 PM IST = light, otherwise dark
export const istAutoTheme = () => {
  const istHour = Number(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hour12: false,
    })
  );
  return istHour >= 5 && istHour < 12 ? "light" : "dark";
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState("light");

  // on first load: a manual choice wins, otherwise the IST time rule decides
  useEffect(() => {
    const manual = localStorage.getItem("themeAuto") === "false";
    const saved = localStorage.getItem("theme");
    const next = manual && saved ? saved : istAutoTheme();
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  // manual = the user pressed the sun/moon button, so stop the auto rule
  const applyTheme = (next: string, manual: boolean) => {
    setTheme(next);
    localStorage.setItem("theme", next);
    localStorage.setItem("themeAuto", manual ? "false" : "true");
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return ctx;
};