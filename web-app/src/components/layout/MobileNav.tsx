'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { 
  Users, 
  LayoutDashboard, 
  LogOut, 
  Settings,
  FileText,
  CheckCircle,
  User,
  Trophy,
  TrendingUp,
  Mail,
  X,
  Menu
} from 'lucide-react';
import { logout } from '@/app/auth/actions';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface MobileNavProps {
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ userEmail, isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const navLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/approvals', icon: CheckCircle, label: 'Aprobaciones' },
    { href: '/dashboard/players', icon: Users, label: 'Jugadores' },
    { href: '/dashboard/finances', icon: TrendingUp, label: 'Finanzas' },
    { href: '/dashboard/tournaments', icon: Trophy, label: 'Torneos' },
    { href: '/dashboard/tutors', icon: User, label: 'Tutores' },
    { href: '/dashboard/families', icon: Users, label: 'Familias' },
    { href: '/dashboard/reports', icon: FileText, label: 'Reportes' },
    { href: '/dashboard/emails', icon: Mail, label: 'Correos' },
    { href: '/dashboard/settings', icon: Settings, label: 'Configuración' },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] glass-card z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200/20 dark:border-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <Image 
                  src="/logo.png" 
                  alt="Suarez Academy Logo" 
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-gray-900 dark:text-white font-bold text-lg">SUAREZ ACADEMY</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation"
              aria-label="Cerrar menú"
            >
              <X size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 touch-manipulation ${
                    isActive
                      ? 'gradient-purple text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                  }`}
                  onClick={onClose}
                >
                  <Icon size={22} />
                  <span className="font-medium text-base">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Theme Toggle */}
          <div className="p-4 border-t border-gray-200/20 dark:border-gray-700/50">
            <div className="px-4 py-2">
              <ThemeToggle />
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200/20 dark:border-gray-700/50">
            <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl">
              <div className="w-10 h-10 gradient-purple rounded-full flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                {userEmail?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {userEmail}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">Administrador</span>
              </div>
            </div>
            <form action={logout}>
              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-300 text-sm font-medium active:bg-red-100 dark:active:bg-red-900/30 border border-red-200 dark:border-red-800 touch-manipulation"
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}

