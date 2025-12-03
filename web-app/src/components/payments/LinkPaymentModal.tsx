'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X, Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { linkPaymentToPlayer } from '@/lib/actions/payments';

interface Payment {
  id: string;
  amount: number;
  type: string;
  method: string | null;
  payment_date: string;
  notes: string | null;
  status: string | null;
}

interface LinkPaymentModalProps {
  payment: Payment;
  onClose: () => void;
}

export function LinkPaymentModal({ payment, onClose }: LinkPaymentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Error en la búsqueda');
      
      const data = await response.json();
      setSearchResults(data.players || []);
    } catch (err) {
      setError('Error al buscar jugadores');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = async () => {
    if (!selectedPlayer) return;

    setError(null);
    startTransition(async () => {
      try {
        const result = await linkPaymentToPlayer(payment.id, selectedPlayer.id);
        
        if (result?.error) {
          setError(result.error);
        } else {
          setSuccess(true);
          setTimeout(() => {
            router.refresh();
            onClose();
          }, 1500);
        }
      } catch (err: any) {
        setError(err.message || 'Error al vincular el pago');
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Vincular Pago
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Payment Info */}
          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            <p className="text-sm font-semibold text-gray-700 mb-2">Información del Pago</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Monto:</span>
                <span className="font-bold text-gray-900 ml-2">
                  ${Number(payment.amount).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Fecha:</span>
                <span className="font-bold text-gray-900 ml-2">
                  {new Date(payment.payment_date).toLocaleDateString('es-ES')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Método:</span>
                <span className="font-bold text-gray-900 ml-2">
                  {payment.method || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Tipo:</span>
                <span className="font-bold text-gray-900 ml-2">
                  {payment.type}
                </span>
              </div>
            </div>
            {payment.notes && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p className="text-xs text-gray-600">{payment.notes}</p>
              </div>
            )}
          </div>

          {success ? (
            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800 font-semibold">
                ¡Pago vinculado exitosamente!
              </p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Buscar Jugador
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Buscar por nombre, cédula o email..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
                  )}
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  {searchResults.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        selectedPlayer?.id === player.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {player.first_name} {player.last_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {player.cedula && `Cédula: ${player.cedula}`}
                            {player.email && ` • Email: ${player.email}`}
                          </p>
                        </div>
                        {selectedPlayer?.id === player.id && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Player */}
              {selectedPlayer && (
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Jugador Seleccionado:</p>
                  <p className="font-bold text-gray-900">
                    {selectedPlayer.first_name} {selectedPlayer.last_name}
                  </p>
                  {selectedPlayer.cedula && (
                    <p className="text-sm text-gray-600">Cédula: {selectedPlayer.cedula}</p>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLink}
                  disabled={!selectedPlayer || isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Vincular Pago
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

