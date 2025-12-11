'use client';

import { useState, useTransition } from 'react';
import { X, DollarSign, Calendar, CreditCard, FileText, User } from 'lucide-react';
import { createPayment } from '@/lib/actions/payments';
import { useRouter } from 'next/navigation';
import { PagueloFacilPaymentButton } from './PagueloFacilPaymentButton';
import { YappyPaymentButton } from './YappyPaymentButton';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  category?: string | null;
  family_id?: string | null;
  tutor_email?: string | null;
}

interface CreatePaymentModalProps {
  players: Player[];
  familyName: string;
  tutorEmail?: string | null;
  onClose: () => void;
}

export function CreatePaymentModal({ players, familyName, tutorEmail, onClose }: CreatePaymentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [formData, setFormData] = useState({
    amount: '',
    payment_type: 'monthly' as 'enrollment' | 'monthly' | 'custom',
    payment_method: 'cash' as 'cash' | 'transfer' | 'yappy' | 'card' | 'paguelofacil' | 'other',
    payment_date: new Date().toISOString().split('T')[0],
    month_year: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Filter to only show Active and Scholarship players
  const eligiblePlayers = players.filter(p => 
    p.status === 'Active' || p.status === 'Scholarship'
  );

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

    // If PagueloFacil or Yappy is selected, the payment will be handled by their respective buttons
    // which redirect to secure payment pages. The callback will handle the payment creation.
    if (formData.payment_method === 'paguelofacil' || formData.payment_method === 'yappy') {
      // Payment will be processed via redirect, no need to do anything here
      return;
    }

    // For other payment methods, proceed directly
    startTransition(async () => {
      try {
        await createPayment({
          player_id: selectedPlayerId,
          amount: parseFloat(formData.amount),
          type: formData.payment_type,
          method: formData.payment_method,
          payment_date: formData.payment_date,
          month_year: formData.payment_type === 'monthly' ? formData.month_year : undefined,
          notes: formData.notes || undefined,
        });

        setSuccess(true);
        setTimeout(() => {
          router.refresh();
          onClose();
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Error al crear el pago');
      }
    });
  };


  return (
    <div 
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300 sm:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-600" />
            Registrar Pago - Familia {familyName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {formData.payment_method === 'paguelofacil' && selectedPlayerId ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-4">
                  <strong>Jugador:</strong> {eligiblePlayers.find(p => p.id === selectedPlayerId)?.first_name || ''} {eligiblePlayers.find(p => p.id === selectedPlayerId)?.last_name || ''}<br />
                  <strong>Monto:</strong> ${parseFloat(formData.amount).toFixed(2)}<br />
                  <strong>Tipo:</strong> {formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago Personalizado'}
                </p>
              </div>
              <PagueloFacilPaymentButton
                amount={parseFloat(formData.amount)}
                description={`${formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago'} - ${eligiblePlayers.find(p => p.id === selectedPlayerId)?.first_name || ''} ${eligiblePlayers.find(p => p.id === selectedPlayerId)?.last_name || ''}`}
                email={tutorEmail || eligiblePlayers.find(p => p.id === selectedPlayerId)?.tutor_email || ''}
                orderId={`payment-${selectedPlayerId}-${Date.now()}`}
                returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/paguelofacil/callback?type=payment&playerId=${selectedPlayerId}&paymentType=${formData.payment_type}&amount=${formData.amount}&monthYear=${formData.month_year || ''}&notes=${encodeURIComponent(formData.notes || '')}`}
                customParams={{
                  type: 'payment',
                  playerId: selectedPlayerId,
                  paymentType: formData.payment_type,
                  amount: formData.amount,
                  monthYear: formData.month_year || '',
                  notes: formData.notes || '',
                }}
                onError={(error) => setError('Error en Paguelo Fácil: ' + error)}
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, payment_method: 'cash' })}
                className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                ← Volver y cambiar método de pago
              </button>
            </div>
          ) : formData.payment_method === 'yappy' && selectedPlayerId ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-4">
                  <strong>Jugador:</strong> {eligiblePlayers.find(p => p.id === selectedPlayerId)?.first_name || ''} {eligiblePlayers.find(p => p.id === selectedPlayerId)?.last_name || ''}<br />
                  <strong>Monto:</strong> ${parseFloat(formData.amount).toFixed(2)}<br />
                  <strong>Tipo:</strong> {formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago Personalizado'}
                </p>
              </div>
              <YappyPaymentButton
                amount={parseFloat(formData.amount)}
                description={`${formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago'} - ${eligiblePlayers.find(p => p.id === selectedPlayerId)?.first_name || ''} ${eligiblePlayers.find(p => p.id === selectedPlayerId)?.last_name || ''}`}
                orderId={`payment-${selectedPlayerId}-${Date.now()}`}
                returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/yappy/callback?type=payment&playerId=${selectedPlayerId}&paymentType=${formData.payment_type}&amount=${formData.amount}&monthYear=${formData.month_year || ''}&notes=${encodeURIComponent(formData.notes || '')}`}
                customParams={{
                  type: 'payment',
                  playerId: selectedPlayerId,
                  paymentType: formData.payment_type,
                  amount: formData.amount,
                  monthYear: formData.month_year || '',
                  notes: formData.notes || '',
                }}
                playerId={selectedPlayerId}
                paymentType={formData.payment_type}
                monthYear={formData.month_year}
                notes={formData.notes}
                onSuccess={async (transactionId: string) => {
                  setSuccess(true);
                  setTimeout(() => {
                    router.refresh();
                    onClose();
                  }, 1500);
                }}
                onError={(error) => setError('Error en Yappy: ' + error)}
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, payment_method: 'cash' })}
                className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                ← Volver y cambiar método de pago
              </button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Player Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Jugador
            </label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="">Selecciona un jugador</option>
              {eligiblePlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.first_name} {player.last_name}
                  {player.category ? ` - ${player.category}` : ''}
                  {player.status === 'Scholarship' ? ' (Becado)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de Pago
            </label>
            <select
              value={formData.payment_type}
              onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as any })}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="monthly">Mensualidad</option>
              <option value="enrollment">Matrícula</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Month/Year for monthly payments */}
          {formData.payment_type === 'monthly' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Mes y Año
              </label>
              <input
                type="month"
                value={formData.month_year}
                onChange={(e) => setFormData({ ...formData, month_year: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Monto
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <CreditCard className="inline h-4 w-4 mr-1" />
              Método de Pago
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="yappy">Yappy</option>
              <option value="paguelofacil">Paguelo Fácil</option>
              <option value="card">Tarjeta</option>
              <option value="other">Otro</option>
            </select>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Fecha de Pago
            </label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Notas (Opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Notas adicionales sobre el pago..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ Pago registrado exitosamente
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-6 py-3 rounded-xl font-semibold border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || success}
              className="flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-success shadow-lg shadow-green-500/30"
            >
              {isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Registrando...
                </>
              ) : success ? (
                '✓ Registrado'
              ) : (
                <>
                  <DollarSign size={20} />
                  Registrar Pago
                </>
              )}
            </button>
          </div>
        </form>
          )}
        </div>
      </div>
    </div>
  );
}

