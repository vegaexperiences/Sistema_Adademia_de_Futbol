'use client';

import { useState, useEffect } from 'react';
import { Search, User, Loader2, AlertCircle } from 'lucide-react';
import { searchByCedula, type PlayerSearchResult } from '@/lib/actions/payment-portal';
import Link from 'next/link';

export function PaymentSearch({ initialCedula }: { initialCedula?: string }) {
  const [cedula, setCedula] = useState(initialCedula || '');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlayerSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAutoSearched, setHasAutoSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cedula.trim()) {
      setError('Por favor ingresa una cédula');
      return;
    }

    setSearching(true);
    setError(null);
    setResults(null);

    try {
      const result = await searchByCedula(cedula.trim());
      
      if (result.error) {
        setError(result.error);
        setResults(null);
      } else if (!result.data || result.data.length === 0) {
        setError('No se encontraron jugadores con esa cédula');
        setResults(null);
      } else {
        setResults(result.data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error al buscar jugadores');
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  // Auto-search if initialCedula is provided
  useEffect(() => {
    if (initialCedula && initialCedula.trim() && !hasAutoSearched && !searching && !results && !error) {
      setHasAutoSearched(true);
      // Trigger search automatically
      const searchEvent = new Event('submit', { bubbles: true, cancelable: true });
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(searchEvent);
      } else {
        // Fallback: call handleSearch directly
        handleSearch(searchEvent as any);
      }
    }
  }, [initialCedula, hasAutoSearched, searching, results, error]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Pagos</h1>
        <p className="text-gray-600">
          Ingresa la cédula del jugador o del tutor para ver el estado de cuenta y realizar pagos.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Ingresa la cédula del jugador o tutor (ej: 8-1234-5678)"
            className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            disabled={searching}
          />
        </div>
        <button
          type="submit"
          disabled={searching || !cedula.trim()}
          className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {searching ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              Buscar
            </>
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Jugadores encontrados ({results.length})
          </h2>
          <div className="grid gap-4">
            {results.map((player) => (
              <div
                key={player.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {player.first_name} {player.last_name}
                        </h3>
                        {player.cedula && (
                          <p className="text-sm text-gray-600">Cédula: {player.cedula}</p>
                        )}
                      </div>
                    </div>
                    <div className="ml-15 space-y-1">
                      {player.category && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Categoría:</span> {player.category}
                        </p>
                      )}
                      {player.tutor_name && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Tutor:</span> {player.tutor_name}
                        </p>
                      )}
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        player.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : player.status === 'Scholarship'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {player.status === 'Active' ? 'Activo' : player.status === 'Scholarship' ? 'Becado' : player.status}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/pay/${player.id}`}
                    className="ml-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold whitespace-nowrap"
                  >
                    Ver Cuenta y Pagar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

