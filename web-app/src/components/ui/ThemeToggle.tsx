"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    // Force theme to light and prevent any system detection
    if (theme === 'system' || theme === undefined || !theme) {
      setTheme('light')
    }
    // Also ensure HTML element doesn't have dark class if theme is light
    if (theme === 'light' || !theme) {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
      localStorage.setItem('theme', 'light')
    }
  }, [theme, setTheme])

  if (!mounted) {
    return (
      <div className="h-10 w-full bg-gray-100/50 dark:bg-gray-800/50 rounded-xl animate-pulse" />
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="w-full px-4 py-2.5 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-2"
      style={{
        background: theme === "light" 
          ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          : "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
        color: "white"
      }}
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <>
          <Moon size={18} />
          <span>Modo Oscuro</span>
        </>
      ) : (
        <>
          <Sun size={18} />
          <span>Modo Claro</span>
        </>
      )}
    </button>
  )
}
