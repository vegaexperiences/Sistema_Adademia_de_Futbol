"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      
      // Force remove any system theme detection
      // Clear any theme-related localStorage entries that might cause issues
      const themeKeys = ['theme', 'next-themes', 'color-scheme'];
      themeKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value && value !== 'light' && value !== 'dark') {
          localStorage.setItem(key, 'light');
        }
      });
      
      // Get theme from localStorage or default to light
      const savedTheme = localStorage.getItem('theme');
      const theme = (savedTheme === 'dark') ? 'dark' : 'light';
      
      // Apply theme immediately and aggressively
      const applyTheme = (t: 'light' | 'dark') => {
        if (t === 'dark') {
          html.classList.add('dark');
          html.classList.remove('light');
        } else {
          html.classList.remove('dark');
          html.classList.add('light');
        }
        // Ensure localStorage is set correctly
        localStorage.setItem('theme', t);
        // Also set next-themes storage key
        localStorage.setItem('next-themes', t);
      };
      
      // Force light mode initially, then apply saved theme
      html.classList.remove('dark');
      html.classList.add('light');
      if (theme === 'dark') {
        // Small delay to ensure light is set first, then apply dark if needed
        setTimeout(() => applyTheme('dark'), 0);
      } else {
        applyTheme('light');
      }
      
      // Aggressive MutationObserver to prevent unwanted dark class
      const observer = new MutationObserver(() => {
        const saved = localStorage.getItem('theme') || 'light';
        const shouldBeDark = saved === 'dark';
        const hasDark = html.classList.contains('dark');
        const hasLight = html.classList.contains('light');
        
        // If dark is present but shouldn't be, force remove it
        if (hasDark && !shouldBeDark) {
          html.classList.remove('dark');
          html.classList.add('light');
          localStorage.setItem('theme', 'light');
        }
        // If light is not present but should be, add it
        if (!hasLight && !shouldBeDark) {
          html.classList.add('light');
        }
        // If dark should be present but isn't, add it (user explicitly set dark)
        if (shouldBeDark && !hasDark) {
          html.classList.add('dark');
          html.classList.remove('light');
        }
      });
      
      observer.observe(html, {
        attributes: true,
        attributeFilter: ['class'],
        childList: false,
        subtree: false
      });
      
      // Also listen for storage changes
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'theme' && e.newValue) {
          const newTheme = e.newValue === 'dark' ? 'dark' : 'light';
          if (newTheme === 'dark') {
            html.classList.add('dark');
            html.classList.remove('light');
          } else {
            html.classList.remove('dark');
            html.classList.add('light');
          }
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        observer.disconnect();
      };
    }
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <NextThemesProvider 
      {...props}
      storageKey="theme"
      defaultTheme="light"
      enableSystem={false}
      attribute="class"
      disableTransitionOnChange
      forcedTheme="light" // Force light initially, user can change via button
    >
      {children}
    </NextThemesProvider>
  );
}
