'use client';

/**
 * Example Yappy Payment Button Component
 * 
 * This is a basic example. For production use, you should:
 * - Add proper error handling
 * - Add loading states
 * - Integrate with your payment system
 * - Handle success/failure callbacks
 */

import { useState } from 'react';

interface YappyPaymentButtonProps {
  amount: number;
  description: string;
  orderId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function YappyPaymentButton({
  amount,
  description,
  orderId,
  onSuccess,
  onError,
  className = '',
}: YappyPaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Validate merchant
      const validateRes = await fetch('/api/payments/yappy/validate', {
        method: 'POST',
      });

      if (!validateRes.ok) {
        throw new Error('Error al validar credenciales');
      }

      const { token, epochTime, cdnUrl, merchantId } = await validateRes.json();

      if (!token || !epochTime) {
        throw new Error('Error al obtener token de validación');
      }

      // Step 2: Create order
      const orderRes = await fetch('/api/payments/yappy/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          description,
          orderId,
          token,
          paymentDate: epochTime,
        }),
      });

      if (!orderRes.ok) {
        const errorData = await orderRes.json();
        throw new Error(errorData.error || 'Error al crear orden');
      }

      const { orderData } = await orderRes.json();

      if (!orderData) {
        throw new Error('No se recibieron datos de la orden');
      }

      // Step 3: Load Yappy web component and initialize
      // This is a simplified example - see Yappy documentation for full implementation
      console.log('Order created:', orderData);
      console.log('Load Yappy component from:', cdnUrl);
      console.log('Initialize with:', {
        merchantId,
        token: orderData.token,
        documentName: orderData.documentName,
      });

      // TODO: Load Yappy web component and initialize
      // See Yappy documentation: https://www.yappy.com.pa/comercial/desarrolladores/

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
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Procesando...' : 'Pagar con Yappy'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

