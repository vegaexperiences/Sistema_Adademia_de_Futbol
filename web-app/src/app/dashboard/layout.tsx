import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Users, 
  CreditCard, 
  LayoutDashboard, 
  LogOut, 
  Settings,
  FileText,
  CheckCircle,
  User,
  Trophy,
  DollarSign,
  TrendingUp,
  Mail
} from 'lucide-react';
import { logout } from '@/app/auth/actions';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { getPendingPlayersCount } from '@/lib/actions/approvals';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const pendingCount = await getPendingPlayersCount();

  return (
    <div className="min-h-screen flex">
      {/* Mobile Header */}
      <MobileHeader userEmail={user.email || ''} pendingCount={pendingCount} />

      {/* Sidebar with Glass Effect */}
      <aside className="w-64 glass-card m-4 p-0 hidden md:flex flex-col animate-slide-up overflow-hidden">
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200/20 dark:border-gray-700/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative w-12 h-12 bg-transparent">
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
            <span className="text-gray-900 dark:text-white font-bold text-xl">SUAREZ ACADEMY</span>
          </div>
          <ThemeToggle />
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link
            href="/dashboard"
            className="group flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:gradient-purple hover:text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
          >
            <LayoutDashboard size={20} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-medium">Dashboard</span>
          </Link>

          <Link
            href="/dashboard/approvals"
            className="group flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:gradient-purple hover:text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02] relative"
          >
            <CheckCircle size={20} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-medium">Aprobaciones</span>
            {pendingCount > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </Link>
          
          <Link
            href="/dashboard/players"
            className="group flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:gradient-purple hover:text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
          >
            <Users size={20} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-medium">Jugadores</span>
          </Link>

          <Link
            href="/dashboard/finances"
            className="group flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:gradient-purple hover:text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
          >
            <TrendingUp size={20} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-medium">Finanzas</span>
          </Link>
          
          <Link
            href="/dashboard/tournaments"
            className="group flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:gradient-purple hover:text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
          >
            <Trophy size={20} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-medium">Torneos</span>
          </Link>

          <Link
            href="/dashboard/tutors"
            className="group flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:gradient-purple hover:text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
          >
            <User size={20} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-medium">Tutores</span>
          </Link>

          <Link
            href="/dashboard/families"
            className="group flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:gradient-purple hover:text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
          >
            <Users size={20} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-medium">Familias</span>
          </Link>
          
          <Link
            href="/dashboard/reports"
            className="group flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:gradient-purple hover:text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
          >
            <FileText size={20} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-medium">Reportes</span>
          </Link>

          <Link
            href="/dashboard/emails"
            className="group flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:gradient-purple hover:text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
          >
            <Mail size={20} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-medium">Correos</span>
          </Link>

          <Link
            href="/dashboard/settings"
            className="group flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:gradient-purple hover:text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
          >
            <Settings size={20} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-medium">Configuración</span>
          </Link>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200/20 dark:border-gray-700/50">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl">
            <div className="w-10 h-10 gradient-purple rounded-full flex items-center justify-center text-white font-bold shadow-lg">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.email}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Administrador</span>
            </div>
          </div>
          <form action={logout}>
            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-300 text-sm font-medium hover:shadow-md border border-red-200 dark:border-red-800"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:px-8 md:pb-8 md:pt-4 md:mt-4 pt-20 safe-area-top min-h-screen">
        <div className="animate-fade-in max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
