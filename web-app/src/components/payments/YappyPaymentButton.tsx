'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    YappyButton?: any;
  }
}

interface YappyPaymentButtonProps {
  amount: number;
  description: string;
  orderId: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  className?: string;
  returnUrl?: string;
  customParams?: Record<string, string>;
  playerId?: string;
  paymentType?: 'enrollment' | 'monthly' | 'custom';
  monthYear?: string;
  notes?: string;
}

/**
 * Yappy Payment Button Component
 * Loads the Yappy web component and handles payment processing
 * According to Yappy documentation, the web component handles everything directly
 */
export function YappyPaymentButton({
  amount,
  description,
  orderId,
  onSuccess,
  onError,
  className = '',
  returnUrl,
  customParams,
  playerId,
  paymentType,
  monthYear,
  notes,
}: YappyPaymentButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  // Get merchant ID from API
  useEffect(() => {
    const getMerchantId = async () => {
      try {
        const response = await fetch('/api/payments/yappy/config');
        const data = await response.json();
        if (data.success && data.merchantId) {
          setMerchantId(data.merchantId);
        } else {
          throw new Error(data.error || 'Error al obtener configuración de Yappy');
        }
      } catch (err: any) {
        console.error('[Yappy] Error getting config:', err);
        setError(err.message || 'Error al obtener configuración de Yappy');
        setIsLoading(false);
        onError?.(err.message || 'Error al obtener configuración de Yappy');
      }
    };

    getMerchantId();
  }, [onError]);

  // Load Yappy web component script
  useEffect(() => {
    if (!merchantId || scriptLoaded.current) return;

    const loadScript = () => {
      try {
        // Check if script is already loaded
        if (document.querySelector('script[src*="btn-yappy"]')) {
          scriptLoaded.current = true;
          setIsLoading(false);
          return;
        }

        // Load the Yappy web component script as ES module
        const script = document.createElement('script');
        script.src = 'https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js';
        script.type = 'module';
        script.async = true;
        script.onload = () => {
          scriptLoaded.current = true;
          setIsLoading(false);
        };
        script.onerror = () => {
          setError('Error al cargar el componente de Yappy');
          setIsLoading(false);
          onError?.('Error al cargar el componente de Yappy');
        };

        document.head.appendChild(script);
      } catch (err: any) {
        console.error('[Yappy] Error loading script:', err);
        setError(err.message || 'Error al inicializar Yappy');
        setIsLoading(false);
        onError?.(err.message || 'Error al inicializar Yappy');
      }
    };

    loadScript();
  }, [merchantId, onError]);

  // Render the Yappy button component when script is loaded
  useEffect(() => {
    if (!isLoading && merchantId && containerRef.current && scriptLoaded.current) {
      // Wait a bit for the custom element to be defined
      const renderButton = () => {
        try {
          // Check if custom element is defined
          if (!customElements.get('btn-yappy')) {
            console.log('[Yappy] Waiting for custom element to be defined...');
            setTimeout(renderButton, 100);
            return;
          }

          // Clear container first
          if (!containerRef.current) return;
          containerRef.current.innerHTML = '';

          // Build return URL with custom parameters
          const baseReturnUrl = returnUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/yappy/callback`;
          const returnUrlWithParams = new URL(baseReturnUrl);
          returnUrlWithParams.searchParams.set('type', customParams?.type || (playerId ? 'payment' : 'enrollment'));
          if (playerId) returnUrlWithParams.searchParams.set('playerId', playerId);
          if (paymentType) returnUrlWithParams.searchParams.set('paymentType', paymentType);
          returnUrlWithParams.searchParams.set('amount', amount.toString());
          if (monthYear) returnUrlWithParams.searchParams.set('monthYear', monthYear);
          if (notes) returnUrlWithParams.searchParams.set('notes', notes);

          // Create the btn-yappy element
          const yappyButton = document.createElement('btn-yappy');
          
          // Set attributes based on Yappy documentation
          yappyButton.setAttribute('merchant-id', merchantId);
          yappyButton.setAttribute('amount', amount.toFixed(2));
          yappyButton.setAttribute('description', description.substring(0, 200)); // Max 200 chars
          yappyButton.setAttribute('order-id', orderId);
          yappyButton.setAttribute('return-url', returnUrlWithParams.toString());

          // Handle success event
          yappyButton.addEventListener('yappy-success', (event: any) => {
            console.log('[Yappy] Payment success:', event.detail);
            const transactionId = event.detail?.transactionId || event.detail?.orderId || orderId;
            onSuccess?.(transactionId);
          });

          // Handle error event
          yappyButton.addEventListener('yappy-error', (event: any) => {
            console.error('[Yappy] Payment error:', event.detail);
            const errorMsg = event.detail?.message || 'Error al procesar el pago con Yappy';
            setError(errorMsg);
            onError?.(errorMsg);
          });

          if (containerRef.current) {
            containerRef.current.appendChild(yappyButton);
          }
        } catch (err: any) {
          console.error('[Yappy] Error rendering button:', err);
          setError('Error al renderizar el botón de Yappy');
          onError?.('Error al renderizar el botón de Yappy');
        }
      };

      // Wait a bit for the module to fully load
      setTimeout(renderButton, 200);
    }
  }, [isLoading, merchantId, amount, description, orderId, returnUrl, customParams, playerId, paymentType, monthYear, notes, onSuccess, onError]);

  return (
    <div className={`space-y-2 ${className}`}>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="animate-spin text-blue-600 mb-2" size={24} />
          <p className="text-sm text-gray-600 dark:text-gray-400">Cargando botón de pago Yappy...</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Container for Yappy web component */}
      <div 
        ref={containerRef}
        className={isLoading ? 'hidden' : ''}
      />

      {!isLoading && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          🔒 Pago seguro procesado por Yappy Comercial
        </p>
      )}
    </div>
  );
}

