"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    
    // Initialize theme from localStorage or default to light
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme || savedTheme === 'system' || (savedTheme !== 'light' && savedTheme !== 'dark')) {
      localStorage.setItem('theme', 'light');
      localStorage.setItem('next-themes', 'light');
      setTheme('light');
      // Force HTML classes
      const html = document.documentElement;
      html.classList.remove('dark');
      html.classList.add('light');
    } else if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      // Ensure HTML classes match
      const html = document.documentElement;
      if (savedTheme === 'dark') {
        html.classList.add('dark');
        html.classList.remove('light');
      } else {
        html.classList.remove('dark');
        html.classList.add('light');
      }
    }
  }, [setTheme])

  React.useEffect(() => {
    if (mounted && theme) {
      // Ensure HTML element matches theme
      const html = document.documentElement;
      if (theme === 'dark') {
        html.classList.add('dark');
        html.classList.remove('light');
      } else {
        html.classList.remove('dark');
        html.classList.add('light');
      }
      // Sync localStorage
      if (theme !== 'system') {
        localStorage.setItem('theme', theme);
      }
    }
  }, [theme, mounted])

  const handleToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('next-themes', newTheme);
    
    // Immediately update HTML and force it
    const html = document.documentElement;
    if (newTheme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
    }
    
    // Force update to prevent any automatic changes
    setTimeout(() => {
      const currentTheme = localStorage.getItem('theme') || 'light';
      if (currentTheme === 'dark') {
        html.classList.add('dark');
        html.classList.remove('light');
      } else {
        html.classList.remove('dark');
        html.classList.add('light');
      }
    }, 10);
  }

  if (!mounted) {
    return (
      <div className="h-10 w-full bg-gray-100/50 dark:bg-gray-800/50 rounded-xl animate-pulse" />
    )
  }

  return (
    <button
      onClick={handleToggle}
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
