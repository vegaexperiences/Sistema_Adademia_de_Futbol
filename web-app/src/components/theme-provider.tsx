"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  const [mounted, setMounted] = React.useState(false);
  const [currentTheme, setCurrentTheme] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      
      // Get theme from localStorage or default to light
      const savedTheme = localStorage.getItem('theme');
      const theme = (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
      setCurrentTheme(theme);
      
      // Apply theme immediately
      const applyTheme = (t: 'light' | 'dark') => {
        if (t === 'dark') {
          html.classList.add('dark');
          html.classList.remove('light');
        } else {
          html.classList.remove('dark');
          html.classList.add('light');
        }
        localStorage.setItem('theme', t);
      };
      
      applyTheme(theme);
      
      // Listen for theme changes from ThemeToggle
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'theme' && e.newValue) {
          const newTheme = e.newValue as 'light' | 'dark';
          setCurrentTheme(newTheme);
          applyTheme(newTheme);
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      // Monitor for dark class being added incorrectly
      const observer = new MutationObserver(() => {
        const saved = localStorage.getItem('theme') || 'light';
        const shouldBeDark = saved === 'dark';
        const hasDark = html.classList.contains('dark');
        
        if (shouldBeDark !== hasDark) {
          applyTheme(saved as 'light' | 'dark');
        }
      });
      
      observer.observe(html, {
        attributes: true,
        attributeFilter: ['class']
      });
      
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
      storageKey="theme"
      defaultTheme="light"
      enableSystem={false}
      attribute="class"
      disableTransitionOnChange
      forcedTheme={undefined} // Don't force, let user control via button
    >
      {children}
    </NextThemesProvider>
  );
}
