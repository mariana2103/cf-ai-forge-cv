"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "dark" | "light"

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", setTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize from DOM — the inline script in layout.tsx has already applied the class
  const [theme, setThemeState] = useState<Theme>("dark")

  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("light") ? "light" : "dark")
  }, [])

  useEffect(() => {
    const html = document.documentElement
    if (theme === "light") {
      html.classList.add("light")
    } else {
      html.classList.remove("light")
    }
    try { localStorage.setItem("theme", theme) } catch {}
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
