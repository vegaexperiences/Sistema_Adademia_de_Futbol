'use client';

import { X, User } from 'lucide-react';
import { removePlayerFromSponsor } from '@/lib/actions/sponsors';
import { useState } from 'react';

interface Player {
  assignment_id?: string;
  id: string;
  first_name: string;
  last_name: string;
  cedula?: string;
  category?: string;
  assigned_at: string;
  notes?: string;
}

interface SponsorPlayersListProps {
  players: Player[];
  onRemove: () => void;
}

export function SponsorPlayersList({ players, onRemove }: SponsorPlayersListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (assignmentId: string) => {
    if (!assignmentId) return;

    setRemovingId(assignmentId);
    const result = await removePlayerFromSponsor(assignmentId);
    setRemovingId(null);

    if (result.success) {
      onRemove();
    } else {
      alert(`Error al remover jugador: ${result.error}`);
    }
  };

  if (!players || players.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <User className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p>No hay jugadores asignados a este padrino</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {players.map((player) => {
        const assignmentId = player.assignment_id;
        return (
          <div
            key={player.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {player.first_name} {player.last_name}
                  </h4>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-600">
                    {player.cedula && (
                      <span>Cédula: {player.cedula}</span>
                    )}
                    {player.category && (
                      <span>Categoría: {player.category}</span>
                    )}
                    <span>
                      Asignado: {new Date(player.assigned_at).toLocaleDateString('es-PA')}
                    </span>
                  </div>
                  {player.notes && (
                    <p className="text-sm text-gray-500 mt-1 italic">{player.notes}</p>
                  )}
                </div>
              </div>
            </div>
            {assignmentId && (
              <button
                onClick={() => handleRemove(assignmentId)}
                disabled={removingId === assignmentId}
                className="ml-4 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remover jugador"
              >
                {removingId === assignmentId ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                ) : (
                  <X className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

