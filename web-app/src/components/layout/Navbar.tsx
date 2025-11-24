'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="glass-card sticky top-4 z-50 mx-4 mt-4 mb-6 border-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-2">
                {/* Placeholder for Logo - using text for now */}
                <div className="relative w-10 h-10">
                  <Image 
                    src="/logo.png" 
                    alt="Suarez Academy Logo" 
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-900 dark:text-white font-bold text-lg leading-none">SUAREZ</span>
                  <span className="text-gray-600 dark:text-gray-400 text-xs font-medium tracking-wider">ACADEMY</span>
                </div>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className="border-transparent text-gray-500 dark:text-gray-400 hover:border-blue-600 dark:hover:border-blue-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                Inicio
              </Link>
              <Link
                href="/enrollment"
                className="border-transparent text-gray-500 dark:text-gray-400 hover:border-blue-600 dark:hover:border-blue-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                Matrícula
              </Link>
              <Link
                href="/tournaments"
                className="border-transparent text-gray-500 dark:text-gray-400 hover:border-blue-600 dark:hover:border-blue-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                Torneos
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center gap-4">
            <ThemeToggle />
            <Link
              href="/login"
              className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
            >
              <User size={16} />
              Acceso
            </Link>
          </div>
          <div className="-mr-2 flex items-center sm:hidden gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Abrir menú principal</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="sm:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-300 block pl-3 pr-4 py-2 text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              Inicio
            </Link>
            <Link
              href="/enrollment"
              className="border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              Matrícula
            </Link>
            <Link
              href="/tournaments"
              className="border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              Torneos
            </Link>
            <Link
              href="/login"
              className="border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              Acceso
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
