'use client';

import { useState, useMemo } from 'react';
import { Users, Search, Filter, User, Calendar, GraduationCap, CheckCircle, XCircle, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { retirePlayer } from '@/lib/actions/players';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  cedula: string | null;
  birth_date: string;
  gender: string;
  category: string | null;
  status: string;
  payment_status?: string | null;
  custom_monthly_fee?: number | null;
  discount_percent?: number | null;
}

type SortOption = 'name' | 'scholarship' | 'payment' | 'discount' | 'none';

interface PlayersListProps {
  players: Player[];
  initialView?: 'active' | 'retired';
}

export default function PlayersList({ players, initialView = 'active' }: PlayersListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'active' | 'retired'>(initialView);
  const [retiringId, setRetiringId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('none');
  const router = useRouter();
  
  // Count players by status
  // Note: getPlayers() returns all players including rejected/retired
  const activeCount = players?.filter(p => p.status === 'Active').length || 0;
  const scholarshipCount = players?.filter(p => p.status === 'Scholarship').length || 0;
  const rejectedCount = players?.filter(p => p.status === 'Rejected').length || 0;

  // Filter and sort players
  const filteredAndSortedPlayers = useMemo(() => {
    // First filter players based on view and search
    let filtered = players?.filter(player => {
      // Filter by view
      if (view === 'active') {
        // Show only Active and Scholarship
        if (!['Active', 'Scholarship'].includes(player.status)) {
          return false;
        }
      } else if (view === 'retired') {
        // Show only Rejected/Retired
        if (player.status !== 'Rejected') {
          return false;
        }
      }
      
      // Filter by search term
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          player.first_name?.toLowerCase().includes(search) ||
          player.last_name?.toLowerCase().includes(search) ||
          player.cedula?.toLowerCase().includes(search) ||
          `${player.first_name} ${player.last_name}`.toLowerCase().includes(search)
        );
      }
      
      return true;
    }) || [];

    // Then sort based on selected option
    if (sortBy !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        switch (sortBy) {
          case 'name':
            // Sort by full name (last name first, then first name)
            const nameA = `${a.last_name || ''} ${a.first_name || ''}`.trim().toLowerCase();
            const nameB = `${b.last_name || ''} ${b.first_name || ''}`.trim().toLowerCase();
            return nameA.localeCompare(nameB);
          
          case 'scholarship':
            // Sort: Scholarship first, then Active
            if (a.status === 'Scholarship' && b.status !== 'Scholarship') return -1;
            if (a.status !== 'Scholarship' && b.status === 'Scholarship') return 1;
            // If both same status, sort by name
            const nameA2 = `${a.last_name || ''} ${a.first_name || ''}`.trim().toLowerCase();
            const nameB2 = `${b.last_name || ''} ${b.first_name || ''}`.trim().toLowerCase();
            return nameA2.localeCompare(nameB2);
          
          case 'payment':
            // Sort: overdue first, then pending, then current
            const paymentOrder = { 'overdue': 0, 'pending': 1, 'current': 2 };
            const aPayment = paymentOrder[a.payment_status as keyof typeof paymentOrder] ?? 3;
            const bPayment = paymentOrder[b.payment_status as keyof typeof paymentOrder] ?? 3;
            if (aPayment !== bPayment) return aPayment - bPayment;
            // If same payment status, sort by name
            const nameA3 = `${a.last_name || ''} ${a.first_name || ''}`.trim().toLowerCase();
            const nameB3 = `${b.last_name || ''} ${b.first_name || ''}`.trim().toLowerCase();
            return nameA3.localeCompare(nameB3);
          
          case 'discount':
            // Sort: players with discount first (discount_percent > 0), then by discount amount descending
            const aDiscount = a.discount_percent || 0;
            const bDiscount = b.discount_percent || 0;
            if (aDiscount > 0 && bDiscount === 0) return -1;
            if (aDiscount === 0 && bDiscount > 0) return 1;
            if (aDiscount > 0 && bDiscount > 0) {
              // Both have discount, sort by amount descending
              return bDiscount - aDiscount;
            }
            // Neither has discount, sort by name
            const nameA4 = `${a.last_name || ''} ${a.first_name || ''}`.trim().toLowerCase();
            const nameB4 = `${b.last_name || ''} ${b.first_name || ''}`.trim().toLowerCase();
            return nameA4.localeCompare(nameB4);
          
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [players, view, searchTerm, sortBy]);

  const filteredPlayers = filteredAndSortedPlayers;

  const handleRetirePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`¿Estás seguro de que deseas retirar a ${playerName}? Esta acción cambiará su estado a "Retirado" pero no se borrará de la plataforma.`)) {
      return;
    }
    
    setRetiringId(playerId);
    try {
      const result = await retirePlayer(playerId);
      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        alert(result.message || 'Jugador retirado exitosamente');
        router.refresh();
      }
    } catch (error) {
      console.error('Error retiring player:', error);
      alert('Error al retirar jugador');
    } finally {
      setRetiringId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div className="p-2 sm:p-3 rounded-xl" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}>
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            ⚽ Jugadores
          </h1>
        </div>
        <p className="text-sm sm:text-base md:text-lg text-gray-600">
          Gestiona todos los jugadores de la academia
        </p>
      </div>

      {/* Tabs */}
      <div className="glass-card p-3 sm:p-4">
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setView('active')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-xl font-semibold text-sm sm:text-base transition-all border touch-manipulation ${
              view === 'active'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg border-transparent'
                : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
            }`}
          >
            Activos ({activeCount + scholarshipCount})
          </button>
          <button
            onClick={() => setView('retired')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-xl font-semibold text-sm sm:text-base transition-all border touch-manipulation ${
              view === 'retired'
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg border-transparent'
                : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
            }`}
          >
            Retirados/No Aprobados ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="glass-card p-4 sm:p-6 hover:shadow-xl transition-all duration-300 touch-manipulation">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}>
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-gray-600">Activos</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-6 hover:shadow-xl transition-all duration-300 touch-manipulation">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            }}>
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-gray-600">Becados</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{scholarshipCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-6 hover:shadow-xl transition-all duration-300 touch-manipulation">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            }}>
              <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-gray-600">Retirados</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{rejectedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 min-h-[48px] rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all touch-manipulation text-base"
            />
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full sm:w-auto pl-10 pr-10 py-3.5 min-h-[48px] rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all touch-manipulation text-base font-semibold appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1rem center',
                paddingRight: '2.5rem'
              }}
            >
              <option value="none">Ordenar por...</option>
              <option value="name">📝 Nombre</option>
              <option value="scholarship">🎓 Becado / No Becado</option>
              <option value="payment">💰 Al Día / Moroso</option>
              <option value="discount">🎁 Con Descuento</option>
            </select>
          </div>
        </div>
        {(searchTerm || sortBy !== 'none') && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {searchTerm && (
              <p className="text-sm text-gray-600">
                Mostrando {filteredPlayers.length} de {players.length} jugadores
              </p>
            )}
            {sortBy !== 'none' && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                Ordenado por: {
                  sortBy === 'name' ? 'Nombre' :
                  sortBy === 'scholarship' ? 'Becado / No Becado' :
                  sortBy === 'payment' ? 'Al Día / Moroso' :
                  sortBy === 'discount' ? 'Con Descuento' : ''
                }
              </span>
            )}
          </div>
        )}
      </div>

      {/* Players Grid */}
      <div className="grid gap-6">
        {filteredPlayers && filteredPlayers.length > 0 ? (
          filteredPlayers.map((player) => {
            // Determine card color based on player status
            let cardGradient = 'from-white to-gray-50'; // Default
            let cardBorder = 'border-gray-200'; // Default
            
            if (player.status === 'Scholarship') {
              // Yellow for scholarship players
              cardGradient = 'from-yellow-50 to-amber-50';
              cardBorder = 'border-yellow-300';
            } else if (player.payment_status === 'overdue') {
              // Red for overdue players
              cardGradient = 'from-red-50 to-rose-50';
              cardBorder = 'border-red-300';
            } else if (player.custom_monthly_fee !== null && player.custom_monthly_fee !== undefined) {
              // Light blue/cyan for players with custom fee
              cardGradient = 'from-cyan-50 to-sky-50';
              cardBorder = 'border-cyan-300';
            }
            
            return (
            <div 
              key={player.id} 
              className={`glass-card p-4 sm:p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] animate-slide-up bg-gradient-to-br ${cardGradient} border-l-4 ${cardBorder}`}
            >
              <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
                {/* Player Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/dashboard/players/${player.id}`}>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors cursor-pointer break-words">
                          {player.first_name} {player.last_name}
                        </h3>
                      </Link>
                      <div className="flex gap-2 flex-wrap">
                        {player.category && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
                            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                            color: '#1e3a8a'
                          }}>
                            📚 {player.category}
                          </span>
                        )}
                        {player.gender && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
                            background: player.gender === 'M' || player.gender === 'Masculino'
                              ? 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)'
                              : 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                            color: player.gender === 'M' || player.gender === 'Masculino' ? '#5b21b6' : '#be185d'
                          }}>
                            {(() => {
                              const isMale = player.gender === 'M' || player.gender === 'Masculino';
                              return isMale ? '👦 Masculino' : '👧 Femenino';
                            })()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${
                          player.status === 'Active'
                            ? 'badge-gradient-active'
                            : player.status === 'Scholarship'
                            ? 'badge-gradient-scholarship'
                            : player.status === 'Rejected'
                            ? 'badge-gradient-rejected'
                            : 'badge-gradient-pending'
                        }`}
                      >
                        {player.status === 'Active'
                          ? '✅ Activo'
                          : player.status === 'Scholarship'
                          ? '🎓 Becado'
                          : player.status === 'Rejected'
                          ? '⛔ Retirado'
                          : '⏳ Pendiente'}
                      </span>
                      {view === 'active' && player.status !== 'Rejected' && (
                        <button
                          onClick={() => handleRetirePlayer(player.id, `${player.first_name} ${player.last_name}`)}
                          disabled={retiringId === player.id}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                          }}
                          title="Retirar jugador de la plataforma"
                        >
                          <XCircle size={16} />
                          {retiringId === player.id ? 'Retirando...' : 'Retirar'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
                      <p className="text-xs font-semibold text-gray-600 mb-1">📅 Fecha de Nacimiento</p>
                      <p className="text-lg font-bold text-gray-900">
                        {player.birth_date ? new Date(player.birth_date).toLocaleDateString('es-ES') : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-purple-500">
                      <p className="text-xs font-semibold text-gray-600 mb-1">🆔 Cédula</p>
                      <p className="text-lg font-bold text-gray-900">{player.cedula || 'Sin cédula'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })
        ) : (
          <div className="glass-card p-12 text-center">
            <User className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron jugadores' : 'No hay jugadores'}
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 'Intenta con otro término de búsqueda' : 'Aún no se han registrado jugadores en el sistema.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
