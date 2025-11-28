'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { MobileNav } from './MobileNav';

interface MobileHeaderProps {
  userEmail: string;
}

export function MobileHeader({ userEmail }: MobileHeaderProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 glass-card border-b border-gray-200/20 dark:border-gray-700/50">
        <div className="flex items-center justify-between px-4 py-3 h-16">
          {/* Logo and Menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNavOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation"
              aria-label="Abrir menú"
            >
              <Menu size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <Image 
                  src="/logo.png" 
                  alt="Suarez Academy Logo" 
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-gray-900 dark:text-white font-bold text-base">SUAREZ ACADEMY</span>
            </div>
          </div>

          {/* User Avatar */}
          <div className="w-10 h-10 gradient-purple rounded-full flex items-center justify-center text-white font-bold shadow-lg text-sm">
            {userEmail?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      <MobileNav 
        userEmail={userEmail} 
        isOpen={isNavOpen} 
        onClose={() => setIsNavOpen(false)} 
      />
    </>
  );
}

