'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAcademy } from '@/contexts/AcademyContext';
import { getNavigationLabel, getAcademyDisplayName } from '@/lib/utils/academy-branding';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { academy } = useAcademy();
  const [displayName, setDisplayName] = useState(academy?.display_name || academy?.name || 'SUAREZ ACADEMY');
  const [navLabels, setNavLabels] = useState({
    home: 'Inicio',
    enrollment: 'Matrícula',
    tournaments: 'Torneos',
    access: 'Acceso',
  });
  
  // Get logo URL from academy context, fallback to default
  const logoUrl = academy?.logo_url || academy?.logo_medium_url || academy?.logo_small_url || '/logo.png';
  
  useEffect(() => {
    if (academy) {
      setDisplayName(academy.display_name || academy.name || 'SUAREZ ACADEMY');
      setNavLabels({
        home: academy.settings?.navigation?.home || 'Inicio',
        enrollment: academy.settings?.navigation?.enrollment || 'Matrícula',
        tournaments: academy.settings?.navigation?.tournaments || 'Torneos',
        access: academy.settings?.navigation?.access || 'Acceso',
      });
    }
  }, [academy]);

  return (
    <nav className="glass-card sticky top-4 z-50 mx-4 mt-4 mb-6 border-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-2">
                {/* Placeholder for Logo - using text for now */}
                <div className="relative w-10 h-10 bg-transparent">
                  <Image 
                    src={logoUrl} 
                    alt={`${displayName} Logo`}
                    fill
                    className="object-contain"
                    style={{ objectFit: 'contain' }}
                    priority
                    unoptimized
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-900 font-bold text-lg leading-none">{displayName.split(' ')[0]}</span>
                  <span className="text-gray-600 text-xs font-medium tracking-wider">{displayName.split(' ').slice(1).join(' ') || 'ACADEMY'}</span>
                </div>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className="border-transparent text-gray-500 hover:border-blue-600 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                {navLabels.home}
              </Link>
              <Link
                href="/enrollment"
                className="border-transparent text-gray-500 hover:border-blue-600 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                {navLabels.enrollment}
              </Link>
              <Link
                href="/tournaments"
                className="border-transparent text-gray-500 hover:border-blue-600 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                {navLabels.tournaments}
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center gap-4">
            <Link
              href="/login"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <User size={16} />
              {navLabels.access}
            </Link>
          </div>
          <div className="-mr-2 flex items-center sm:hidden gap-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Abrir menú principal</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="sm:hidden bg-white border-b border-gray-100">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className="bg-blue-50 border-l-4 border-blue-600 text-blue-700 block pl-3 pr-4 py-2 text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              {navLabels.home}
            </Link>
            <Link
              href="/enrollment"
              className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              {navLabels.enrollment}
            </Link>
            <Link
              href="/tournaments"
              className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              {navLabels.tournaments}
            </Link>
            <Link
              href="/login"
              className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              {navLabels.access}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
