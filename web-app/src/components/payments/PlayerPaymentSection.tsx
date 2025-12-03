'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, DollarSign, Plus, X, Calendar } from 'lucide-react';
import { createPayment, autoLinkUnlinkedPaymentsForPlayer } from '@/lib/actions/payments';
import PaymentHistory from './PaymentHistory';
import { PagueloFacilPaymentButton } from './PagueloFacilPaymentButton';
import { YappyPaymentButton } from './YappyPaymentButton';

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_method: string | null;
  payment_date: string;
  month_year: string | null;
  notes: string | null;
}

interface PlayerPaymentSectionProps {
  playerId: string;
  suggestedAmount: number;
  payments: Payment[];
}

export function PlayerPaymentSection({ playerId, suggestedAmount, payments }: PlayerPaymentSectionProps) {
  const router = useRouter();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    amount: suggestedAmount.toString(),
    payment_type: 'monthly' as 'enrollment' | 'monthly' | 'custom',
    payment_method: 'cash' as 'cash' | 'transfer' | 'yappy' | 'card' | 'paguelofacil' | 'other',
    payment_date: new Date().toISOString().split('T')[0],
    month_year: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [autoLinking, setAutoLinking] = useState(false);

  // Auto-link unlinked payments when component mounts or payments change
  useEffect(() => {
    // Only try to auto-link if we have no payments (might indicate unlinked payments exist)
    if (payments.length === 0 && !autoLinking) {
      setAutoLinking(true);
      autoLinkUnlinkedPaymentsForPlayer(playerId)
        .then((result) => {
          if (result.success && result.linked && result.linked > 0) {
            console.log('[PlayerPaymentSection] Auto-linked payments, refreshing...', result);
            router.refresh();
          }
          setAutoLinking(false);
        })
        .catch((error) => {
          console.error('[PlayerPaymentSection] Error auto-linking payments:', error);
          setAutoLinking(false);
        });
    }
  }, [playerId, payments.length, router, autoLinking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    // If PagueloFacil is selected, the payment will be handled by PagueloFacilPaymentButton
    // which redirects to Paguelo Fácil's secure page. The callback will handle the payment creation.
    if (formData.payment_method === 'paguelofacil') {
      // Payment will be processed via redirect, no need to do anything here
      return;
    }

    // For other payment methods, proceed directly
    startTransition(async () => {
      try {
        await createPayment({
          player_id: playerId,
          amount: parseFloat(formData.amount),
          type: formData.payment_type,
          method: formData.payment_method,
          payment_date: formData.payment_date,
          month_year: formData.payment_type === 'monthly' ? formData.month_year : undefined,
          notes: formData.notes || undefined
        });

        setSuccess(true);
        setTimeout(() => {
          router.refresh();
          setShowPaymentForm(false);
          setFormData({
            amount: suggestedAmount.toString(),
            payment_type: 'monthly',
            payment_method: 'cash',
            payment_date: new Date().toISOString().split('T')[0],
            month_year: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
            notes: ''
          });
          setSuccess(false);
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Error al crear el pago');
      }
    });
  };


  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Sistema de Pagos
        </h2>
        {!showPaymentForm && (
          <button
            onClick={() => setShowPaymentForm(true)}
            className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600"
          >
            <Plus size={20} />
            Registrar Pago
          </button>
        )}
      </div>

      {showPaymentForm && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Registrar Nuevo Pago
            </h3>
            <button
              onClick={() => setShowPaymentForm(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {formData.payment_method === 'paguelofacil' ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-4">
                  <strong>Monto:</strong> ${parseFloat(formData.amount).toFixed(2)}<br />
                  <strong>Tipo:</strong> {formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago Personalizado'}
                </p>
              </div>
              <PagueloFacilPaymentButton
                amount={parseFloat(formData.amount)}
                description={`${formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago'} - Jugador ID: ${playerId}`}
                email=""
                orderId={`payment-${playerId}-${Date.now()}`}
                returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/paguelofacil/callback?type=payment&playerId=${playerId}&paymentType=${formData.payment_type}&amount=${formData.amount}&monthYear=${formData.month_year || ''}&notes=${encodeURIComponent(formData.notes || '')}`}
                customParams={{
                  type: 'payment',
                  playerId: playerId,
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
          ) : formData.payment_method === 'yappy' ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-4">
                  <strong>Monto:</strong> ${parseFloat(formData.amount).toFixed(2)}<br />
                  <strong>Tipo:</strong> {formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago Personalizado'}
                </p>
              </div>
              <YappyPaymentButton
                amount={parseFloat(formData.amount)}
                description={`${formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago'} - Jugador ID: ${playerId}`}
                orderId={`payment-${playerId}-${Date.now()}`}
                returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/yappy/callback?type=payment&playerId=${playerId}&paymentType=${formData.payment_type}&amount=${formData.amount}&monthYear=${formData.month_year || ''}&notes=${encodeURIComponent(formData.notes || '')}`}
                customParams={{
                  type: 'payment',
                  playerId: playerId,
                  paymentType: formData.payment_type,
                  amount: formData.amount,
                  monthYear: formData.month_year || '',
                  notes: formData.notes || '',
                }}
                playerId={playerId}
                paymentType={formData.payment_type}
                monthYear={formData.month_year}
                notes={formData.notes}
                onSuccess={async (transactionId: string) => {
                  setSuccess(true);
                  setTimeout(() => {
                    router.refresh();
                    setShowPaymentForm(false);
                    setFormData({
                      amount: suggestedAmount.toString(),
                      payment_type: 'monthly',
                      payment_method: 'cash',
                      payment_date: new Date().toISOString().split('T')[0],
                      month_year: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
                      notes: ''
                    });
                    setSuccess(false);
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
              {/* Amount */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  💵 Monto
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📋 Tipo de Pago
                </label>
                <select
                  value={formData.payment_type}
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as any })}
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    📅 Mes/Año
                  </label>
                  <input
                    type="month"
                    required
                    value={formData.month_year}
                    onChange={(e) => setFormData({ ...formData, month_year: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  💳 Método de Pago
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
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
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📆 Fecha de Pago
                </label>
                <input
                  type="date"
                  required
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📝 Notas (Opcional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  placeholder="Información adicional sobre el pago..."
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
                  onClick={() => setShowPaymentForm(false)}
                  disabled={isPending}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || success}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-600 to-emerald-600"
                >
                  {isPending ? 'Guardando...' : 'Guardar Pago'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!showPaymentForm && <PaymentHistory payments={payments} />}
    </div>
  );
}

