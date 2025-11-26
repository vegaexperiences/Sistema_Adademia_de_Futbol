"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  // Force light theme on mount and clear any system/dark preferences
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Immediately remove dark class and add light class
      const html = document.documentElement;
      html.classList.remove('dark');
      html.classList.add('light');
      
      // Force set theme to light in localStorage
      localStorage.setItem('theme', 'light');
      
      // Check and fix localStorage - remove any system/dark values
      const theme = localStorage.getItem('theme');
      if (theme === 'system' || theme === 'dark' || !theme) {
        localStorage.setItem('theme', 'light');
        html.classList.remove('dark');
        html.classList.add('light');
      }
      
      // Also check for any other theme storage keys
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('theme')) {
          const value = localStorage.getItem(key);
          if (value === 'system' || value === 'dark') {
            localStorage.setItem(key, 'light');
          }
        }
      });
      
      // Force remove dark class and ensure light class is present
      const forceLight = () => {
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme !== 'dark') {
          html.classList.remove('dark');
          html.classList.add('light');
        }
      };
      
      // Run immediately and then periodically
      forceLight();
      const interval = setInterval(forceLight, 50);
      
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
