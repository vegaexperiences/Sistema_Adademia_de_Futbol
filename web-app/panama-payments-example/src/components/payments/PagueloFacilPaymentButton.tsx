'use client';

/**
 * Example PagueloFacil Payment Button Component
 * 
 * This is a basic example. For production use, you should:
 * - Add proper error handling
 * - Add loading states
 * - Integrate with your payment system
 * - Handle success/failure callbacks
 */

import { useState } from 'react';

interface PagueloFacilPaymentButtonProps {
  amount: number;
  description: string;
  email: string;
  orderId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  customParams?: Record<string, string>;
}

export function PagueloFacilPaymentButton({
  amount,
  description,
  email,
  orderId,
  onSuccess,
  onError,
  className = '',
  customParams,
}: PagueloFacilPaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create payment link
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
          customParams,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear enlace de pago');
      }

      const { paymentUrl } = await response.json();

      if (!paymentUrl) {
        throw new Error('No se recibió URL de pago');
      }

      // Redirect to PagueloFacil payment page
      window.location.href = paymentUrl;

      onSuccess?.();
    } catch (err: any) {
      const errorMsg = err.message || 'Error al procesar el pago';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handlePayment}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Procesando...' : 'Pagar con PagueloFacil'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

