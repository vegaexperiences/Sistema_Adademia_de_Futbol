'use client';

import { useState, useTransition } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

interface PagueloFacilPaymentButtonProps {
  amount: number;
  description: string;
  email: string;
  orderId: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  className?: string;
  returnUrl?: string | (() => string); // Can be a string or a function that returns the URL
  customParams?: Record<string, string>;
  beforeRedirect?: () => Promise<void> | void; // Callback to execute before redirecting
}

/**
 * Paguelo Fácil Payment Button Component
 * Creates a payment link and redirects the user to Paguelo Fácil's secure payment page
 */
export function PagueloFacilPaymentButton({
  amount,
  description,
  email,
  orderId,
  onSuccess,
  onError,
  className = '',
  returnUrl,
  customParams,
  beforeRedirect,
}: PagueloFacilPaymentButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setError(null);

    startTransition(async () => {
      try {
        // Execute beforeRedirect callback if provided (e.g., submit enrollment or store data)
        if (beforeRedirect) {
          try {
            await beforeRedirect();
          } catch (err: any) {
            // If beforeRedirect fails, don't proceed with payment
            const errorMsg = err.message || 'Error al procesar la solicitud antes del pago';
            console.error('[PagueloFacil] beforeRedirect failed:', err);
            setError(errorMsg);
            onError?.(errorMsg);
            return; // Don't proceed with payment if enrollment failed
          }
        }

        // Get returnUrl - if it's a function, call it now (after beforeRedirect)
        const finalReturnUrl = typeof returnUrl === 'function' ? returnUrl() : returnUrl;

        // Call API to create payment link
        const response = await fetch('/api/payments/paguelofacil/link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            description,
            email,
            orderId,
            returnUrl: finalReturnUrl,
            customParams,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Error al generar enlace de pago');
        }

        if (!data.paymentUrl) {
          throw new Error('No se recibió la URL de pago');
        }

        // Redirect user to Paguelo Fácil payment page
        // Store orderId in sessionStorage for callback handling
        if (orderId) {
          sessionStorage.setItem('paguelofacil_orderId', orderId);
          sessionStorage.setItem('paguelofacil_amount', amount.toString());
        }

        // Redirect to payment page
        window.location.href = data.paymentUrl;
      } catch (err: any) {
        const errorMsg = err.message || 'Error al procesar el pago';
        console.error('[PagueloFacil] Error creating payment link:', err);
        setError(errorMsg);
        onError?.(errorMsg);
      }
    });
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handlePayment}
        disabled={isPending}
        className={`w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 min-h-[48px] rounded-xl font-bold text-sm sm:text-base text-white transition-all duration-300 active:scale-95 hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 bg-gradient-to-r from-blue-600 to-indigo-600 touch-manipulation ${className}`}
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            <span>Procesando matrícula y generando enlace de pago...</span>
          </>
        ) : (
          <>
            <CreditCard size={20} />
            <span>Enviar Matrícula y Pagar con Paguelo Fácil</span>
          </>
        )}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        🔒 Serás redirigido a la página segura de Paguelo Fácil para completar el pago
      </p>
    </div>
  );
}

