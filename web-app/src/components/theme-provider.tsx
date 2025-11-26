"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  // Force light theme on mount and clear any system/dark preferences
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('theme');
      // If theme is 'system' or 'dark', reset to 'light'
      if (theme === 'system' || theme === 'dark') {
        localStorage.setItem('theme', 'light');
        document.documentElement.classList.remove('dark');
      } else if (!theme) {
        // If no theme is set, set it to light
        localStorage.setItem('theme', 'light');
      }
    }
  }, []);

  return (
    <NextThemesProvider 
      {...props}
      storageKey="theme"
      forcedTheme={props.forcedTheme || undefined}
    >
      {children}
    </NextThemesProvider>
  );
}
