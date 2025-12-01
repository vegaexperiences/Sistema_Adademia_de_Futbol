"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }

  if (!mounted) {
    return (
      <div className="h-10 w-full bg-gray-100/50 dark:bg-gray-800/50 rounded-xl animate-pulse" />
    )
  }

  return (
    <button
      onClick={handleToggle}
      className="w-full px-4 py-2.5 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-blue-600 dark:to-blue-800 text-white"
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
