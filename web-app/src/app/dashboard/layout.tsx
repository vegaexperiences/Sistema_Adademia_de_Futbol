import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { logout } from '@/app/auth/actions';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { SidebarNav } from '@/components/layout/SidebarNav';
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
        <div className="p-6 border-b border-gray-200/20">
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
            <span className="text-gray-900 font-bold text-xl">SUAREZ ACADEMY</span>
          </div>
        </div>
        
        {/* Navigation */}
        <SidebarNav pendingCount={pendingCount} />

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200/20">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-gray-100/50 rounded-xl">
            <div className="w-10 h-10 gradient-purple rounded-full flex items-center justify-center text-white font-bold shadow-lg">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-gray-900 truncate">{user.email}</span>
              <span className="text-xs text-gray-600">Administrador</span>
            </div>
          </div>
          <form action={logout}>
            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 text-sm font-medium hover:shadow-md border border-red-200"
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
