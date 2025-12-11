'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  LayoutDashboard, 
  Settings,
  FileText,
  CheckCircle,
  User,
  Trophy,
  TrendingUp,
  Mail
} from 'lucide-react';
import { useAcademy } from '@/contexts/AcademyContext';

interface SidebarNavProps {
  pendingCount: number;
}

export function SidebarNav({ pendingCount }: SidebarNavProps) {
  const pathname = usePathname();
  const { academy } = useAcademy();
  const [navLabels, setNavLabels] = useState({
    dashboard: 'Dashboard',
    approvals: 'Aprobaciones',
    players: 'Jugadores',
    finances: 'Finanzas',
    tournaments: 'Torneos',
    tutors: 'Tutores',
    families: 'Familias',
    reports: 'Reportes',
    emails: 'Correos',
    settings: 'Configuración',
  });

  useEffect(() => {
    if (academy?.settings?.navigation) {
      setNavLabels({
        dashboard: academy.settings.navigation.dashboard || 'Dashboard',
        approvals: academy.settings.navigation.approvals || 'Aprobaciones',
        players: academy.settings.navigation.players || 'Jugadores',
        finances: academy.settings.navigation.finances || 'Finanzas',
        tournaments: academy.settings.navigation.tournaments || 'Torneos',
        tutors: academy.settings.navigation.tutors || 'Tutores',
        families: academy.settings.navigation.families || 'Familias',
        reports: academy.settings.navigation.reports || 'Reportes',
        emails: academy.settings.navigation.emails || 'Correos',
        settings: academy.settings.navigation.settings || 'Configuración',
      });
    }
  }, [academy]);

  const navLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: navLabels.dashboard, exact: true },
    { href: '/dashboard/approvals', icon: CheckCircle, label: navLabels.approvals, badge: pendingCount },
    { href: '/dashboard/players', icon: Users, label: navLabels.players },
    { href: '/dashboard/finances', icon: TrendingUp, label: navLabels.finances },
    { href: '/dashboard/tournaments', icon: Trophy, label: navLabels.tournaments },
    { href: '/dashboard/tutors', icon: User, label: navLabels.tutors },
    { href: '/dashboard/families', icon: Users, label: navLabels.families },
    { href: '/dashboard/reports', icon: FileText, label: navLabels.reports },
    { href: '/dashboard/emails', icon: Mail, label: navLabels.emails },
    { href: '/dashboard/settings', icon: Settings, label: navLabels.settings },
  ];

  return (
    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const isActive = link.exact 
          ? pathname === link.href
          : pathname === link.href || pathname?.startsWith(`${link.href}/`);
        const showBadge = link.badge && link.badge > 0;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative ${
              isActive
                ? 'bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 text-white shadow-2xl shadow-purple-900/70 scale-[1.03] font-bold border-2 border-white/20 ring-4 ring-purple-500/30'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-600 hover:to-indigo-600 hover:text-white hover:shadow-lg hover:scale-[1.02]'
            }`}
          >
            <Icon 
              size={20} 
              className={`transition-transform duration-300 ${
                isActive ? 'scale-110' : 'group-hover:scale-110'
              }`} 
            />
            <span className="font-medium">{link.label}</span>
            {showBadge && (
              <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                isActive 
                  ? 'bg-red-500 text-white border-2 border-white shadow-lg' 
                  : 'bg-red-500 text-white'
              }`}>
                {link.badge! > 99 ? '99+' : link.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
