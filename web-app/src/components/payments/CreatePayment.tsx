'use client';

import { useState } from 'react';
import { createPayment } from '@/lib/actions/payments';
import { Plus, X } from 'lucide-react';
import { PagueloFacilPaymentButton } from './PagueloFacilPaymentButton';
import { YappyPaymentButton } from './YappyPaymentButton';
import { useRouter } from 'next/navigation';

interface CreatePaymentProps {
  playerId: string;
  suggestedAmount?: number;
  onSuccess?: () => void;
  playerName?: string; // Optional player name for payment descriptions
}

export default function CreatePayment({ playerId, suggestedAmount = 0, onSuccess, playerName }: CreatePaymentProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    amount: suggestedAmount.toString(),
    payment_type: 'monthly' as 'enrollment' | 'monthly' | 'custom',
    payment_method: 'cash' as 'cash' | 'transfer' | 'yappy' | 'card' | 'paguelofacil' | 'other',
    payment_date: new Date().toISOString().split('T')[0],
    month_year: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If PagueloFacil or Yappy is selected, the payment will be handled by their respective buttons
    // which redirect to secure payment pages. The callback will handle the payment creation.
    if (formData.payment_method === 'paguelofacil' || formData.payment_method === 'yappy') {
      // Payment will be processed via redirect, no need to do anything here
      return;
    }

    setLoading(true);

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
        setIsOpen(false);
        setFormData({
          amount: suggestedAmount.toString(),
          payment_type: 'monthly',
          payment_method: 'cash',
          payment_date: new Date().toISOString().split('T')[0],
          month_year: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
          notes: ''
        });
        setSuccess(false);
        router.refresh();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Error al crear el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600"
      >
        <Plus size={20} />
        Registrar Pago
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="glass-card max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  💰 Registrar Nuevo Pago
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X size={24} />
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
                    description={`${formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago'} - ${playerName || `Jugador ID: ${playerId}`}`}
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
                    onError={(error) => alert('Error en Paguelo Fácil: ' + error)}
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
                    description={`${formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago'} - ${playerName || `Jugador ID: ${playerId}`}`}
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
                        setIsOpen(false);
                        setFormData({
                          amount: suggestedAmount.toString(),
                          payment_type: 'monthly',
                          payment_method: 'cash',
                          payment_date: new Date().toISOString().split('T')[0],
                          month_year: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
                          notes: ''
                        });
                        setSuccess(false);
                        router.refresh();
                        if (onSuccess) onSuccess();
                      }, 1500);
                    }}
                    onError={(error) => alert('Error en Yappy: ' + error)}
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

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || success}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-600 to-emerald-600"
                  >
                    {loading ? 'Guardando...' : success ? '¡Guardado!' : 'Guardar Pago'}
                  </button>
                </div>
              </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
