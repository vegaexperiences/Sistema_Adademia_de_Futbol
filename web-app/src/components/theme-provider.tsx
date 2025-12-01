"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
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
    >
      {children}
    </NextThemesProvider>
  );
}
