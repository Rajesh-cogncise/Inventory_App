import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(null);

  // Update theme on <html>
  const updateThemeOnHtmlEl = (theme) => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  };

  // Load theme from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme") || "light";
      setTheme(storedTheme);
      updateThemeOnHtmlEl(storedTheme);
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", newTheme);
      updateThemeOnHtmlEl(newTheme);
    }
  };

  return { theme, toggleTheme };
}
