'use client';

import { useState } from 'react';
import { Users, Search, Filter, User, Calendar, GraduationCap, CheckCircle, XCircle } from 'lucide-react';
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
}

interface PlayersListProps {
  players: Player[];
  initialView?: 'active' | 'retired';
}

export default function PlayersList({ players, initialView = 'active' }: PlayersListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'active' | 'retired'>(initialView);
  const [retiringId, setRetiringId] = useState<string | null>(null);
  const router = useRouter();
  
  // Count only approved players (exclude Pending - they're in approvals section)
  const activeCount = players?.filter(p => p.status === 'Active').length || 0;
  const scholarshipCount = players?.filter(p => p.status === 'Scholarship').length || 0;
  const rejectedCount = players?.filter(p => p.status === 'Rejected').length || 0;

  // Filter players based on view and search
  // Note: Pending players should NEVER appear here - they only appear in approvals
  const filteredPlayers = players?.filter(player => {
    // Always exclude Pending players from the players list
    if (player.status === 'Pending') {
      return false;
    }
    
    // Filter by view
    if (view === 'active') {
      // Show only Active and Scholarship (no Pending)
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}>
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            ⚽ Jugadores
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Gestiona todos los jugadores de la academia
        </p>
      </div>

      {/* Tabs */}
      <div className="glass-card p-4">
        <div className="flex gap-3">
          <button
            onClick={() => setView('active')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all border ${
              view === 'active'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg border-transparent'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Activos ({activeCount + scholarshipCount})
          </button>
          <button
            onClick={() => setView('retired')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all border ${
              view === 'retired'
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg border-transparent'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Retirados/No Aprobados ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}>
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Activos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            }}>
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Becados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{scholarshipCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            }}>
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Retirados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{rejectedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <button className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
          }}>
            <Filter size={18} />
            Filtros
          </button>
        </div>
        {searchTerm && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Mostrando {filteredPlayers.length} de {players.length} jugadores
          </p>
        )}
      </div>

      {/* Players Grid */}
      <div className="grid gap-6">
        {filteredPlayers && filteredPlayers.length > 0 ? (
          filteredPlayers.map((player) => (
            <div 
              key={player.id} 
              className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] animate-slide-up"
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Player Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Link href={`/dashboard/players/${player.id}`}>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
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
                            background: player.gender === 'M' 
                              ? 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)'
                              : 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                            color: player.gender === 'M' ? '#5b21b6' : '#be185d'
                          }}>
                            {player.gender === 'M' ? '👦' : '👧'} {player.gender === 'M' ? 'Masculino' : 'Femenino'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap"
                        style={{
                          background:
                            player.status === 'Active'
                          ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                          : player.status === 'Scholarship'
                          ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                              : player.status === 'Rejected'
                              ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
                          : 'linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%)',
                          color:
                            player.status === 'Active'
                          ? '#065f46'
                              : player.status === 'Scholarship'
                              ? '#1e3a8a'
                              : player.status === 'Rejected'
                              ? '#b91c1c'
                              : '#92400e',
                        }}
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
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border-l-4 border-blue-500">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">📅 Fecha de Nacimiento</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {player.birth_date ? new Date(player.birth_date).toLocaleDateString('es-ES') : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-l-4 border-purple-500">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">🆔 Cédula</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{player.cedula || 'Sin cédula'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card p-12 text-center">
            <User className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No se encontraron jugadores' : 'No hay jugadores'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Intenta con otro término de búsqueda' : 'Aún no se han registrado jugadores en el sistema.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
