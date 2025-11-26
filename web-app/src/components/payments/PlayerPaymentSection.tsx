'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, DollarSign, Plus, X, Calendar } from 'lucide-react';
import { createPayment } from '@/lib/actions/payments';
import PaymentHistory from './PaymentHistory';
import { PagueloFacilCheckoutInline } from './PagueloFacilCheckoutInline';

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
  const [showPagueloFacilCheckout, setShowPagueloFacilCheckout] = useState(false);
  const [pagueloFacilConfig, setPagueloFacilConfig] = useState<{ apiKey: string; cclw: string; sandbox: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    // If PagueloFacil is selected, open checkout
    if (formData.payment_method === 'paguelofacil') {
      try {
        const response = await fetch('/api/payments/paguelofacil');
        const data = await response.json();
        
        if (data.success && data.config) {
          setPagueloFacilConfig(data.config);
          setShowPagueloFacilCheckout(true);
        } else {
          setError('Error al inicializar Paguelo Fácil. Por favor intenta con otro método de pago.');
        }
      } catch (err: any) {
        setError('Error al inicializar Paguelo Fácil: ' + (err.message || 'Error desconocido'));
      }
      return;
    }

    // For other payment methods, proceed directly
    startTransition(async () => {
      try {
        await createPayment({
          player_id: playerId,
          amount: parseFloat(formData.amount),
          payment_type: formData.payment_type,
          payment_method: formData.payment_method,
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

  const handlePagueloFacilSuccess = async (transactionId: string, response: any) => {
    try {
      await createPayment({
        player_id: playerId,
        amount: parseFloat(formData.amount),
        payment_type: formData.payment_type,
        payment_method: 'paguelofacil',
        payment_date: new Date().toISOString().split('T')[0],
        month_year: formData.payment_type === 'monthly' ? formData.month_year : undefined,
        notes: `Pago procesado con Paguelo Fácil. Transaction ID: ${transactionId}. ${formData.notes || ''}`,
      });

      setShowPagueloFacilCheckout(false);
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
      setError('Error al registrar el pago: ' + (err.message || 'Error desconocido'));
      setShowPagueloFacilCheckout(false);
    }
  };

  const handlePagueloFacilError = (errorMsg: string) => {
    setError('Error en Paguelo Fácil: ' + errorMsg);
    setShowPagueloFacilCheckout(false);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Sistema de Pagos
        </h2>
        {!showPaymentForm && (
          <button
            onClick={() => setShowPaymentForm(true)}
            className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-500 dark:to-emerald-500"
          >
            <Plus size={20} />
            Registrar Pago
          </button>
        )}
      </div>

      {showPaymentForm && (
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Registrar Nuevo Pago
            </h3>
            <button
              onClick={() => setShowPaymentForm(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {showPagueloFacilCheckout && pagueloFacilConfig ? (
            <PagueloFacilCheckoutInline
              amount={parseFloat(formData.amount)}
              description={`${formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago'}`}
              email=""
              orderId={`payment-${playerId}-${Date.now()}`}
              apiKey={pagueloFacilConfig.apiKey}
              cclw={pagueloFacilConfig.cclw}
              sandbox={pagueloFacilConfig.sandbox}
              onSuccess={handlePagueloFacilSuccess}
              onError={handlePagueloFacilError}
              onBack={() => setShowPagueloFacilCheckout(false)}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
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
                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  📋 Tipo de Pago
                </label>
                <select
                  value={formData.payment_type}
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="monthly">Mensualidad</option>
                  <option value="enrollment">Matrícula</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              {/* Month/Year for monthly payments */}
              {formData.payment_type === 'monthly' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    📅 Mes/Año
                  </label>
                  <input
                    type="month"
                    required
                    value={formData.month_year}
                    onChange={(e) => setFormData({ ...formData, month_year: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  💳 Método de Pago
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  📆 Fecha de Pago
                </label>
                <input
                  type="date"
                  required
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  📝 Notas (Opcional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  placeholder="Información adicional sobre el pago..."
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
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  disabled={isPending}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || success}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-500 dark:to-emerald-500"
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

