"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  // Force light theme on mount and prevent any dark mode
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      
      // Immediately force light mode
      const forceLight = () => {
        // Remove dark class and add light class
        html.classList.remove('dark');
        html.classList.add('light');
        
        // Force set theme to light in localStorage
        localStorage.setItem('theme', 'light');
      };
      
      // Run immediately
      forceLight();
      
      // Also run after a short delay to catch any late additions
      setTimeout(forceLight, 0);
      setTimeout(forceLight, 100);
      setTimeout(forceLight, 500);
      
      // Monitor for dark class being added and remove it
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const currentTheme = localStorage.getItem('theme');
            if (currentTheme !== 'dark' && html.classList.contains('dark')) {
              forceLight();
            }
          }
        });
      });
      
      // Observe the html element for class changes
      observer.observe(html, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      // Also set up interval as backup
      const interval = setInterval(() => {
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme !== 'dark' && html.classList.contains('dark')) {
          forceLight();
        }
      }, 100);
      
      return () => {
        observer.disconnect();
        clearInterval(interval);
      };
    }
  }, []);

  return (
    <NextThemesProvider 
      {...props}
      storageKey="theme"
      forcedTheme="light"
    >
      {children}
    </NextThemesProvider>
  );
}
