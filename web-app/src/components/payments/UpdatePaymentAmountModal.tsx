'use client';

import { useState, useTransition } from 'react';
import { X, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { updatePaymentAmount } from '@/lib/actions/payments';
import { useRouter } from 'next/navigation';

interface UpdatePaymentAmountModalProps {
  paymentId: string;
  currentAmount: number;
  onClose: () => void;
}

export function UpdatePaymentAmountModal({
  paymentId,
  currentAmount,
  onClose,
}: UpdatePaymentAmountModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newAmount, setNewAmount] = useState(currentAmount.toString());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const parsedAmount = parseFloat(newAmount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if (parsedAmount === currentAmount) {
      setError('El nuevo monto debe ser diferente al monto actual');
      return;
    }

    startTransition(async () => {
      try {
        const result = await updatePaymentAmount(paymentId, parsedAmount);

        if (result.error) {
          setError(result.error);
          return;
        }

        setSuccess(true);
        setTimeout(() => {
          router.refresh();
          onClose();
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Error al actualizar el monto');
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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
        className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300 sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-blue-600" />
            Actualizar Monto de Pago
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isPending}
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Amount Display */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-1">Monto Actual</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentAmount)}</p>
            </div>

            {/* New Amount Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Nuevo Monto
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                required
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg"
                disabled={isPending || success}
                autoFocus
              />
              {newAmount && !isNaN(parseFloat(newAmount)) && parseFloat(newAmount) > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  Nuevo monto: <span className="font-semibold">{formatCurrency(parseFloat(newAmount))}</span>
                </p>
              )}
            </div>

            {/* Difference Display */}
            {newAmount &&
              !isNaN(parseFloat(newAmount)) &&
              parseFloat(newAmount) > 0 &&
              parseFloat(newAmount) !== currentAmount && (
                <div
                  className={`p-4 rounded-lg border ${
                    parseFloat(newAmount) > currentAmount
                      ? 'bg-green-50 border-green-200'
                      : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {parseFloat(newAmount) > currentAmount ? 'Aumento' : 'Disminución'}
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      parseFloat(newAmount) > currentAmount ? 'text-green-700' : 'text-orange-700'
                    }`}
                  >
                    {parseFloat(newAmount) > currentAmount ? '+' : ''}
                    {formatCurrency(parseFloat(newAmount) - currentAmount)}
                  </p>
                </div>
              )}

            {/* Error/Success Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">✅ Monto actualizado exitosamente</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending || success}
                className="flex-1 px-6 py-3 rounded-xl font-semibold border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || success || parseFloat(newAmount) === currentAmount}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30"
              >
                {isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Actualizando...
                  </>
                ) : success ? (
                  '✓ Actualizado'
                ) : (
                  <>
                    <DollarSign size={20} />
                    Actualizar Monto
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

