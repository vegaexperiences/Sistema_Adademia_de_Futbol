"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  // Force light theme on mount and clear any system/dark preferences
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Remove dark class from html element immediately
      document.documentElement.classList.remove('dark');
      
      // Check and fix localStorage
      const theme = localStorage.getItem('theme');
      if (theme === 'system' || theme === 'dark' || !theme) {
        localStorage.setItem('theme', 'light');
        document.documentElement.classList.remove('dark');
      }
      
      // Also check for any other theme storage keys
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('theme') && localStorage.getItem(key) === 'system') {
          localStorage.setItem(key, 'light');
        }
        if (key.includes('theme') && localStorage.getItem(key) === 'dark') {
          localStorage.setItem(key, 'light');
        }
      });
      
      // Force remove dark class periodically to prevent it from being re-added
      const interval = setInterval(() => {
        if (document.documentElement.classList.contains('dark')) {
          const currentTheme = localStorage.getItem('theme');
          if (currentTheme !== 'dark') {
            document.documentElement.classList.remove('dark');
          }
        }
      }, 100);
      
      return () => clearInterval(interval);
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
