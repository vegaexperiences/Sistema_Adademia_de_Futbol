'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Calendar, CreditCard, FileText, User, X } from 'lucide-react';
import { createPayment } from '@/lib/actions/payments';
import { PagueloFacilPaymentButton } from './PagueloFacilPaymentButton';
import { YappyPaymentButton } from './YappyPaymentButton';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  category?: string | null;
  tutor_email?: string | null;
}

interface PaymentFormInlineProps {
  players: Player[];
  familyName: string;
  tutorEmail?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentFormInline({ players, familyName, tutorEmail, onSuccess, onCancel }: PaymentFormInlineProps) {
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
          payment_type: formData.payment_type,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
          month_year: formData.payment_type === 'monthly' ? formData.month_year : undefined,
          notes: formData.notes || undefined,
        });

        setSuccess(true);
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            router.refresh();
          }
          // Reset form
          setSelectedPlayerId('');
          setFormData({
            amount: '',
            payment_type: 'monthly',
            payment_method: 'cash',
            payment_date: new Date().toISOString().split('T')[0],
            month_year: '',
            notes: '',
          });
          setSuccess(false);
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Error al crear el pago');
      }
    });
  };


  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Registrar Nuevo Pago
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>

      {formData.payment_method === 'paguelofacil' && selectedPlayerId ? (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
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
            className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Volver y cambiar método de pago
          </button>
        </div>
      ) : formData.payment_method === 'yappy' && selectedPlayerId ? (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
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
                if (onSuccess) {
                  onSuccess();
                } else {
                  router.refresh();
                }
                // Reset form
                setSelectedPlayerId('');
                setFormData({
                  amount: '',
                  payment_type: 'monthly',
                  payment_method: 'cash',
                  payment_date: new Date().toISOString().split('T')[0],
                  month_year: '',
                  notes: '',
                });
                setSuccess(false);
              }, 1500);
            }}
            onError={(error) => setError('Error en Yappy: ' + error)}
          />
          <button
            type="button"
            onClick={() => setFormData({ ...formData, payment_method: 'cash' })}
            className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Volver y cambiar método de pago
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Player Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Jugador
            </label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              required
              className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all touch-manipulation text-base"
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
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Pago
            </label>
            <select
              value={formData.payment_type}
              onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as any })}
              required
              className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all touch-manipulation text-base"
            >
              <option value="monthly">Mensualidad</option>
              <option value="enrollment">Matrícula</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Month/Year for monthly payments */}
          {formData.payment_type === 'monthly' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Mes y Año
              </label>
              <input
                type="month"
                value={formData.month_year}
                onChange={(e) => setFormData({ ...formData, month_year: e.target.value })}
                required
                className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all touch-manipulation text-base"
              />
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all touch-manipulation text-base"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <CreditCard className="inline h-4 w-4 mr-1" />
              Método de Pago
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
              required
              className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all touch-manipulation text-base"
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
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Fecha de Pago
            </label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Notas (Opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Notas adicionales sobre el pago..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✅ Pago registrado exitosamente
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="flex-1 px-6 py-3 rounded-xl font-semibold border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isPending || success}
              className="flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
              }}
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
  );
}

