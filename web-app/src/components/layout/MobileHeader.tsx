'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Menu,
  X,
  Users, 
  LayoutDashboard, 
  LogOut, 
  Settings,
  FileText,
  CheckCircle,
  User,
  Trophy,
  TrendingUp,
  Mail
} from 'lucide-react';
import { logout } from '@/app/auth/actions';

interface MobileHeaderProps {
  userEmail: string;
  pendingCount?: number;
}

export function MobileHeader({ userEmail, pendingCount = 0 }: MobileHeaderProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isNavOpen]);

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
      {/* Mobile Header - Fixed with glass effect, no margins */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-[100] bg-white/70 backdrop-blur-xl border-none rounded-b-2xl shadow-lg m-0">
        <div className="flex items-center justify-between px-4 py-3 h-16 safe-area-top">
          {/* Menu Button and Logo */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setIsNavOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation flex-shrink-0 z-[101]"
              aria-label="Abrir menú"
            >
              <Menu size={24} className="text-gray-700" />
            </button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="relative w-8 h-8 flex-shrink-0 bg-transparent">
                <Image 
                  src="/logo.png" 
                  alt="Suarez Academy Logo" 
                  fill
                  className="object-contain"
                  sizes="32px"
                  style={{ objectFit: 'contain' }}
                  priority
                  unoptimized
                />
              </div>
              <span className="text-gray-900 font-bold text-sm sm:text-base truncate">SUAREZ ACADEMY</span>
            </div>
          </div>

          {/* User Avatar */}
          <div className="w-10 h-10 gradient-purple rounded-full flex items-center justify-center text-white font-bold shadow-lg text-sm flex-shrink-0 ml-2">
            {userEmail?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      {/* Overlay - Only when menu is open */}
      {isNavOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] md:hidden"
          onClick={() => setIsNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Menu - Unified with header */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white backdrop-blur-md border-r border-gray-200/20 shadow-2xl z-[120] transform transition-transform duration-300 ease-in-out md:hidden ${
          isNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header inside sidebar */}
          <div className="p-4 border-b border-gray-200/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 bg-transparent">
                <Image 
                  src="/logo.png" 
                  alt="Suarez Academy Logo" 
                  fill
                  className="object-contain"
                  style={{ objectFit: 'contain' }}
                  priority
                  unoptimized
                />
              </div>
              <span className="text-gray-900 font-bold text-lg">SUAREZ ACADEMY</span>
            </div>
            <button
              onClick={() => setIsNavOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
              aria-label="Cerrar menú"
            >
              <X size={24} className="text-gray-700" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              const showBadge = link.href === '/dashboard/approvals' && pendingCount > 0;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 touch-manipulation relative ${
                    isActive
                      ? 'gradient-purple text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                  }`}
                  onClick={() => setIsNavOpen(false)}
                >
                  <Icon size={22} />
                  <span className="font-medium text-base">{link.label}</span>
                  {showBadge && (
                    <span className={`ml-auto text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                      isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200/20">
            <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-gray-100/50 rounded-xl">
              <div className="w-10 h-10 gradient-purple rounded-full flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                {userEmail?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {userEmail}
                </span>
                <span className="text-xs text-gray-600">Administrador</span>
              </div>
            </div>
            <form action={logout}>
              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 text-sm font-medium active:bg-red-100 border border-red-200 touch-manipulation"
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
