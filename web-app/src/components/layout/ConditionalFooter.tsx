'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on dashboard routes
  if (pathname?.startsWith('/dashboard')) {
    return null;
  }
  
  return <Footer />;
}

