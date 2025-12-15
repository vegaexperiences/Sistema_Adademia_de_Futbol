'use client';

import { useState, useTransition, useRef } from 'react';
import { X, DollarSign, Search, User, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createAdvancePayment } from '@/lib/actions/payments';
import { useRouter } from 'next/navigation';
import { getPlayers } from '@/lib/actions/players';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  cedula: string | null;
  category: string | null;
  status: string;
}

interface AdvancePaymentFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdvancePaymentForm({ onClose, onSuccess }: AdvancePaymentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'cash' as 'cash' | 'transfer' | 'yappy' | 'paguelofacil' | 'ach' | 'other',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setError('Ingresa al menos 2 caracteres para buscar');
      return;
    }

    setSearching(true);
    setError(null);
    setPlayers([]);

    try {
      const playersData = await getPlayers();
      
      if (!playersData || playersData.length === 0) {
        setError('No se encontraron jugadores');
        return;
      }

      const search = searchTerm.toLowerCase().trim();
      const filtered = playersData.filter((player: Player) => {
        const fullName = `${player.first_name} ${player.last_name}`.toLowerCase();
        const cedula = player.cedula?.toLowerCase() || '';
        return (
          fullName.includes(search) ||
          cedula.includes(search) ||
          player.first_name.toLowerCase().includes(search) ||
          player.last_name.toLowerCase().includes(search)
        );
      });

      if (filtered.length === 0) {
        setError('No se encontraron jugadores con ese criterio');
      } else {
        setPlayers(filtered.slice(0, 10)); // Limit to 10 results
      }
    } catch (err: any) {
      setError(err.message || 'Error al buscar jugadores');
    } finally {
      setSearching(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }
      setProofFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!selectedPlayerId) {
      setError('Debes seleccionar un jugador');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if ((formData.payment_method === 'transfer' || formData.payment_method === 'cash') && !proofFile) {
      setError('Por favor sube un comprobante de pago');
      return;
    }

    setUploading(true);

    try {
      // Upload proof file if provided
      let proofUrl: string | undefined;
      if (proofFile) {
        const { uploadFile } = await import('@/lib/utils/file-upload');
        const uploadResult = await uploadFile(proofFile, `payments/proofs/advance/${selectedPlayerId}/${Date.now()}-${proofFile.name}`);
        if (uploadResult.error) {
          setError(`Error al subir el comprobante: ${uploadResult.error}`);
          setUploading(false);
          return;
        }
        proofUrl = uploadResult.url || undefined;
      }

      startTransition(async () => {
        try {
          const result = await createAdvancePayment({
            player_id: selectedPlayerId,
            amount: parseFloat(formData.amount),
            method: formData.payment_method,
            payment_date: formData.payment_date,
            notes: formData.notes || undefined,
            proof_url: proofUrl,
          });

          if (result.error) {
            setError(result.error);
          } else {
            setSuccess(true);
            setTimeout(() => {
              router.refresh();
              if (onSuccess) {
                onSuccess();
              }
              onClose();
            }, 1500);
          }
        } catch (err: any) {
          setError(err.message || 'Error al crear el pago adelantado');
        } finally {
          setUploading(false);
        }
      });
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago');
      setUploading(false);
    }
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  return (
    <div 
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pago Adelantado a Jugador</h2>
            <p className="text-sm text-gray-600 mt-1">
              Crea un pago adelantado que se aplicará como crédito para futuros cargos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900">¡Pago adelantado creado exitosamente!</p>
                <p className="text-sm text-green-800">El crédito se aplicará automáticamente a futuros cargos.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 mb-2">
              <strong>💡 ¿Cómo funciona el pago adelantado?</strong>
            </p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Este pago se aplicará como crédito a la cuenta del jugador</li>
              <li>El crédito se usará automáticamente para futuros cargos mensuales</li>
              <li>El balance del jugador puede quedar negativo (esto indica crédito disponible)</li>
            </ul>
          </div>

          {/* Player Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Jugador <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(e as any);
                    }
                  }}
                  placeholder="Buscar por nombre o cédula..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching || !searchTerm.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {searching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Buscar
                  </>
                )}
              </button>
            </div>

            {/* Search Results */}
            {players.length > 0 && (
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPlayerId === player.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedPlayerId(player.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedPlayerId === player.id
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedPlayerId === player.id && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <User className="h-5 w-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {player.first_name} {player.last_name}
                        </p>
                        <div className="flex gap-3 text-sm text-gray-600">
                          {player.cedula && <span>Cédula: {player.cedula}</span>}
                          {player.category && <span>Categoría: {player.category}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedPlayer && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-900">
                  Jugador seleccionado: {selectedPlayer.first_name} {selectedPlayer.last_name}
                </p>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pago <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => {
                setFormData({ ...formData, payment_method: e.target.value as any });
                setProofFile(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia Bancaria</option>
              <option value="ach">ACH</option>
              <option value="other">Otro</option>
            </select>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Pago <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Proof Upload */}
          {(formData.payment_method === 'transfer' || formData.payment_method === 'cash') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comprobante de Pago <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              {proofFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Archivo seleccionado: {proofFile.name}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Información adicional sobre el pago..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || uploading || !selectedPlayerId || !formData.amount}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {(isPending || uploading) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4" />
                  Crear Pago Adelantado
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

