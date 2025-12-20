'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, X, Users, Loader2 } from 'lucide-react';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  cedula: string | null;
  email: string | null;
  status: string;
}

interface PlayerSelectorProps {
  selectedPlayerIds: string[];
  onSelectionChange: (playerIds: string[]) => void;
}

export function PlayerSelector({ selectedPlayerIds, onSelectionChange }: PlayerSelectorProps) {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load all players on mount
  useEffect(() => {
    const fetchPlayers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/players/list');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('[PlayerSelector] API response:', {
          hasPlayers: !!data.players,
          playersCount: data.players?.length || 0,
          error: data.error,
          status: response.status,
          ok: response.ok
        });
        
        // Always set players, even if empty
        setAllPlayers(data.players || []);
        
        // Only show error if there's an explicit error message
        if (data.error && data.error !== 'No academy ID') {
          setError(data.error);
        } else if (data.players && data.players.length === 0) {
          // No error, just no players - this is normal
          setError(null);
        }
      } catch (error: any) {
        console.error('[PlayerSelector] Error fetching players:', error);
        setError(error?.message || 'Error al cargar jugadores');
        setAllPlayers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  // Update selected players when IDs change externally (e.g., form reset)
  useEffect(() => {
    // Update selected players list based on selected IDs
    const updated = allPlayers.filter((p) => selectedPlayerIds.includes(p.id));
    setSelectedPlayers(updated);
  }, [selectedPlayerIds, allPlayers]);

  const handleTogglePlayer = useCallback((player: Player) => {
    const isSelected = selectedPlayerIds.includes(player.id);
    let newSelection: string[];

    if (isSelected) {
      newSelection = selectedPlayerIds.filter((id) => id !== player.id);
      setSelectedPlayers((prev) => prev.filter((p) => p.id !== player.id));
    } else {
      newSelection = [...selectedPlayerIds, player.id];
      setSelectedPlayers((prev) => {
        if (prev.some((p) => p.id === player.id)) return prev;
        return [...prev, player];
      });
    }

    onSelectionChange(newSelection);
  }, [selectedPlayerIds, onSelectionChange]);

  const handleRemovePlayer = useCallback((playerId: string) => {
    const newSelection = selectedPlayerIds.filter((id) => id !== playerId);
    setSelectedPlayers((prev) => prev.filter((p) => p.id !== playerId));
    onSelectionChange(newSelection);
  }, [selectedPlayerIds, onSelectionChange]);

  // Get display info for selected players
  const getSelectedPlayerInfo = (playerId: string): Player | null => {
    return selectedPlayers.find((p) => p.id === playerId) || null;
  };

  return (
    <div className="space-y-4">
      {/* Selected Players Count */}
      {selectedPlayerIds.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
          <Users size={16} />
          <span className="font-medium">{selectedPlayerIds.length}</span>
          <span>jugador{selectedPlayerIds.length !== 1 ? 'es' : ''} seleccionado{selectedPlayerIds.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Selected Players List */}
      {selectedPlayerIds.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-32 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {selectedPlayerIds.map((playerId) => {
              const player = getSelectedPlayerInfo(playerId);
              const displayName = player
                ? `${player.first_name} ${player.last_name}`
                : `Jugador ${playerId.slice(0, 8)}...`;
              
              return (
                <span
                  key={playerId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                >
                  {displayName}
                  <button
                    type="button"
                    onClick={() => handleRemovePlayer(playerId)}
                    className="hover:bg-blue-200 rounded p-0.5 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-blue-600 h-6 w-6" />
          <span className="ml-2 text-gray-600">Cargando jugadores...</span>
        </div>
      )}

      {/* Players List with Checkboxes */}
      {!isLoading && allPlayers.length > 0 && (
        <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
          <div className="divide-y divide-gray-200">
            {allPlayers.map((player) => {
              const isSelected = selectedPlayerIds.includes(player.id);
              return (
                <label
                  key={player.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleTogglePlayer(player)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">
                      {player.first_name} {player.last_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {player.cedula && `Cédula: ${player.cedula}`}
                      {player.cedula && player.email && ' • '}
                      {player.email && `Email: ${player.email}`}
                      {player.status && (
                        <>
                          {(player.cedula || player.email) && ' • '}
                          Estado: {player.status}
                        </>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="text-blue-600 h-5 w-5" />
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <div className="text-red-600 text-sm font-medium mb-2">Error al cargar jugadores</div>
          <div className="text-gray-500 text-xs">{error}</div>
        </div>
      )}

      {/* No Players */}
      {!isLoading && !error && allPlayers.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 text-sm mb-2">No hay jugadores disponibles.</div>
          <div className="text-gray-400 text-xs">
            Verifica que haya jugadores registrados en la academia.
          </div>
        </div>
      )}
    </div>
  );
}



