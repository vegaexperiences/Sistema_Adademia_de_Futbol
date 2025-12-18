import { createClient } from '@/lib/supabase/server';
import { Users, CheckCircle, Clock, GraduationCap, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Get stats - single-tenant (no academy filtering)
  const { data: players } = await supabase
    .from('players')
    .select('status, family_id');
  
  const { data: families } = await supabase
    .from('families')
    .select('id, players(status)');
  
  const { data: pendingPlayersData } = await supabase
    .from('pending_players')
    .select('id');
  
  // Only count approved players (Active or Scholarship) for total
  // Note: players table now only contains Active/Scholarship players
  const totalPlayers = players?.length || 0;
  const activePlayers = players?.filter(p => p.status === 'Active').length || 0;
  const pendingPlayers = pendingPlayersData?.length || 0;
  const scholarships = players?.filter(p => p.status === 'Scholarship').length || 0;
  
  // Only count families with at least one approved player
  const totalFamilies = families?.filter(family => {
    const approvedPlayers = family.players?.filter((p: any) => 
      p.status === 'Active' || p.status === 'Scholarship'
    ) || [];
    return approvedPlayers.length > 0;
  }).length || 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="glass-card p-4 sm:p-6 md:p-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          ⚽ Dashboard - SUAREZ ACADEMY
        </h1>
        <p className="text-base sm:text-lg text-gray-600">
          Bienvenido al panel de administración
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Players */}
        <div className="glass-card p-4 sm:p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-slide-up touch-manipulation">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-xl icon-bg-purple">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            {totalPlayers}
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-gray-600">
            Total Jugadores
          </p>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs font-bold px-2 py-1 rounded-full badge-gradient-active">
              📊 Activos
            </span>
          </div>
        </div>

        {/* Active Players */}
        <div className="glass-card p-4 sm:p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-slide-up touch-manipulation" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-xl icon-bg-green">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            {activePlayers}
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-gray-600">
            Jugadores Activos
          </p>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs font-bold px-2 py-1 rounded-full badge-gradient-active">
              ✅ Aprobados
            </span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="glass-card p-4 sm:p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-slide-up touch-manipulation" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-xl icon-bg-orange">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            {pendingPlayers > 0 && (
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                {pendingPlayers}
              </span>
            )}
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            {pendingPlayers}
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-gray-600">
            Aprobaciones Pendientes
          </p>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs font-bold px-2 py-1 rounded-full badge-gradient-pending">
              ⏳ En espera
            </span>
          </div>
        </div>

        {/* Scholarships */}
        <div className="glass-card p-4 sm:p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-slide-up touch-manipulation" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-xl icon-bg-blue">
              <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            {scholarships}
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-gray-600">
            Becados
          </p>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs font-bold px-2 py-1 rounded-full badge-gradient-scholarship">
              🎓 Especial
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
          🚀 Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Link href="/dashboard/approvals" className="group p-4 sm:p-6 rounded-xl transition-all duration-300 active:scale-95 hover:scale-105 hover:shadow-xl touch-manipulation min-h-[120px] flex flex-col justify-between gradient-orange text-white">
            <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-white mb-2 sm:mb-3" />
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Revisar Aprobaciones</h3>
              <p className="text-white/90 text-xs sm:text-sm">
                {pendingPlayers} solicitudes esperando aprobación
              </p>
            </div>
          </Link>

          <Link href="/dashboard/players" className="group p-4 sm:p-6 rounded-xl transition-all duration-300 active:scale-95 hover:scale-105 hover:shadow-xl touch-manipulation min-h-[120px] flex flex-col justify-between gradient-purple text-white">
            <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white mb-2 sm:mb-3" />
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Ver Jugadores</h3>
              <p className="text-white/90 text-xs sm:text-sm">
                Gestionar {totalPlayers} jugadores registrados
              </p>
            </div>
          </Link>

          <Link href="/dashboard/families" className="group p-4 sm:p-6 rounded-xl transition-all duration-300 active:scale-95 hover:scale-105 hover:shadow-xl touch-manipulation min-h-[120px] flex flex-col justify-between sm:col-span-2 lg:col-span-1 gradient-green text-white">
            <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white mb-2 sm:mb-3" />
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Ver Familias</h3>
              <p className="text-white/90 text-xs sm:text-sm">
                {totalFamilies} familias registradas
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
