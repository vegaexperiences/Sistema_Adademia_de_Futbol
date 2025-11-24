'use client';

import { useState, useEffect } from 'react';
import { getTournaments, updateTournamentStatus, deleteTournament, toggleRegistration } from '@/lib/actions/tournaments';
import CreateTournamentModal from '@/components/tournaments/CreateTournamentModal';
import { Trophy, Plus, Calendar, MapPin, Users, Trash2, Power, CheckCircle, XCircle } from 'lucide-react';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTournaments = async () => {
    try {
      const data = await getTournaments();
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [isModalOpen]); // Refresh when modal closes (after creation)

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    if (!confirm('¿Estás seguro de cambiar el estado del torneo?')) return;
    
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await updateTournamentStatus(id, newStatus);
      fetchTournaments();
    } catch (error) {
      alert('Error al actualizar estado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este torneo? Esta acción no se puede deshacer.')) return;
    
    try {
      await deleteTournament(id);
      fetchTournaments();
    } catch (error) {
      alert('Error al eliminar torneo');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Torneos
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Gestiona los torneos y sus inscripciones
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          <Plus size={20} />
          Crear Torneo
        </button>
      </div>

      {/* Tournaments List */}
      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : tournaments.length > 0 ? (
          tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className={`glass-card p-6 border-l-4 ${
                tournament.status === 'active' ? 'border-green-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tournament.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                      tournament.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {tournament.status === 'active' ? (
                        <><CheckCircle size={12} /> ACTIVO</>
                      ) : (
                        <><XCircle size={12} /> INACTIVO</>
                      )}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {tournament.description}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      {tournament.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={16} />
                      {tournament.categories?.length || 0} Categorías
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tournament.categories?.map((cat: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-md font-medium">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-4 md:pt-0 md:pl-6">
                  <button
                    onClick={() => handleStatusToggle(tournament.id, tournament.status)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                      tournament.status === 'active'
                        ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                    }`}
                  >
                    <Power size={18} />
                    {tournament.status === 'active' ? 'Desactivar' : 'Activar'}
                  </button>
                  
                  <button
                    onClick={() => handleDelete(tournament.id)}
                    className="px-4 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 glass-card">
            <Trophy className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No hay torneos creados
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Crea tu primer torneo para comenzar a recibir inscripciones.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Plus size={20} />
              Crear Torneo
            </button>
          </div>
        )}
      </div>

      <CreateTournamentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
