'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, CreditCard, X } from 'lucide-react';

declare global {
  interface Window {
    pfWallet?: any;
  }
}

interface PagueloFacilCheckoutProps {
  amount: number;
  description: string;
  email: string;
  orderId: string;
  apiKey: string;
  cclw: string;
  sandbox: boolean;
  onSuccess: (transactionId: string, response: any) => void;
  onError: (error: string) => void;
  onClose?: () => void;
}

export function PagueloFacilCheckout({
  amount,
  description,
  email,
  orderId,
  apiKey,
  cclw,
  sandbox,
  onSuccess,
  onError,
  onClose
}: PagueloFacilCheckoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    const loadScript = () => {
      if (scriptLoaded.current) return;

      const script = document.createElement('script');
      const scriptUrl = sandbox
        ? 'https://sandbox.paguelofacil.com/HostedFields/vendor/scripts/WALLET/PFScript.js'
        : 'https://secure.paguelofacil.com/HostedFields/vendor/scripts/WALLET/PFScript.js';
      
      script.src = scriptUrl;
      script.async = true;
      script.onload = () => {
        scriptLoaded.current = true;
        initializePayment();
      };
      script.onerror = () => {
        setError('Error al cargar el SDK de Paguelo Fácil');
        setLoading(false);
      };

      document.head.appendChild(script);
    };

    const initializePayment = () => {
      if (!window.pfWallet || !containerRef.current) {
        setError('SDK de Paguelo Fácil no disponible');
        setLoading(false);
        return;
      }

      try {
        // Clean and validate tokens (remove any non-ASCII characters that might have been copied incorrectly)
        const cleanApiKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();
        const cleanCclw = cclw.replace(/[^\x20-\x7E]/g, '').trim();

        if (!cleanApiKey || !cleanCclw) {
          throw new Error('Token de acceso o CCLW inválido. Por favor verifica las variables de entorno.');
        }

        window.pfWallet = window.pfWallet || {};
        window.pfWallet.useAsSandbox(sandbox);

        window.pfWallet.openService({
          apiKey: cleanApiKey,
          cclw: cleanCclw
        }).then((merchantSetup: any) => {
          // Create payment form
          const paymentData = {
            amount: amount,
            description: description,
            email: email,
            orderId: orderId,
            // Additional configuration
            onSuccess: (response: any) => {
              console.log('PagueloFacil payment success:', response);
              onSuccess(response.transactionId || response.id, response);
            },
            onError: (err: any) => {
              console.error('PagueloFacil payment error:', err);
              setError(err.message || 'Error al procesar el pago');
              onError(err.message || 'Error al procesar el pago');
            }
          };

          // Render the payment form in the container
          window.pfWallet.renderForm(containerRef.current, paymentData);
          setLoading(false);
        }).catch((err: any) => {
          console.error('Error opening PagueloFacil service:', err);
          setError(err.message || 'Error al inicializar Paguelo Fácil');
          setLoading(false);
          onError(err.message || 'Error al inicializar Paguelo Fácil');
        });
      } catch (err: any) {
        console.error('Error initializing PagueloFacil:', err);
        setError(err.message || 'Error al inicializar el formulario de pago');
        setLoading(false);
        onError(err.message || 'Error al inicializar el formulario de pago');
      }
    };

    loadScript();

    return () => {
      // Cleanup if needed
    };
  }, [amount, description, email, orderId, apiKey, cclw, sandbox, onSuccess, onError]);

  return (
    <div className="fixed inset-0 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Pagar con Paguelo Fácil
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Cargando formulario de pago...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div 
            id="paguelofacil-container" 
            ref={containerRef}
            className={`${loading || error ? 'hidden' : ''}`}
            style={{ minHeight: '400px' }}
          />
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Monto a pagar:</span>
            <span className="font-bold text-lg text-gray-900 dark:text-white">${amount.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 text-center">
            🔒 Pago seguro procesado por Paguelo Fácil
          </p>
        </div>
      </div>
    </div>
  );
}

