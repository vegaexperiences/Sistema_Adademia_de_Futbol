'use client';

import { useState, useTransition } from 'react';
import { CreditCard, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CardPaymentForm, type CardPaymentFormData } from './CardPaymentForm';

interface PagueloFacilCheckoutInternalProps {
  amount: number;
  description: string;
  email: string;
  orderId: string;
  onSuccess: (transactionId: string, response: any) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
  playerId?: string;
  familyId?: string;
}

export function PagueloFacilCheckoutInternal({
  amount,
  description,
  email,
  orderId,
  onSuccess,
  onError,
  onCancel,
  playerId,
  familyId,
}: PagueloFacilCheckoutInternalProps) {
  const [isPending, startTransition] = useTransition();
  const [cardData, setCardData] = useState<CardPaymentFormData>({
    cardNumber: '',
    cardholderName: '',
    cvv: '',
    expiryMonth: '',
    expiryYear: '',
  });
  const [isFormValid, setIsFormValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  const [processingStep, setProcessingStep] = useState<'form' | 'tokenizing' | 'processing' | 'success'>('form');

  const handleCardDataChange = (data: CardPaymentFormData, isValid: boolean) => {
    setCardData(data);
    setIsFormValid(isValid);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isFormValid) {
      setError('Por favor completa todos los campos correctamente');
      return;
    }

    startTransition(async () => {
      try {
        setProcessingStep('tokenizing');
        
        // Step 1: Tokenize card (if saveCard is enabled)
        let cardToken: string | undefined;
        
        if (saveCard) {
          const tokenizeResponse = await fetch('/api/payments/paguelofacil/tokenize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cardData,
              email,
            }),
          });

          const tokenizeResult = await tokenizeResponse.json();

          if (!tokenizeResult.success || !tokenizeResult.token) {
            throw new Error(tokenizeResult.error || 'Error al tokenizar la tarjeta');
          }

          cardToken = tokenizeResult.token;
        }

        // Step 2: Process payment
        setProcessingStep('processing');

        const processResponse = await fetch('/api/payments/paguelofacil/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            description,
            email,
            orderId,
            cardToken: cardToken || undefined,
            cardData: cardToken ? undefined : cardData, // Only send card data if no token
            metadata: {
              playerId,
              familyId,
            },
          }),
        });

        const processResult = await processResponse.json();

        if (!processResult.success) {
          throw new Error(processResult.error || 'Error al procesar el pago');
        }

        setProcessingStep('success');
        
        // Call success callback
        setTimeout(() => {
          onSuccess(processResult.transactionId || processResult.operationId, processResult);
        }, 1000);
      } catch (err: any) {
        console.error('[PagueloFacil] Payment error:', err);
        const errorMsg = err.message || 'Error al procesar el pago';
        
        // Check if it's a 404 error (endpoint not found)
        if (errorMsg.includes('Recurso no encontrado') || errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('no está disponible')) {
          setError(
            '⚠️ Paguelo Fácil no ofrece procesamiento directo de tarjetas en este momento. ' +
            'Por favor, usa el método de "Enlace de Pago" que redirige a la página segura de Paguelo Fácil. ' +
            'Si necesitas checkout interno, contacta a Paguelo Fácil para confirmar si tienen este servicio disponible.'
          );
        } else {
          setError(errorMsg);
        }
        
        setProcessingStep('form');
        onError(errorMsg);
      }
    });
  };

  if (processingStep === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          ¡Pago Procesado Exitosamente!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Tu pago ha sido procesado correctamente.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Monto a Pagar</span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">${amount.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
      </div>

      {/* Card Payment Form */}
      <CardPaymentForm
        value={cardData}
        onChange={handleCardDataChange}
        showSaveCardOption={saveCard}
        onSaveCardChange={setSaveCard}
        disabled={isPending}
      />

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">Error en el Pago</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isPending && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                {processingStep === 'tokenizing' && 'Tokenizando tarjeta...'}
                {processingStep === 'processing' && 'Procesando pago...'}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Por favor espera, no cierres esta ventana
              </p>
            </div>
          </div>
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
          disabled={isPending || !isFormValid}
          className="flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Procesando...
            </>
          ) : (
            <>
              <CreditCard size={20} />
              Pagar ${amount.toFixed(2)}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

