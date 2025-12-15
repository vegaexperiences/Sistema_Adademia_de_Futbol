'use client';

import { useState, useEffect } from 'react';
import { Heart, UserPlus, Users, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { getSponsorRegistrationsWithPlayers } from '@/lib/actions/sponsors';
import { AssignPlayerToSponsorModal } from './AssignPlayerToSponsorModal';
import { SponsorPlayersList } from './SponsorPlayersList';
import type { SponsorRegistrationWithPlayers } from '@/lib/actions/sponsors';

export function SponsorManagement() {
  const [sponsors, setSponsors] = useState<SponsorRegistrationWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedSponsors, setExpandedSponsors] = useState<Set<string>>(new Set());
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<SponsorRegistrationWithPlayers | null>(null);

  useEffect(() => {
    loadSponsors();
  }, []);

  const loadSponsors = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSponsorRegistrationsWithPlayers();
      if (result.error) {
        setError(result.error);
      } else {
        setSponsors(result.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar padrinos');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (sponsorId: string) => {
    const newExpanded = new Set(expandedSponsors);
    if (newExpanded.has(sponsorId)) {
      newExpanded.delete(sponsorId);
    } else {
      newExpanded.add(sponsorId);
    }
    setExpandedSponsors(newExpanded);
  };

  const handleAssignClick = (sponsor: SponsorRegistrationWithPlayers) => {
    setSelectedSponsor(sponsor);
    setAssignModalOpen(true);
  };

  const handleAssignSuccess = () => {
    loadSponsors();
    if (selectedSponsor) {
      // Expand the sponsor to show the new player
      setExpandedSponsors(new Set([...expandedSponsors, selectedSponsor.id]));
    }
  };

  const handleRemovePlayer = () => {
    loadSponsors();
  };

  const filteredSponsors = sponsors.filter((sponsor) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const nameMatch = sponsor.sponsor_name?.toLowerCase().includes(search);
      const emailMatch = sponsor.sponsor_email?.toLowerCase().includes(search);
      const levelMatch = sponsor.sponsors?.name?.toLowerCase().includes(search);
      if (!nameMatch && !emailMatch && !levelMatch) return false;
    }
    if (statusFilter !== 'all' && sponsor.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      pending: { text: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
      approved: { text: 'Aprobado', color: 'bg-green-100 text-green-800' },
      cancelled: { text: 'Cancelado', color: 'bg-red-100 text-red-800' },
    };
    return labels[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o nivel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sponsors List */}
      <div className="space-y-4">
        {filteredSponsors.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Heart className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No se encontraron padrinos</p>
          </div>
        ) : (
          filteredSponsors.map((sponsor) => {
            const isExpanded = expandedSponsors.has(sponsor.id);
            const statusInfo = getStatusLabel(sponsor.status);
            const players = sponsor.players || [];

            return (
              <div key={sponsor.id} className="glass-card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                        <Heart className="h-6 w-6 text-pink-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {sponsor.sponsor_name}
                        </h3>
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-600">
                          {sponsor.sponsor_email && (
                            <span>{sponsor.sponsor_email}</span>
                          )}
                          {sponsor.sponsors && (
                            <span className="font-semibold">
                              Nivel: {sponsor.sponsors.name}
                            </span>
                          )}
                          <span>
                            Registrado: {new Date(sponsor.created_at).toLocaleDateString('es-PA')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                      <span className="text-sm text-gray-600">
                        {players.length} jugador{players.length !== 1 ? 'es' : ''} asignado{players.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAssignClick(sponsor)}
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all font-medium flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Asignar Jugador
                    </button>
                    {players.length > 0 && (
                      <button
                        onClick={() => toggleExpand(sponsor.id)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Players List (Expandable) */}
                {isExpanded && players.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Jugadores Asignados
                    </h4>
                    <SponsorPlayersList
                      players={players}
                      onRemove={handleRemovePlayer}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Assign Player Modal */}
      {selectedSponsor && (
        <AssignPlayerToSponsorModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedSponsor(null);
          }}
          sponsorRegistrationId={selectedSponsor.id}
          sponsorName={selectedSponsor.sponsor_name}
          existingPlayerIds={(selectedSponsor.players || []).map((p) => p.id)}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
}

