'use client';

import { useState, useEffect } from 'react';
import { X, Search, User, Loader2 } from 'lucide-react';
import { getAllPlayers } from '@/lib/actions/players';
import { assignPlayerToSponsor } from '@/lib/actions/sponsors';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  cedula?: string;
  category?: string;
}

interface AssignPlayerToSponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sponsorRegistrationId: string;
  sponsorName: string;
  existingPlayerIds: string[]; // IDs of players already assigned
  onSuccess: () => void;
}

export function AssignPlayerToSponsorModal({
  isOpen,
  onClose,
  sponsorRegistrationId,
  sponsorName,
  existingPlayerIds,
  onSuccess,
}: AssignPlayerToSponsorModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPlayers();
    } else {
      // Reset state when modal closes
      setSearchTerm('');
      setSelectedPlayerId(null);
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const playersData = await getPlayers();
      if (Array.isArray(playersData)) {
        // Filter out already assigned players
        const availablePlayers = playersData.filter(
          (p: any) => !existingPlayerIds.includes(p.id)
        );
        setPlayers(availablePlayers);
      } else {
        setError('Error al cargar jugadores');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar jugadores');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter((player) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const fullName = `${player.first_name} ${player.last_name}`.toLowerCase();
    const cedula = player.cedula?.toLowerCase() || '';
    return fullName.includes(search) || cedula.includes(search);
  });

  const handleAssign = async () => {
    if (!selectedPlayerId) {
      setError('Por favor selecciona un jugador');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await assignPlayerToSponsor(
        sponsorRegistrationId,
        selectedPlayerId,
        notes || undefined
      );

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Error al asignar jugador');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Asignar Jugador a {sponsorName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          {/* Players List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-pink-600 animate-spin" />
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>
                {searchTerm
                  ? 'No se encontraron jugadores con ese criterio'
                  : 'No hay jugadores disponibles para asignar'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedPlayerId === player.id
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedPlayerId === player.id
                          ? 'border-pink-500 bg-pink-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedPlayerId === player.id && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {player.first_name} {player.last_name}
                      </h4>
                      <div className="flex gap-3 mt-1 text-sm text-gray-600">
                        {player.cedula && <span>Cédula: {player.cedula}</span>}
                        {player.category && <span>Categoría: {player.category}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Notes */}
          {selectedPlayerId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agregar notas sobre esta asignación..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedPlayerId || submitting}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Asignando...
              </span>
            ) : (
              'Asignar Jugador'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

